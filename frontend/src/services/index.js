export { User } from './user';

// Determine API base URL with a safe runtime fallback.
// In production on Vercel, we prefer same-origin '/api' (empty base) and use vercel.json rewrites.
let API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '';
try {
  const isBrowser = typeof window !== 'undefined';
  const isLocalhost = isBrowser && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  // If not on localhost but API_BASE is empty or points to localhost, fall back to same-origin
  if (!isLocalhost) {
    if (!API_BASE || /localhost:\d+/.test(String(API_BASE))) {
      API_BASE = '';
    }
  }
} catch {
  // ignore env resolution errors in non-browser contexts
  void 0;
}

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    try {
      const token = localStorage.getItem('ayursutra_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // ignore localStorage unavailability
      void 0;
    }
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || 'Request failed');
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}

function normalizeId(x) {
  if (!x) return x;
  const id = x.id || x._id;
  return { id, ...x };
}

export const Hospital = {
  async list() {
    const data = await api('/api/hospitals');
    const arr = data?.hospitals || [];
    return arr.map((h) => normalizeId({
      ...h,
      created_date: h.createdAt,
      updated_date: h.updatedAt,
    }));
  },
  async get(id) {
    const data = await api(`/api/hospitals/${id}`);
    return normalizeId(data?.hospital);
  },
  async create(body) {
    const data = await api('/api/hospitals', { method: 'POST', body });
    return normalizeId(data?.hospital);
  },
  async update(id, body) {
    const data = await api(`/api/hospitals/${id}`, { method: 'PUT', body });
    return normalizeId(data?.hospital);
  },
  async delete(id) {
    await api(`/api/hospitals/${id}`, { method: 'DELETE' });
    return true;
  },
  async assignStaff(hospitalId, body) {
    const data = await api(`/api/hospitals/${hospitalId}/staff`, { method: 'POST', body });
    return normalizeId(data?.user || data);
  },
  async listStaff(hospitalId) {
    const data = await api(`/api/hospitals/${hospitalId}/staff`);
    return (data?.staff || []).map(normalizeId);
  },
  async updateStaff(hospitalId, userId, body) {
    const data = await api(`/api/hospitals/${hospitalId}/staff/${userId}`, { method: 'PUT', body });
    return normalizeId(data?.user || data);
  },
  async summary(hospitalId) {
    const data = await api(`/api/hospitals/${hospitalId}/summary`);
    return data;
  },
  async removeStaff(hospitalId, userId) {
    await api(`/api/hospitals/${hospitalId}/staff/${userId}`, { method: 'DELETE' });
    return true;
  },
};

// Clinic Inventory: Rooms
export const Rooms = {
  async list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const data = await api(`/api/rooms${qs ? `?${qs}` : ''}`);
    return (data?.rooms || []).map(normalizeId);
  },
  async availability(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const data = await api(`/api/rooms/availability${qs ? `?${qs}` : ''}`);
    return (data?.rooms || []).map(normalizeId);
  },
  async create(body) {
    const data = await api('/api/rooms', { method: 'POST', body });
    return normalizeId(data?.room || data);
  },
  async update(id, body) {
    const data = await api(`/api/rooms/${id}`, { method: 'PUT', body });
    return normalizeId(data?.room || data);
  },
  async delete(id) {
    await api(`/api/rooms/${id}`, { method: 'DELETE' });
    return true;
  }
};

// Clinic Inventory: Equipment
export const Equipments = {
  async list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const data = await api(`/api/equipment${qs ? `?${qs}` : ''}`);
    return (data?.equipment || []).map(normalizeId);
  },
  async create(body) {
    const data = await api('/api/equipment', { method: 'POST', body });
    return normalizeId(data?.equipment || data);
  },
  async update(id, body) {
    const data = await api(`/api/equipment/${id}`, { method: 'PUT', body });
    return normalizeId(data?.equipment || data);
  },
  async delete(id) {
    await api(`/api/equipment/${id}`, { method: 'DELETE' });
    return true;
  }
};

