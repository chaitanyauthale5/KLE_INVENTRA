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
    // Always include cookies; backend may use httpOnly session cookies
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || 'Request failed');
    err.code = data?.code;
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}

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

export const User = {
  async me() {
    try {
      // Try with cookies (credentials included) and optional bearer token
      const { user } = await api('/api/auth/me', { auth: true });
      return normalizeUser(user);
    } catch (e) {
      // If unauthorized, clear bad token to avoid loops
      if (e && (e.status === 401 || e.code === 401)) {
        try { localStorage.removeItem('ayursutra_token'); } catch {}
      }
      return null;
    }
  },
  async filter(query = {}) {
    try {
      const qs = new URLSearchParams(query).toString();
      const { users } = await api(`/api/users${qs ? `?${qs}` : ''}`, { auth: true });
      return Array.isArray(users) ? users.map(normalizeUser) : [];
    } catch (e) {
      // If users endpoint is not implemented, fail gracefully
      return [];
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
      // Call backend logout if available (ignore errors)
      await api('/api/auth/signout', { method: 'POST' }).catch(() => {});
      localStorage.removeItem('ayursutra_token');
      localStorage.removeItem('ayursutra_current_user_id');
    } catch {}
    return true;
  },
};
