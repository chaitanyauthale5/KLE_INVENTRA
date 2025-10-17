// Backend REST configuration
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '';

async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = localStorage.getItem('ayursutra_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || 'Request failed');
    err.code = data?.code;
    throw err;
  }
  return data;
}

// Non-auth entities are not implemented against backend yet. Export thin stubs to avoid accidental local writes.
function notImplementedEntity(name) {
  const fn = async () => { throw new Error(`${name} API not implemented`); };
  return { list: fn, get: fn, filter: fn, create: fn, update: fn, delete: fn };
}

export const Patient = notImplementedEntity('Patient');
export const TherapySession = notImplementedEntity('TherapySession');
export const Feedback = notImplementedEntity('Feedback');
export const Notification = notImplementedEntity('Notification');
export const ConsultationLog = notImplementedEntity('ConsultationLog');
export const Hospital = notImplementedEntity('Hospital');

// Auth-backed User entity
export const User = {
  async me() {
    try {
      const { user } = await api('/api/auth/me', { auth: true });
      return normalizeUser(user);
    } catch {
      return null;
    }
  },
  async updateMyUserData(patch) {
    // Placeholder until profile update endpoint is added
    const me = await this.me();
    return { ...me, ...patch };
  },
  async loginWithRedirect(redirectUrl) {
    const me = await this.me();
    try { if (redirectUrl) window.location.href = redirectUrl; } catch {}
    return me;
  },
  async login(identifier, password) {
    const { user, token } = await api('/api/auth/signin', {
      method: 'POST',
      body: { identifier, password },
    });
    try {
      localStorage.setItem('ayursutra_token', token);
      localStorage.setItem('ayursutra_current_user_id', user?._id || user?.id || '');
    } catch {}
    return normalizeUser(user);
  },
  async register({ full_name, email, phone, password, role = 'patient' }) {
    const { user, token } = await api('/api/auth/signup', {
      method: 'POST',
      body: { name: full_name, email, phone, role, password },
    });
    try {
      localStorage.setItem('ayursutra_token', token);
      localStorage.setItem('ayursutra_current_user_id', user?._id || user?.id || '');
    } catch {}
    return normalizeUser(user);
  },
  async logout() {
    try {
      localStorage.removeItem('ayursutra_token');
      localStorage.removeItem('ayursutra_current_user_id');
    } catch {}
    return true;
  },
};

function normalizeUser(u) {
  if (!u) return null;
  return {
    id: u.id || u._id,
    full_name: u.full_name || u.name,
    email: u.email,
    phone: u.phone,
    role: u.role || 'patient',
    ...u,
  };
}