// Helper to transform backend patient -> UI shape expected by pages/components
function mapPatientForUI(p) {
  const id = p.id || p._id;
  // Derive a display patient_id as a short token for UI if not present
  const patient_id = p.patient_id || (id ? String(id).slice(-6).toUpperCase() : undefined);
  // Derive age from dob if available
  let age = p.age;
  if (!age && p.dob) {
    try {
      const dob = new Date(p.dob);
      const diff = Date.now() - dob.getTime();
      age = Math.max(0, Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
    } catch {
      // invalid DOB format, leave age undefined
      void 0;
    }
  }
  return {
    ...p,
    id,
    user_id: p.user_id || p.userId || undefined,
    patient_id,
    assigned_doctor_id: p.assigned_doctor_id || null,
    full_name: p.full_name || p.name,
    age,
    address: p.address,
    email: p.email,
    phone: p.phone,
    gender: p.gender,
    medical_history: p.medical_history,
    // Fields used by UI but stored under metadata on backend
    current_conditions: Array.isArray(p.current_conditions)
      ? p.current_conditions
      : Array.isArray(p.metadata?.current_conditions) ? p.metadata.current_conditions : [],
    allergies: Array.isArray(p.allergies)
      ? p.allergies
      : Array.isArray(p.metadata?.allergies) ? p.metadata.allergies : [],
    assigned_doctor: p.assigned_doctor || p.metadata?.assigned_doctor || '',
    progress_score: typeof p.progress_score === 'number'
      ? p.progress_score
      : (typeof p.metadata?.progress_score === 'number' ? p.metadata.progress_score : 0),
    guardian_ids: Array.isArray(p.guardian_ids)
      ? p.guardian_ids
      : (Array.isArray(p.metadata?.guardian_ids) ? p.metadata.guardian_ids : []),
  };
}

export const Patient = {
  async me() {
    const data = await api('/api/patients/me');
    const p = normalizeId(data?.patient || null);
    return p ? mapPatientForUI(p) : null;
  },
  async list() {
    const data = await api('/api/patients');
    return (data?.patients || []).map(normalizeId).map(mapPatientForUI);
  },
  async withRecords(query = {}) {
    const qs = new URLSearchParams(query).toString();
    const data = await api(`/api/patients/with-records${qs ? `?${qs}` : ''}`);
    const arr = Array.isArray(data?.patients) ? data.patients : [];
    // Each item is { patient, appointment_count, last_appointment }
    return arr.map((row) => {
      const p = mapPatientForUI(normalizeId(row.patient || {}));
      return {
        ...p,
        appointment_count: row.appointment_count || 0,
        last_appointment: row.last_appointment || null,
      };
    });
  },
  async filter(query = {}) {
    const qs = new URLSearchParams(query).toString();
    const data = await api(`/api/patients${qs ? `?${qs}` : ''}`);
    return (data?.patients || []).map(normalizeId).map(mapPatientForUI);
  },
  async get(id) {
    const data = await api(`/api/patients/${id}`);
    const p = normalizeId(data?.patient || {});
    return mapPatientForUI(p);
  },
  async create(body) {
    // Map UI fields to backend payload
    const payload = {
      name: body.full_name || body.name,
      email: body.email,
      password: body.password, // optional: create linked user for patient login
      phone: body.phone,
      dob: body.dob,
      gender: body.gender,
      address: body.address,
      medical_history: body.medical_history || body.medicalHistory,
      // forward doctor assignment by id if provided
      ...(body.doctor_id ? { doctor_id: body.doctor_id } : {}),
      // Persist UI-only fields inside metadata
      metadata: {
        ...(body.metadata || {}),
        current_conditions: Array.isArray(body.current_conditions)
          ? body.current_conditions
          : (typeof body.currentConditions === 'string' ? body.currentConditions.split(',').map(s=>s.trim()).filter(Boolean) : (body.currentConditions || [])),
        allergies: Array.isArray(body.allergies)
          ? body.allergies
          : (typeof body.allergies === 'string' ? body.allergies.split(',').map(s=>s.trim()).filter(Boolean) : []),
        assigned_doctor: body.assigned_doctor || body.assignedDoctor || '',
        progress_score: typeof body.progress_score === 'number' ? body.progress_score : (Number(body.progressScore) || 0),
        guardian_ids: Array.isArray(body.guardian_ids) ? body.guardian_ids : (body.guardianId ? [body.guardianId] : []),
        // Extended structured intake
        ...(body.intake ? { intake: body.intake } : {}),
      },
      // Any additional UI-only fields will be ignored by backend schema
    };
    const data = await api('/api/patients', { method: 'POST', body: payload });
    return mapPatientForUI(normalizeId(data?.patient || {}));
  },
  async update(id, body) {
    const payload = {
      name: body.full_name || body.name,
      email: body.email,
      // Do not send password on update by default; backend ignores undefined
      phone: body.phone,
      dob: body.dob,
      gender: body.gender,
      address: body.address,
      medical_history: body.medical_history || body.medicalHistory,
      ...(Object.prototype.hasOwnProperty.call(body, 'doctor_id') ? { doctor_id: body.doctor_id } : {}),
      metadata: {
        ...(body.metadata || {}),
        current_conditions: Array.isArray(body.current_conditions)
          ? body.current_conditions
          : (typeof body.currentConditions === 'string' ? body.currentConditions.split(',').map(s=>s.trim()).filter(Boolean) : (body.currentConditions || [])),
        allergies: Array.isArray(body.allergies)
          ? body.allergies
          : (typeof body.allergies === 'string' ? body.allergies.split(',').map(s=>s.trim()).filter(Boolean) : []),
        assigned_doctor: body.assigned_doctor || body.assignedDoctor || '',
        progress_score: typeof body.progress_score === 'number' ? body.progress_score : (Number(body.progressScore) || 0),
        guardian_ids: Array.isArray(body.guardian_ids) ? body.guardian_ids : (body.guardianId ? [body.guardianId] : []),
        ...(body.intake ? { intake: body.intake } : {}),
      },
    };
    const data = await api(`/api/patients/${id}`, { method: 'PUT', body: payload });
    return mapPatientForUI(normalizeId(data?.patient || {}));
  },
  async delete(id) {
    await api(`/api/patients/${id}`, { method: 'DELETE' });
    return true;
  },
  async syncFromAppointments(query = {}) {
    const qs = new URLSearchParams(query).toString();
    const data = await api(`/api/patients/sync-from-appointments${qs ? `?${qs}` : ''}`, { method: 'POST' });
    return data;
  },
};

export const TherapySession = {
  async list() {
    const data = await api('/api/sessions');
    return (data?.sessions || []).map(normalizeId).map((s) => {
      const at = s.scheduled_at || s.scheduledAt;
      if (at && (!s.scheduled_date || !s.scheduled_time)) {
        const d = new Date(at);
        const to2 = (n) => String(n).padStart(2, '0');
        const localDate = `${d.getFullYear()}-${to2(d.getMonth()+1)}-${to2(d.getDate())}`;
        const localTime = `${to2(d.getHours())}:${to2(d.getMinutes())}`;
        return { ...s, scheduled_date: s.scheduled_date || localDate, scheduled_time: s.scheduled_time || localTime };
      }
      return s;
    });
  },
  async filter(query = {}) {
    const qs = new URLSearchParams(query).toString();
    const data = await api(`/api/sessions${qs ? `?${qs}` : ''}`);
    return (data?.sessions || []).map(normalizeId).map((s) => {
      const at = s.scheduled_at || s.scheduledAt;
      if (at && (!s.scheduled_date || !s.scheduled_time)) {
        const d = new Date(at);
        const to2 = (n) => String(n).padStart(2, '0');
        const localDate = `${d.getFullYear()}-${to2(d.getMonth()+1)}-${to2(d.getDate())}`;
        const localTime = `${to2(d.getHours())}:${to2(d.getMinutes())}`;
        return { ...s, scheduled_date: s.scheduled_date || localDate, scheduled_time: s.scheduled_time || localTime };
      }
      return s;
    });
  },
  async create(body) {
    // Accepts: { hospital_id, patient_id, doctor_id, therapy_type, scheduled_at | (scheduled_date, scheduled_time), duration_min, notes }
    const data = await api('/api/sessions', { method: 'POST', body });
    return normalizeId(data?.session || data);
  },
  async update(id, body) {
    const data = await api(`/api/sessions/${id}`, { method: 'PUT', body });
    return normalizeId(data?.session || data);
  },
  async delete(id) {
    await api(`/api/sessions/${id}`, { method: 'DELETE' });
    return true;
  },
};

export const Appointments = {
  async book({ hospital_id, staff_id, type, start_time, end_time, notes, patient_user_id, patient_record_id }) {
    const body = { hospital_id, staff_id, type, start_time, end_time, notes };
    if (patient_user_id) body.patient_user_id = patient_user_id;
    if (patient_record_id) body.patient_record_id = patient_record_id;
    const data = await api('/api/appointments', { method: 'POST', body });
    return normalizeId(data?.appointment);
  },
  async mine() {
    const data = await api('/api/appointments/mine');
    return (data?.appointments || []).map(normalizeId);
  },
  async cancel(id) {
    const data = await api(`/api/appointments/${id}/cancel`, { method: 'POST' });
    return normalizeId(data?.appointment);
  },
  async reschedule(id, { start_time, end_time }) {
    const data = await api(`/api/appointments/${id}/reschedule`, { method: 'PATCH', body: { start_time, end_time } });
    return normalizeId(data?.appointment);
  },
  async confirm(id) {
    const data = await api(`/api/appointments/${id}/confirm`, { method: 'POST' });
    return normalizeId(data?.appointment);
  },
  async complete(id) {
    const data = await api(`/api/appointments/${id}/complete`, { method: 'POST' });
    return normalizeId(data?.appointment);
  },
  async mineForStaff() {
    const data = await api('/api/appointments/staff/mine');
    return (data?.appointments || []).map(normalizeId);
  },
};

// Prescriptions API client
export const Prescription = {
  async mine() {
    const data = await api('/api/prescriptions/mine');
    return (data?.prescriptions || []).map(normalizeId);
  },
  async list(query = {}) {
    const qs = new URLSearchParams(query).toString();
    const data = await api(`/api/prescriptions${qs ? `?${qs}` : ''}`);
    return (data?.prescriptions || []).map(normalizeId);
  },
  async create(payload) {
    const data = await api('/api/prescriptions', { method: 'POST', body: payload });
    return normalizeId(data?.prescription || data);
  },
  async delete(id) {
    await api(`/api/prescriptions/${id}`, { method: 'DELETE' });
    return true;
  },
};

// Stubs kept for compile-time imports that may exist elsewhere
function mapFeedbackForUI(f) {
  const id = f?.id || f?._id;
  const patientObj = f?.patient_id && typeof f.patient_id === 'object' ? f.patient_id : null;
  const patient_id = patientObj ? (patientObj._id || patientObj.id) : (f?.patient_user_id ?? f?.patient_id ?? f?.patientId);
  return normalizeId({
    ...f,
    id,
    message: f?.message ?? f?.comment ?? '',
    patient_user_id: patient_id,
    patient_name: f?.patient_name ?? patientObj?.name ?? f?.patient?.name,
    hospital_id: f?.hospital_id ?? f?.hospitalId,
    admin_response: f?.admin_response ?? '',
    admin_responded_at: f?.admin_responded_at ?? f?.adminRespondedAt,
    created_date: f?.createdAt || f?.created_date,
    updated_date: f?.updatedAt || f?.updated_date,
  });
}

export const Feedback = {
  async list() {
    const data = await api('/api/feedbacks');
    return (data?.feedbacks || data?.items || []).map(mapFeedbackForUI);
  },
  async filter(query = {}, sort, limit) {
    const params = new URLSearchParams({ ...(query || {}) });
    if (sort) params.set('sort', sort);
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    const data = await api(`/api/feedbacks${qs ? `?${qs}` : ''}`);
    return (data?.feedbacks || data?.items || []).map(mapFeedbackForUI);
  },
  async create(payload) {
    const data = await api('/api/feedbacks', { method: 'POST', body: payload });
    return mapFeedbackForUI(data?.feedback || data);
  },
  async update(id, body) {
    const data = await api(`/api/feedbacks/${id}`, { method: 'PUT', body });
    return mapFeedbackForUI(data?.feedback || data);
  },
  async delete(id) {
    await api(`/api/feedbacks/${id}`, { method: 'DELETE' });
    return true;
  },
};

export const Notification = {
  async list() {
    const data = await api('/api/notifications');
    return (data?.notifications || []).map(normalizeId).map(n => ({
      ...n,
      created_date: n.createdAt || n.created_date,
      is_read: typeof n.read === 'boolean' ? n.read : n.is_read,
    }));
  },
  async listOutgoing() {
    const data = await api('/api/notifications?sent_by_me=1');
    return (data?.notifications || []).map(normalizeId).map(n => ({
      ...n,
      created_date: n.createdAt || n.created_date,
      is_read: typeof n.read === 'boolean' ? n.read : n.is_read,
    }));
  },
  async filter(_query = {}, _sort = '-created_date', _limit = 200) {
    // If filtering for items sent by current user, use backend sent_by_me flag
    const wantsOutgoing = _query && (Object.prototype.hasOwnProperty.call(_query, 'sender_id') || _query.sent_by_me);
    const arr = wantsOutgoing ? await this.listOutgoing() : await this.list();
    return Array.isArray(arr) ? arr.slice(0, _limit) : [];
  },
  async create(payload) {
    // Only admins/super_admins allowed by backend
    const data = await api('/api/notifications', { method: 'POST', body: payload });
    return normalizeId(data?.notification || data);
  },
  async update(id, body) {
    if (body && (body.is_read === true || body.read === true)) {
      const data = await api(`/api/notifications/${id}/read`, { method: 'PATCH' });
      return normalizeId(data?.notification || data);
    }
    // No generic update route; return noop
    return {};
  },
  async markRead(id) { return this.update(id, { is_read: true }); },
};
export const ConsultationLog = { list: async () => [], filter: async () => [], create: async () => ({}), update: async () => ({}), delete: async () => ({}) };

// Finance API client
export const Finance = {
  async create(payload) {
    const data = await api('/api/finances', { method: 'POST', body: payload });
    return normalizeId(data?.transaction || data);
  },
  async list(query = {}) {
    const qs = new URLSearchParams(query).toString();
    const data = await api(`/api/finances${qs ? `?${qs}` : ''}`);
    return {
      items: Array.isArray(data?.items) ? data.items.map(normalizeId) : [],
      total: data?.total || 0,
      page: data?.page || 1,
      limit: data?.limit || 20,
      summary: data?.summary || { incomeApproved: 0, expenseApproved: 0, netApproved: 0 },
    };
  },
  async approve(id) {
    const data = await api(`/api/finances/${id}/approve`, { method: 'POST' });
    return normalizeId(data?.transaction || data);
  },
  async reject(id) {
    const data = await api(`/api/finances/${id}/reject`, { method: 'POST' });
    return normalizeId(data?.transaction || data);
  }
};

// Super Admin API client
export const SuperAdmin = {
  async listClinics(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const data = await api(`/api/superadmin/clinics${qs ? `?${qs}` : ''}`);
    return data;
  },
  async getClinicFinances(hospitalId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const data = await api(`/api/superadmin/clinics/${hospitalId}/finances${qs ? `?${qs}` : ''}`);
    return data;
  },
  async listDoctors(hospitalId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const data = await api(`/api/superadmin/clinics/${hospitalId}/doctors${qs ? `?${qs}` : ''}`);
    return data;
  },
  async listFeedbacks(hospitalId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const data = await api(`/api/superadmin/clinics/${hospitalId}/feedbacks${qs ? `?${qs}` : ''}`);
    return data;
  },
  async getClinicProgress(hospitalId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const data = await api(`/api/superadmin/clinics/${hospitalId}/progress${qs ? `?${qs}` : ''}`);
    return data;
  },
  async createClinicAdmin(hospitalId, payload) {
    const data = await api(`/api/superadmin/clinics/${hospitalId}/admin`, { method: 'POST', body: payload });
    return data;
  },
  async reassignClinicAdmin(hospitalId, payload) {
    const data = await api(`/api/superadmin/clinics/${hospitalId}/admin`, { method: 'PUT', body: payload });
    return data;
  }
};
