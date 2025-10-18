import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

const state = {
  io: null,
  userSockets: new Map(), // userId -> Set<Socket>
  hospitalSockets: new Map(), // hospitalId -> Set<Socket>
};

function ensureSet(map, key) {
  if (!map.has(key)) map.set(key, new Set());
  return map.get(key);
}
function addTo(map, key, socket) {
  if (!key) return;
  const set = ensureSet(map, String(key));
  set.add(socket);
}
function removeFrom(map, key, socket) {
  if (!key) return;
  const set = map.get(String(key));
  if (set) {
    set.delete(socket);
    if (set.size === 0) map.delete(String(key));
  }
}

export function initSocket(httpServer) {
  if (state.io) return state.io;

  // Derive allowed origins similar to CORS config in app.js
  const defaultOrigins = ['http://localhost:5173'];
  const envOrigins = (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: allowedOrigins, credentials: true },
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token
        || (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '')
        || null;
      if (token) {
        let secret = process.env.JWT_SECRET;
        if (!secret && process.env.NODE_ENV !== 'production') {
          secret = 'insecure-dev-secret-change-me';
        }
        const payload = jwt.verify(token, secret);
        socket.user = {
          id: payload?.id || payload?._id || payload?.sub || null,
          role: payload?.role || null,
          hospital_id: payload?.hospital_id || payload?.hospitalId || null,
        };
      }
    } catch (e) {
      // allow connection as guest if token invalid; we just won't map it
    }
    next();
  });

  io.on('connection', (socket) => {
    const uid = socket.user?.id ? String(socket.user.id) : null;
    const hid = socket.user?.hospital_id ? String(socket.user.hospital_id) : null;
    if (uid) addTo(state.userSockets, uid, socket);
    if (hid) addTo(state.hospitalSockets, hid, socket);
    socket.data.uid = uid || null;
    socket.data.hid = hid || null;

    // Allow clients to explicitly register mapping after login
    socket.on('register', (payload = {}) => {
      try {
        const newUid = payload?.user_id ? String(payload.user_id) : null;
        const newHid = payload?.hospital_id ? String(payload.hospital_id) : null;
        // Remove old mappings if changed
        if (socket.data.uid && socket.data.uid !== newUid) {
          removeFrom(state.userSockets, socket.data.uid, socket);
        }
        if (socket.data.hid && socket.data.hid !== newHid) {
          removeFrom(state.hospitalSockets, socket.data.hid, socket);
        }
        // Add new mappings
        if (newUid) addTo(state.userSockets, newUid, socket);
        if (newHid) addTo(state.hospitalSockets, newHid, socket);
        socket.data.uid = newUid;
        socket.data.hid = newHid;
        socket.emit('register:ack', { ok: true, uid: newUid, hid: newHid });
      } catch {
        socket.emit('register:ack', { ok: false });
      }
    });

    socket.on('disconnect', () => {
      const u = socket.data?.uid || uid;
      const h = socket.data?.hid || hid;
      if (u) removeFrom(state.userSockets, u, socket);
      if (h) removeFrom(state.hospitalSockets, h, socket);
    });
  });

  state.io = io;
  return io;
}

export function emitToUser(userId, event, payload) {
  if (!state.io || !userId) return;
  const set = state.userSockets.get(String(userId));
  if (!set) return;
  for (const s of set) s.emit(event, payload);
}

export function emitToHospital(hospitalId, event, payload) {
  if (!state.io || !hospitalId) return;
  const set = state.hospitalSockets.get(String(hospitalId));
  if (!set) return;
  for (const s of set) s.emit(event, payload);
}

export function emitToAll(event, payload) {
  if (!state.io) return;
  state.io.emit(event, payload);
}

export function emitNotification(doc) {
  if (!state.io || !doc) return;
  const payload = {
    id: String(doc._id || doc.id || ''),
    title: doc.title || 'Notification',
    message: doc.message || '',
    type: doc.type || 'info',
    createdAt: doc.createdAt || new Date().toISOString(),
  };
  if (doc.user_id) return emitToUser(doc.user_id, 'notification:new', payload);
  if (doc.hospital_id) return emitToHospital(doc.hospital_id, 'notification:new', payload);
  return emitToAll('notification:new', payload);
}

export function getIO() { return state.io; }
