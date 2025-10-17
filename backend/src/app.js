import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import hospitalRoutes from './routes/hospitals.routes.js';
import patientRoutes from './routes/patients.routes.js';
import sessionRoutes from './routes/sessions.routes.js';
import notificationRoutes from './routes/notifications.routes.js';
import reportRoutes from './routes/reports.routes.js';
import appointmentRoutes from './routes/appointments.routes.js';
import superAdminRoutes from './routes/superadmin.routes.js';
import prescriptionRoutes from './routes/prescriptions.routes.js';

// Load env before reading process.env in this module
dotenv.config();

const app = express();

// Middlewares
// CORS configuration: support single origin, CSV list, and optional regex pattern
const DEFAULT_ORIGINS = ['http://localhost:5173'];
const ORIGINS = (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

let originRegex = null;
if (process.env.FRONTEND_REGEX) {
  try {
    originRegex = new RegExp(process.env.FRONTEND_REGEX);
  } catch (e) {
    console.warn('[CORS] Invalid FRONTEND_REGEX provided, ignoring:', e.message);
  }
}

// Normalize function: remove trailing slashes to avoid mismatch
const normalizeOrigin = (o) => (typeof o === 'string' ? o.replace(/\/+$/, '') : o);
const allowedOrigins = new Set([...DEFAULT_ORIGINS, ...ORIGINS].map(normalizeOrigin));

// Diagnostics at startup
console.log('[CORS] Allowed origins:', Array.from(allowedOrigins));
if (originRegex) {
  console.log('[CORS] FRONTEND_REGEX active:', originRegex.toString());
}

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser requests or same-origin without Origin header
    if (!origin) return callback(null, true);
    const norm = normalizeOrigin(origin);
    if (allowedOrigins.has(norm)) return callback(null, true);
    if (originRegex && originRegex.test(origin)) return callback(null, true);
    const msg = `[CORS] Origin not allowed: ${origin}`;
    console.warn(msg);
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
};
app.use(cors(corsOptions));
// Explicitly handle preflight
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/prescriptions', prescriptionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

export default app;
