/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback } from "react";
import { TherapySession } from "@/services";
import { Patient } from "@/services";
import { User } from "@/services";
import { Hospital } from "@/services";
import { Rooms } from "@/services";
import { RescheduleRequests } from "@/services";
 
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Activity,
  CheckCircle,
  Stethoscope,
  Wind,
  Droplet,
  Flame,
  Mountain,
  Heart,
  PlayCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import PropTypes from 'prop-types';
// View-only: scheduling modal removed

function TherapyScheduling({ currentUser }) {
  const [sessions, setSessions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [self, setSelf] = useState(currentUser);
  
  const [planForm, setPlanForm] = useState({ patientId: '', therapyType: '', therapyOther: '', count: 5, startDate: '', time: '10:00', intervalDays: 1, duration: 60, staffId: '', notes: '' });
  const [planPreview, setPlanPreview] = useState([]);
  const [schedulingBusy, setSchedulingBusy] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [rows, setRows] = useState([]);
  const [roomOptions, setRoomOptions] = useState({}); // key: therapy|date|time|duration -> [{id,name,available_spots}]
  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTherapy, setFilterTherapy] = useState('');
  const [filterDate, setFilterDate] = useState('all'); // all | today | week | upcoming
  const [filterText, setFilterText] = useState('');

  // view-only: no calendar view
  // View-only: no scheduling/editing state

  const loadData = useCallback(async () => {
    // Resolve user from props or fallback to API to ensure rendering
    const user = currentUser || await User.me().catch(() => null);
    setSelf(user);
    if (!user) {
      setIsLoading(false);
      setStatusMessage('No authenticated user found.');
      return;
    }

    setIsLoading(true);
    try {
      console.log("Loading therapy scheduling data for user:", user);

      let patientFilter = {};
      let sessionFilter = {};

      if (user.role === 'super_admin') {
        console.log('Super admin: Loading all data');
      } else if (user.hospital_id && ['clinic_admin', 'doctor'].includes(user.role)) {
        patientFilter = { hospital_id: user.hospital_id };
        sessionFilter = { hospital_id: user.hospital_id };
        console.log('Hospital-based user: Filtering by hospital_id:', user.hospital_id);
      } else if (user.role === 'patient') {
        // First fetch the patient record, then load sessions by patient_id
        patientFilter = { user_id: user.id };
        console.log('Patient: Resolving patient record for user_id:', user.id);

        let patientsData = await Patient.filter(patientFilter, '-created_date', 2).catch(err => {
          console.error('Error loading patient record for user:', err);
          return [];
        });

        const patientId = patientsData?.[0]?.id;
        console.log('Resolved patientId:', patientId);

        if (!patientId) {
          // Fallback: attempt to resolve by email if available
          if (user?.email) {
            console.log('Attempting fallback resolve by email:', user.email);
            patientsData = await Patient.filter({ email: user.email }, '-created_date', 2).catch(() => []);
          }
          const fallbackId = patientsData?.[0]?.id;
          if (!fallbackId) {
            setPatients([]);
            setSessions([]);
            setIsLoading(false);
            setStatusMessage('No patient record linked to your account.');
            return;
          }
          const sessionsData = await TherapySession.filter({ patient_id: fallbackId }, '-created_date', 500).catch(err => {
            console.error('Error loading sessions for fallback patient:', err);
            return [];
          });
          setPatients(patientsData);
          setSessions(sessionsData);
          setIsLoading(false);
          setStatusMessage(sessionsData.length ? '' : 'No sessions found for your account.');
          return;
        }

        const sessionsData = await TherapySession.filter({ patient_id: patientId }, '-created_date', 500).catch(err => {
          console.error('Error loading sessions for patient:', err);
          return [];
        });

        setPatients(patientsData);
        setSessions(sessionsData);
        setIsLoading(false);
        setStatusMessage(sessionsData.length ? '' : 'No sessions found for your account.');
        return;
      } else if (user.role === 'guardian') {
        patientFilter = { guardian_ids: user.id };
        sessionFilter = {}; // Will be filtered based on patient results
        console.log('Guardian: Filtering by guardian_ids:', user.id);
      }

      console.log('Using filters for scheduling:', { patientFilter, sessionFilter });

      const [sessionsData, patientsData] = await Promise.all([
        TherapySession.filter(sessionFilter, '-created_date', 500).catch(err => {
          console.error('Error loading sessions:', err);
          return [];
        }),
        Patient.filter(patientFilter, '-created_date', 500).catch(err => {
          console.error('Error loading patients:', err);
          return [];
        })
      ]);

      console.log("Raw loaded data:", {
        sessions: sessionsData,
        patients: patientsData,
        sessionCount: sessionsData.length,
        patientCount: patientsData.length
      });

      // If guardian, filter sessions to only show sessions for their patients

      let finalSessions = sessionsData;
      if (user.role === 'guardian' && patientsData.length > 0) {
        const patientIds = patientsData.map(p => p.id);
        finalSessions = sessionsData.filter(session => patientIds.includes(session.patient_id));
        console.log("Guardian filtered sessions:", finalSessions);
      }

      // Normalize sessions to ensure scheduled_date/time are present for UI
      const mapSession = (s) => {
        const at = s.scheduled_at || s.scheduledAt;
        if (at && (!s.scheduled_date || !s.scheduled_time)) {
          const d = new Date(at);
          return {
            ...s,
            scheduled_date: s.scheduled_date || format(d, 'yyyy-MM-dd'),
            scheduled_time: s.scheduled_time || format(d, 'HH:mm'),
          };
        }
        return s;
      };

      const normalized = finalSessions.map(mapSession);

      console.log("Final scheduling data:", {
        sessions: normalized.length,
        patients: patientsData.length,
        sampleSessions: normalized.slice(0, 3)
      });

      setSessions(normalized);
      setPatients(patientsData);
      setStatusMessage(normalized.length ? '' : 'No sessions found for your account.');
    } catch (error) {
      console.error("Error loading scheduling data:", error);
      setSessions([]);
      setPatients([]);
      setStatusMessage('Failed to load sessions.');
    }
    setIsLoading(false);
  }, [currentUser]);

  useEffect(() => {
    // Always attempt to load data; loadData resolves user if prop is missing
    loadData();
  }, [currentUser, loadData]);

  // Load staff list for therapist assignment
  useEffect(() => {
    (async () => {
      const me = self || await User.me().catch(() => null);
      if (!me?.hospital_id) { setStaffList([]); return; }
      try {
        const staff = await Hospital.listStaff(me.hospital_id);
        setStaffList(staff || []);
      } catch { setStaffList([]); }
    })();
  }, [self]);

  const canSchedule = (self?.role === 'office_executive' || self?.role === 'super_admin');

  // Pending reschedule requests (office executive view)
  const [reqs, setReqs] = useState([]);
  const [reqBusyId, setReqBusyId] = useState(null);
  const [suggestions, setSuggestions] = useState({}); // reqId -> [{date,time,label}]
  const loadRequests = useCallback(async () => {
    try {
      const list = await RescheduleRequests.list({ status: 'pending' });
      setReqs(Array.isArray(list) ? list : []);
    } catch {
      setReqs([]);
    }
  }, []);
  useEffect(() => {
    if (!canSchedule) return;
    loadRequests();
    const id = setInterval(loadRequests, 30000);
    return () => clearInterval(id);
  }, [canSchedule, loadRequests]);

  const approveRequest = async (req) => {
    setReqBusyId(req.id);
    try {
      await RescheduleRequests.update(req.id, { status: 'approved' });
      setReqs(list => list.filter(r => r.id !== req.id));
      window.showNotification?.({ type: 'success', title: 'Approved' });
    } catch (e) {
      window.showNotification?.({ type: 'error', title: 'Failed', message: e?.message || 'Unable to approve' });
    } finally { setReqBusyId(null); }
  };
  const rejectRequest = async (req) => {
    setReqBusyId(req.id);
    try {
      await RescheduleRequests.update(req.id, { status: 'rejected' });
      setReqs(list => list.filter(r => r.id !== req.id));
      window.showNotification?.({ type: 'success', title: 'Rejected' });
    } catch (e) {
      window.showNotification?.({ type: 'error', title: 'Failed', message: e?.message || 'Unable to reject' });
    } finally { setReqBusyId(null); }
  };
  const rescheduleFromRequest = (req) => {
    const s = sessions.find(x => String(x.id) === String(req.session_id));
    if (!s) return window.showNotification?.({ type: 'error', title: 'Session not found' });
    openReschedule(s, req.id);
  };

  // Suggest top 3 slots using Rooms.availability + local conflict checks
  const pad2 = (n) => String(n).padStart(2,'0');
  const toDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const hasOverlap = (patientId, staffId, date, time, duration) => {
    const start = new Date(`${date}T${time}:00`);
    const end = new Date(start.getTime() + (Number(duration)||60)*60000);
    return sessions.some(x => {
      if (x.status === 'cancelled') return false;
      if ((patientId && String(x.patient_id) === String(patientId)) || (staffId && x.assigned_staff_id && String(x.assigned_staff_id) === String(staffId))) {
        const xs = new Date(x.scheduled_date ? `${x.scheduled_date}T${(x.scheduled_time||'00:00')}:00` : x.scheduled_at);
        if (isNaN(xs.getTime())) return false;
        const xe = new Date(xs.getTime() + (Number(x.duration_min)||60)*60000);
        return xs < end && start < xe;
      }
      return false;
    });
  };
  const suggestSlots = async (req) => {
    const s = sessions.find(x => String(x.id) === String(req.session_id));
    if (!s) return window.showNotification?.({ type: 'error', title: 'Session not found' });
    const baseDate = req.requested_date || s.scheduled_date;
    const baseTime = req.requested_time || s.scheduled_time || '10:00';
    const out = [];
    // Check same time for next 7 days
    for (let i=0; i<7 && out.length<3; i++) {
      const d = new Date(`${baseDate}T00:00:00`);
      d.setDate(d.getDate()+i);
      const dateStr = toDate(d);
      try {
        const avail = await Rooms.availability({ therapy_type: s.therapy_type, date: dateStr, time: baseTime, duration_min: s.duration_min });
        const hasSpot = (avail||[]).some(r => (r.available_spots||0) > 0);
        if (hasSpot && !hasOverlap(s.patient_id, s.assigned_staff_id, dateStr, baseTime, s.duration_min)) {
          out.push({ date: dateStr, time: baseTime, label: `${dateStr} ${baseTime}` });
        }
      } catch {}
    }
    // If less than 3, try +/- 30 mins same days
    const offsets = [30, -30, 60, -60];
    for (let i=0; i<7 && out.length<3; i++) {
      const d = new Date(`${baseDate}T00:00:00`); d.setDate(d.getDate()+i);
      const dateStr = toDate(d);
      for (const off of offsets) {
        if (out.length>=3) break;
        const [hh,mm] = baseTime.split(':').map(Number);
        const cand = new Date(`${dateStr}T${pad2(hh)}:${pad2(mm)}:00`);
        cand.setMinutes(cand.getMinutes()+off);
        const tStr = `${pad2(cand.getHours())}:${pad2(cand.getMinutes())}`;
        try {
          const avail = await Rooms.availability({ therapy_type: s.therapy_type, date: dateStr, time: tStr, duration_min: s.duration_min });
          const hasSpot = (avail||[]).some(r => (r.available_spots||0) > 0);
          if (hasSpot && !hasOverlap(s.patient_id, s.assigned_staff_id, dateStr, tStr, s.duration_min)) {
            out.push({ date: dateStr, time: tStr, label: `${dateStr} ${tStr}` });
          }
        } catch {}
      }
    }
    setSuggestions(prev => ({ ...prev, [req.id]: out.slice(0,3) }));
  };
  const applySuggestion = (req, cand) => {
    const s = sessions.find(x => String(x.id) === String(req.session_id));
    if (!s) return; 
    setResched({ id: s.id, date: cand.date, time: cand.time, busy: false, requestId: req.id });
  };

  const statusStyles = {
    scheduled: 'bg-gray-100 text-gray-700 border-gray-200',
    in_progress: 'bg-sky-50 text-sky-700 border-sky-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
    awaiting_confirmation: 'bg-amber-50 text-amber-700 border-amber-200',
    no_show: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const [resched, setResched] = useState(null);
  const openReschedule = (session, requestId) => {
    setResched({ id: session.id, date: session.scheduled_date || '', time: session.scheduled_time || '', busy: false, requestId: requestId || null });
  };
  const cancelReschedule = () => setResched(null);
  const saveReschedule = async (session) => {
    if (!resched?.date || !resched?.time) {
      return window.showNotification?.({ type: 'error', title: 'Missing', message: 'Pick date and time' });
    }
    const iso = new Date(`${resched.date}T${resched.time}:00`).toISOString();
    const duration = session.duration_min || 60;
    setResched(s => ({ ...s, busy: true }));
    try {
      await TherapySession.update(session.id, { scheduled_at: iso, duration_min: duration, status: 'awaiting_confirmation', ...(session.room_id ? { room_id: session.room_id } : {}) });
      window.showNotification?.({ type: 'success', title: 'Rescheduled' });
      setSessions(ss => ss.map(x => x.id === session.id ? { ...x, scheduled_date: resched.date, scheduled_time: resched.time } : x));
      // If this reschedule came from a pending request, approve it
      if (resched?.requestId) {
        try { await RescheduleRequests.update(resched.requestId, { status: 'approved' }); } catch {}
        setReqs(list => list.filter(r => String(r.id) !== String(resched.requestId)));
      }
      setResched(null);
    } catch (e) {
      if (e?.status === 409) {
        try {
          const avail = await Rooms.availability({ therapy_type: session.therapy_type, date: resched.date, time: resched.time, duration_min: duration });
          const candidate = (avail || []).find(r => (r.available_spots || 0) > 0);
          if (!candidate) throw new Error('No room available at the selected time');
          await TherapySession.update(session.id, { scheduled_at: iso, duration_min: duration, status: 'awaiting_confirmation', room_id: candidate.id });
          window.showNotification?.({ type: 'success', title: 'Rescheduled', message: `Room auto-assigned: ${candidate.name}` });
          setSessions(ss => ss.map(x => x.id === session.id ? { ...x, scheduled_date: resched.date, scheduled_time: resched.time, room_id: candidate.id, room_number: candidate.name } : x));
          if (resched?.requestId) {
            try { await RescheduleRequests.update(resched.requestId, { status: 'approved' }); } catch {}
            setReqs(list => list.filter(r => String(r.id) !== String(resched.requestId)));
          }
          setResched(null);
        } catch (e2) {
          window.showNotification?.({ type: 'error', title: 'Reschedule failed', message: e2?.message || 'No availability' });
          setResched(s => ({ ...s, busy: false }));
        }
      } else {
        window.showNotification?.({ type: 'error', title: 'Reschedule failed', message: e?.message || 'Unable to reschedule' });
        setResched(s => ({ ...s, busy: false }));
      }
    }
  };

  const updateSessionStatus = async (sessionId, newStatus) => {
    const prev = sessions;
    setSessions(s => s.map(x => x.id === sessionId ? { ...x, status: newStatus } : x));
    try {
      await TherapySession.update(sessionId, { status: newStatus });
      window.showNotification?.({ type: 'success', title: 'Status updated', message: newStatus.replace(/_/g,' ') });
    } catch (e) {
      setSessions(prev);
      window.showNotification?.({ type: 'error', title: 'Update failed', message: e?.message || 'Unable to update status' });
    }
  };

  const addRow = () => {
    setRows(r => ([
      ...r,
      {
        date: planForm.startDate || '',
        time: planForm.time || '10:00',
        therapyType: planForm.therapyType || '',
        therapyOther: planForm.therapyOther || '',
        duration: planForm.duration || 60,
        staffId: planForm.staffId || '',
        roomId: '',
      }
    ]));
  };

  const updateRow = (idx, key, val) => {
    setRows(prev => prev.map((r,i) => i === idx ? { ...r, [key]: val } : r));
  };

  const removeRow = (idx) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  const keyFor = (therapy, date, time, duration) => `${therapy}|${date}|${time}|${duration}`;
  const fetchAvailability = async (therapy, date, time, duration) => {
    const tType = String(therapy || '').toLowerCase().trim().replace(/\s+/g, '_');
    const key = keyFor(tType, date, time, duration);
    if (roomOptions[key]) return roomOptions[key];
    if (!date || !time) return [];
    try {
      const rooms = await Rooms.availability({ therapy_type: tType, date, time, duration_min: duration });
      setRoomOptions(prev => ({ ...prev, [key]: rooms }));
      return rooms;
    } catch {
      return [];
    }
  };

  const handleGeneratePreview = async () => {
    const { patientId, therapyType, therapyOther, count, startDate, time, intervalDays, duration, staffId, notes } = planForm;
    if (!patientId) {
      return window.showNotification?.({ type: 'error', title: 'Missing patient', message: 'Select a patient.' });
    }

    // Advanced mode: build from rows
    if (advanced) {
      if (!rows.length) {
        return window.showNotification?.({ type: 'error', title: 'No rows', message: 'Add at least one session row.' });
      }
      const out = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r.date || !r.time) {
          return window.showNotification?.({ type: 'error', title: 'Date/time required', message: `Row ${i+1}: Please set date and time.` });
        }
        if (!r.therapyType) {
          return window.showNotification?.({ type: 'error', title: 'Therapy required', message: `Row ${i+1}: Select a therapy or choose Other and type.` });
        }
        if (r.therapyType === 'other' && !String(r.therapyOther || '').trim()) {
          return window.showNotification?.({ type: 'error', title: 'Therapy required', message: `Row ${i+1}: Type therapy name for Other.` });
        }
        if (!r.staffId) {
          return window.showNotification?.({ type: 'error', title: 'Therapist required', message: `Row ${i+1}: Assign a therapist.` });
        }
        const tType = r.therapyType === 'other' ? r.therapyOther.toLowerCase().trim().replace(/\s+/g, '_') : r.therapyType;
        const iso = new Date(`${r.date}T${r.time}:00`).toISOString();
        // load availability and pick a room (user may override by row.roomId)
        let assignedRoom = null;
        const avail = await fetchAvailability(tType, r.date, r.time, r.duration || duration);
        if (r.roomId) {
          assignedRoom = avail.find(x => String(x.id) === String(r.roomId)) || null;
          if (!assignedRoom) {
            window.showNotification?.({ type: 'warning', title: `Row ${i+1}`, message: 'Selected room not available; auto-assigning.' });
          }
        }
        if (!assignedRoom) assignedRoom = avail.find(x => (x.available_spots || 0) > 0) || null;
        out.push({
          iso,
          date: r.date,
          time: r.time,
          therapy_type: tType,
          duration_min: Number(r.duration || duration) || 60,
          staff_id: r.staffId,
          room_id: assignedRoom?.id || '',
          room_name: assignedRoom?.name || 'Auto',
          notes: notes || ''
        });
      }
      setPlanPreview(out);
      return;
    }

    // Simple mode: repeat same therapy by interval
    if (!therapyType || !count || !startDate || !time) {
      return window.showNotification?.({ type: 'error', title: 'Missing details', message: 'Select therapy, count, start date and time.' });
    }
    if (!staffId) {
      return window.showNotification?.({ type: 'error', title: 'Therapist required', message: 'Please assign a therapist.' });
    }
    const selectedType = therapyType === 'other'
      ? (therapyOther || '').toLowerCase().trim().replace(/\s+/g, '_')
      : therapyType;
    if (!selectedType) {
      return window.showNotification?.({ type: 'error', title: 'Therapy required', message: 'Please select a therapy or enter one under Other.' });
    }
    const n = Math.max(1, Number(count) || 1);
    const gap = Math.max(1, Number(intervalDays) || 1);
    const out = [];
    let d = new Date(`${startDate}T${time}:00`);
    for (let i = 0; i < n; i++) {
      const dateStr = d.toISOString().slice(0,10);
      const avail = await fetchAvailability(selectedType, dateStr, time, duration);
      const assignedRoom = avail.find(x => (x.available_spots || 0) > 0) || null;
      out.push({
        iso: new Date(d).toISOString(),
        date: dateStr,
        time: time,
        therapy_type: selectedType,
        duration_min: Number(duration) || 60,
        staff_id: staffId,
        room_id: assignedRoom?.id || '',
        room_name: assignedRoom?.name || 'Auto',
        notes: notes || ''
      });
      d = new Date(d.getTime() + gap * 24 * 3600 * 1000);
    }
    setPlanPreview(out);
  };

  const handleCreateSessions = async () => {
    if (!planPreview.length) return window.showNotification?.({ type: 'error', title: 'No preview', message: 'Generate a preview first.' });
    const me = currentUser || await User.me().catch(() => null);
    if (!me?.hospital_id) return window.showNotification?.({ type: 'error', title: 'Clinic missing', message: 'Your account is not linked to a clinic.' });
    const patientId = planForm.patientId;
    const patient = patients.find(p => p.id === patientId);
    const doctorId = patient?.assigned_doctor_id || null;
    try {
      setSchedulingBusy(true);
      for (const s of planPreview) {
        const payload = {
          hospital_id: me.hospital_id,
          patient_id: patientId,
          ...(doctorId ? { doctor_id: doctorId } : {}),
          therapy_type: s.therapy_type,
          scheduled_at: s.iso,
          duration_min: s.duration_min,
          ...(s.staff_id ? { assigned_staff_id: s.staff_id } : {}),
          ...(s.room_id ? { room_id: s.room_id } : {}),
          notes: s.staff_id ? `${s.notes ? s.notes + ' | ' : ''}Assigned Therapist: ${s.staff_id}` : s.notes
        };
        await TherapySession.create(payload);
      }
      window.showNotification?.({ type: 'success', title: 'Sessions created', message: `${planPreview.length} sessions scheduled.` });
      setPlanPreview([]);
      setPlanForm(f => ({ ...f, notes: '' }));
      loadData();
    } catch (err) {
      window.showNotification?.({ type: 'error', title: 'Create failed', message: err?.message || 'Unable to create sessions.' });
    } finally { setSchedulingBusy(false); }
  };

  // Derived therapy list from data for filter dropdown
  const allTherapies = Array.from(new Set((sessions || []).map(s => s.therapy_type).filter(Boolean))).sort();

  // Apply filters
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const weekStart = (() => { const d=new Date(); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); d.setHours(0,0,0,0); return d; })();
  const weekEnd = new Date(weekStart.getTime()+6*24*3600*1000+86399999);

  const filteredSessions = sessions.filter(s => {
    // status
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    // therapy
    if (filterTherapy && s.therapy_type !== filterTherapy) return false;
    // date quick filters
    const d = new Date(s.scheduled_date || s.scheduled_at || 0);
    if (isNaN(d.getTime())) return false;
    if (filterDate === 'today' && format(d,'yyyy-MM-dd') !== todayStr) return false;
    if (filterDate === 'week' && !(d >= weekStart && d <= weekEnd)) return false;
    if (filterDate === 'upcoming' && d < new Date()) return false;
    // text
    if (filterText) {
      const pName = (getPatientName(s.patient_id) || '').toLowerCase();
      const tName = (s.therapy_type || '').replace(/_/g,' ').toLowerCase();
      const q = filterText.toLowerCase();
      if (!pName.includes(q) && !tName.includes(q)) return false;
    }
    return true;
  });

  // Group sessions by scheduled_date for compact list
  const sessionsByDate = (() => {
    const map = new Map();
    const now = new Date();
    const toDateTime = (s) => {
      if (s.scheduled_date) {
        const t = s.scheduled_time ? `${s.scheduled_time}:00` : '00:00:00';
        return new Date(`${s.scheduled_date}T${t}`);
      }
      return new Date(s.scheduled_at || 0);
    };
    const sorted = [...filteredSessions]
      .filter(s => {
        const dt = toDateTime(s);
        return !isNaN(dt.getTime()) && dt >= now; // upcoming only
      })
      .sort((a,b) => {
      const ad = new Date(a.scheduled_date || 0).getTime();
      const bd = new Date(b.scheduled_date || 0).getTime();
      if (ad !== bd) return ad - bd;
      return String(a.scheduled_time || '').localeCompare(String(b.scheduled_time || ''));
    });
    const list = sorted.slice(0, 5);
    list.forEach(s => {
      const key = s.scheduled_date || 'Unknown Date';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    });
    return map;
  })();

  const getSessionsCount = (type) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    switch (type) {
      case 'today':
        return sessions.filter(s => (s.scheduled_date === today) || (format(new Date(s.scheduled_date), 'yyyy-MM-dd') === today)).length;
      case 'completed':
        return sessions.filter(s => s.status === 'completed').length;
      case 'pending':
        return sessions.filter(s => s.status === 'scheduled' || s.status === 'in_progress').length;
      default:
        return sessions.length;
    }
  };

  // View-only: no schedule/edit/delete handlers

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient?.full_name || `Patient ${patientId}`;
  };

  const therapists = staffList.filter(s => s.role === 'therapist' || String(s.department || '').toLowerCase().includes('therap'));

  const therapyVisuals = {
    'vamana': { 
      color: 'from-sky-400 to-blue-500', 
      bgColor: 'bg-gradient-to-br from-sky-100 to-blue-100',
      icon: <Flame className="w-4 h-4" />, 
      emoji: '🤮',
      borderColor: 'border-sky-400'
    },
    'virechana': { 
      color: 'from-green-400 to-emerald-500', 
      bgColor: 'bg-gradient-to-br from-green-100 to-emerald-100',
      icon: <Droplet className="w-4 h-4" />, 
      emoji: '💊',
      borderColor: 'border-green-400'
    },
    'basti': { 
      color: 'from-yellow-400 to-orange-500', 
      bgColor: 'bg-gradient-to-br from-yellow-100 to-orange-100',
      icon: <Wind className="w-4 h-4" />, 
      emoji: '💉',
      borderColor: 'border-yellow-400'
    },
    'nasya': { 
      color: 'from-cyan-400 to-teal-500', 
      bgColor: 'bg-gradient-to-br from-cyan-100 to-teal-100',
      icon: <Stethoscope className="w-4 h-4" />, 
      emoji: '👃',
      borderColor: 'border-cyan-400'
    },
    'raktamokshana': { 
      color: 'from-red-400 to-pink-500', 
      bgColor: 'bg-gradient-to-br from-red-100 to-pink-100',
      icon: <Heart className="w-4 h-4" />, 
      emoji: '🩸',
      borderColor: 'border-red-400'
    },
    'abhyanga': { 
      color: 'from-emerald-400 to-green-500', 
      bgColor: 'bg-gradient-to-br from-emerald-100 to-green-100',
      icon: <Users className="w-4 h-4" />, 
      emoji: '💆‍♀️',
      borderColor: 'border-emerald-400'
    },
    'shirodhara': { 
      color: 'from-indigo-400 to-blue-500', 
      bgColor: 'bg-gradient-to-br from-indigo-100 to-blue-100',
      icon: <Activity className="w-4 h-4" />, 
      emoji: '🫗',
      borderColor: 'border-indigo-400'
    },
    'swedana': { 
      color: 'from-orange-400 to-red-500', 
      bgColor: 'bg-gradient-to-br from-orange-100 to-red-100',
      icon: <Mountain className="w-4 h-4" />, 
      emoji: '♨️',
      borderColor: 'border-orange-400'
    },
    'default': { 
      color: 'from-gray-400 to-gray-500', 
      bgColor: 'bg-gradient-to-br from-gray-100 to-gray-200',
      icon: <Stethoscope className="w-4 h-4" />, 
      emoji: '🏥',
      borderColor: 'border-gray-400'
    }
  };

  const getTherapyVisual = (therapyType) => {
    return therapyVisuals[therapyType] || therapyVisuals.default;
  };

  const StatCard = ({ title, value, icon: Icon, color }) => {
    return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 md:p-6 shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs md:text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">{value}</p>
        </div>
        {statusMessage && (
          <div className="px-4 py-3 rounded-xl bg-yellow-50 text-yellow-800 border border-yellow-200">
            {statusMessage}
          </div>
        )}
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </div>
      </div>
    </motion.div>
    );
  };

  StatCard.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    icon: PropTypes.elementType.isRequired,
    color: PropTypes.string.isRequired
  };

  const SessionCard = ({ session, canManage, onChangeStatus, onOpenReschedule }) => {
    const visual = getTherapyVisual(session.therapy_type);
    const label = String(session.status || 'scheduled').replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.9 }}
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ duration: 0.2 }}
        className={`relative p-3 rounded-xl ${visual.bgColor} border-l-4 ${visual.borderColor} shadow-sm transition-all duration-200`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{visual.emoji}</span>
              <h4 className="font-semibold text-gray-800 text-sm capitalize truncate">
                {session.therapy_type.replace(/_/g, ' ')}
              </h4>
            </div>
            <p className="text-gray-600 text-xs mb-2 truncate">{getPatientName(session.patient_id)}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span>{session.scheduled_time}</span>
              {session.room_number && (
                <>
                  <span>•</span>
                  <span className="truncate">Room {session.room_number}</span>
                </>
              )}
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] border ${statusStyles[session.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{label}</span>
        </div>
        {canManage && (
          <div className="mt-2 flex flex-wrap gap-1">
            {session.status === 'scheduled' && (
              <>
                <button onClick={()=>onChangeStatus(session.id,'in_progress')} className="px-2 py-1 text-xs rounded border bg-white inline-flex items-center gap-1"><PlayCircle className="w-3 h-3"/>Start</button>
                <button onClick={()=>onChangeStatus(session.id,'completed')} className="px-2 py-1 text-xs rounded border bg-white inline-flex items-center gap-1"><CheckCircle className="w-3 h-3"/>Complete</button>
                <button onClick={()=>onChangeStatus(session.id,'cancelled')} className="px-2 py-1 text-xs rounded border bg-white inline-flex items-center gap-1 text-rose-600"><XCircle className="w-3 h-3"/>Cancel</button>
                <button onClick={()=>onOpenReschedule(session)} className="px-2 py-1 text-xs rounded border bg-white">Reschedule</button>
              </>
            )}
            {session.status === 'in_progress' && (
              <>
                <button onClick={()=>onChangeStatus(session.id,'completed')} className="px-2 py-1 text-xs rounded border bg-white inline-flex items-center gap-1"><CheckCircle className="w-3 h-3"/>Complete</button>
                <button onClick={()=>onChangeStatus(session.id,'cancelled')} className="px-2 py-1 text-xs rounded border bg-white inline-flex items-center gap-1 text-rose-600"><XCircle className="w-3 h-3"/>Cancel</button>
                <button onClick={()=>onOpenReschedule(session)} className="px-2 py-1 text-xs rounded border bg-white">Reschedule</button>
              </>
            )}
            {(session.status === 'completed' || session.status === 'cancelled') && (
              <button onClick={()=>onChangeStatus(session.id,'scheduled')} className="px-2 py-1 text-xs rounded border bg-white inline-flex items-center gap-1"><RotateCcw className="w-3 h-3"/>Reopen</button>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  SessionCard.propTypes = {
    session: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      therapy_type: PropTypes.string.isRequired,
      patient_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      scheduled_time: PropTypes.string,
      scheduled_date: PropTypes.string,
      room_number: PropTypes.string
    }).isRequired,
    canManage: PropTypes.bool,
    onChangeStatus: PropTypes.func,
    onOpenReschedule: PropTypes.func
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-8 space-y-4 md:space-y-8 bg-gradient-to-br from-gray-50 to-blue-50/20 min-h-screen">
      <style>{``}</style>
      
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
            <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-gray-900">Therapy Scheduling</h1>
            <p className="text-gray-500 text-xs md:text-base">View scheduled appointments and therapy sessions</p>
          </div>
        </div>

        <div />
      </div>

      

      {canSchedule && (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-3 md:p-6 shadow-xl border border-white/50">
          <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-3">Schedule Therapies (from doctor plan)</h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Patient</label>
              <select value={planForm.patientId} onChange={(e)=>setPlanForm(f=>({ ...f, patientId: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select patient</option>
                {patients.map(p => (<option key={p.id} value={p.id}>{p.full_name || p.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Therapy</label>
              <select
                value={planForm.therapyType}
                onChange={(e)=>setPlanForm(f=>({ ...f, therapyType: e.target.value, therapyOther: '' }))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select therapy</option>
                <option value="nasya">Nasya</option>
                <option value="raktmokshana">Raktmokshana</option>
                <option value="vaman">Vaman</option>
                <option value="virechana">Virechana</option>
                <option value="basti">Basti</option>
                <option value="other">Other</option>
              </select>
              {planForm.therapyType === 'other' && (
                <input
                  type="text"
                  value={planForm.therapyOther}
                  onChange={(e)=>setPlanForm(f=>({ ...f, therapyOther: e.target.value }))}
                  className="mt-2 w-full px-3 py-2 border rounded-lg"
                  placeholder="Type therapy name"
                />
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Sessions</label>
              <input type="number" min="1" value={planForm.count} onChange={(e)=>setPlanForm(f=>({ ...f, count: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Start Date</label>
              <input type="date" value={planForm.startDate} onChange={(e)=>setPlanForm(f=>({ ...f, startDate: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Time</label>
              <input type="time" value={planForm.time} onChange={(e)=>setPlanForm(f=>({ ...f, time: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Interval (days)</label>
              <input type="number" min="1" value={planForm.intervalDays} onChange={(e)=>setPlanForm(f=>({ ...f, intervalDays: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Duration (min)</label>
              <input type="number" min="10" step="5" value={planForm.duration} onChange={(e)=>setPlanForm(f=>({ ...f, duration: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Assign Therapist</label>
              <select required value={planForm.staffId} onChange={(e)=>setPlanForm(f=>({ ...f, staffId: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select therapist</option>
                {therapists.map(s => (<option key={s.id} value={s.id}>{s.full_name || s.name}</option>))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-gray-600 mb-1">Notes</label>
              <input type="text" value={planForm.notes} onChange={(e)=>setPlanForm(f=>({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" placeholder="Optional notes" />
            </div>
            <div className="md:col-span-6 flex gap-2 justify-end">
              <button type="button" onClick={handleGeneratePreview} disabled={advanced ? (rows.length === 0) : (!planForm.staffId || therapists.length === 0)} className="px-4 py-2 rounded-lg border disabled:opacity-50">Preview</button>
              <button type="button" onClick={handleCreateSessions} disabled={schedulingBusy || !planPreview.length || (!advanced && (!planForm.staffId || (planForm.therapyType === 'other' && !planForm.therapyOther.trim())))} className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white disabled:opacity-50">{schedulingBusy ? 'Scheduling...' : 'Create Sessions'}</button>
            </div>
          </div>

          {/* Advanced mode toggle */}
          <div className="mt-2 mb-2 flex items-center gap-3">
            <label className="text-xs text-gray-600">Advanced (per-session plan)</label>
            <input type="checkbox" checked={advanced} onChange={(e)=>setAdvanced(e.target.checked)} />
            {advanced && (
              <button type="button" onClick={addRow} className="ml-auto px-3 py-1.5 rounded-md border">Add Row</button>
            )}
          </div>

          {advanced && (
            <div className="overflow-auto border rounded-xl">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Therapy</th>
                    <th className="px-3 py-2 text-left">Other</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-left">Duration</th>
                    <th className="px-3 py-2 text-left">Room</th>
                    <th className="px-3 py-2 text-left">Therapist</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">
                        <select value={r.therapyType} onChange={(e)=>updateRow(idx,'therapyType', e.target.value)} className="w-full px-2 py-1 border rounded-md">
                          <option value="">Select</option>
                          <option value="nasya">Nasya</option>
                          <option value="raktmokshana">Raktmokshana</option>
                          <option value="vaman">Vaman</option>
                          <option value="virechana">Virechana</option>
                          <option value="basti">Basti</option>
                          <option value="other">Other</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={r.therapyOther || ''} onChange={(e)=>updateRow(idx,'therapyOther', e.target.value)} placeholder="if Other" className="w-full px-2 py-1 border rounded-md" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="date" value={r.date || ''} onChange={(e)=>updateRow(idx,'date', e.target.value)} className="w-full px-2 py-1 border rounded-md" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="time" value={r.time || ''} onChange={(e)=>updateRow(idx,'time', e.target.value)} className="w-full px-2 py-1 border rounded-md" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="10" step="5" value={r.duration || 60} onChange={(e)=>updateRow(idx,'duration', e.target.value)} className="w-full px-2 py-1 border rounded-md" />
                      </td>
                      <td className="px-3 py-2">
                        {(() => {
                          const tType = r.therapyType === 'other' ? (r.therapyOther||'').toLowerCase().trim().replace(/\s+/g,'_') : r.therapyType;
                          const key = keyFor(tType, r.date, r.time, r.duration || planForm.duration);
                          const opts = roomOptions[key] || [];
                          const onLoad = async () => { await fetchAvailability(tType, r.date, r.time, r.duration || planForm.duration); };
                          return (
                            <div className="flex items-center gap-2">
                              <select value={r.roomId || ''} onFocus={onLoad} onChange={(e)=>updateRow(idx,'roomId', e.target.value)} className="w-full px-2 py-1 border rounded-md">
                                <option value="">Auto</option>
                                {opts.map(o => (
                                  <option key={o.id} value={o.id}>{o.name} {typeof o.available_spots==='number' ? `(${o.available_spots})` : ''}</option>
                                ))}
                              </select>
                              <button type="button" onClick={onLoad} className="px-2 py-1 border rounded">Check</button>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2">
                        <select value={r.staffId || ''} onChange={(e)=>updateRow(idx,'staffId', e.target.value)} className="w-full px-2 py-1 border rounded-md">
                          <option value="">Select therapist</option>
                          {therapists.map(s => (<option key={s.id} value={s.id}>{s.full_name || s.name}</option>))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={()=>removeRow(idx)} className="px-2 py-1 text-red-600 border rounded-md">Remove</button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-3 py-3 text-center text-gray-500">No rows. Click Add Row to start.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {planPreview.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <div className="text-sm text-gray-600 mb-2">Preview ({planPreview.length})</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {planPreview.map((p, idx) => (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="font-medium capitalize">{p.therapy_type.replace(/_/g,' ')}</div>
                    <div className="text-sm text-gray-600">{new Date(p.iso).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Duration: {p.duration_min} min</div>
                    <div className="text-xs text-gray-500">Room: {p.room_name || 'Auto'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard
          title="Today's Sessions"
          value={getSessionsCount('today')}
          icon={CalendarIcon}
          color="from-blue-500 to-blue-600"
        />
        <StatCard
          title="This Week"
          value={getSessionsCount('week')}
          icon={Activity}
          color="from-green-500 to-green-600"
        />
        <StatCard
          title="Completed"
          value={getSessionsCount('completed')}
          icon={CheckCircle}
          color="from-purple-500 to-purple-600"
        />
        <StatCard
          title="Pending"
          value={getSessionsCount('pending')}
          icon={Clock}
          color="from-orange-500 to-orange-600"
        />
      </div>

      {/* Pending Reschedule Requests - Office Executive */}
      {canSchedule && reqs.length > 0 && (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-3 md:p-6 shadow-xl border border-white/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base md:text-lg font-semibold text-gray-800">Reschedule Requests</h2>
            <button onClick={loadRequests} className="px-3 py-1.5 text-xs rounded border">Refresh</button>
          </div>
          <div className="space-y-2">
            {reqs.map(r => {
              const s = sessions.find(x => String(x.id) === String(r.session_id));
              const when = s ? `${s.scheduled_date || ''} ${s.scheduled_time || ''}` : '';
              const pref = [r.requested_date, r.requested_time].filter(Boolean).join(' ');
              return (
                <div key={r.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 border rounded-xl">
                  <div className="text-sm">
                    <div className="font-medium">{s ? s.therapy_type.replace(/_/g,' ') : 'Session'} • {when}</div>
                    <div className="text-gray-600">{getPatientName(s?.patient_id)}{pref ? ` • Pref: ${pref}` : ''}</div>
                    {r.reason && <div className="text-xs text-gray-500 mt-0.5">Reason: {r.reason}</div>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => rescheduleFromRequest(r)} className="px-3 py-1.5 rounded border">Reschedule</button>
                    <button onClick={() => suggestSlots(r)} className="px-3 py-1.5 rounded border">Suggest slots</button>
                    <button onClick={() => approveRequest(r)} disabled={reqBusyId===r.id} className="px-3 py-1.5 rounded bg-emerald-600 text-white disabled:opacity-50">Approve</button>
                    <button onClick={() => rejectRequest(r)} disabled={reqBusyId===r.id} className="px-3 py-1.5 rounded border text-rose-600 disabled:opacity-50">Reject</button>
                  </div>
                  {Array.isArray(suggestions[r.id]) && suggestions[r.id].length > 0 && (
                    <div className="md:col-span-2 flex flex-wrap gap-2 mt-2">
                      {suggestions[r.id].map((c, idx) => (
                        <button key={idx} onClick={() => applySuggestion(r, c)} className="px-2 py-1 text-xs rounded-full border bg-white">{c.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters + Compact sessions list */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-3 md:p-6 shadow-xl border border-white/50">
        {/* Filters Toolbar */}
        <div className="mb-4 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              {key:'all', label:'All'},
              {key:'scheduled', label:'Scheduled'},
              {key:'in_progress', label:'In Progress'},
              {key:'completed', label:'Completed'},
              {key:'cancelled', label:'Cancelled'},
            ].map(b => (
              <button key={b.key} onClick={()=>setFilterStatus(b.key)} className={`px-3 py-1.5 rounded-full text-xs border ${filterStatus===b.key?'bg-gradient-to-r from-blue-600 to-indigo-600 text-white':'bg-white'}`}>{b.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full md:w-auto">
            <select value={filterTherapy} onChange={(e)=>setFilterTherapy(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="">All therapies</option>
              {allTherapies.map(t => (<option key={t} value={t}>{t.replace(/_/g,' ')}</option>))}
            </select>
            <select value={filterDate} onChange={(e)=>setFilterDate(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="all">All dates</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="upcoming">Upcoming</option>
            </select>
            <input value={filterText} onChange={(e)=>setFilterText(e.target.value)} placeholder="Search patient or therapy" className="px-3 py-2 border rounded-lg" />
          </div>
        </div>
        {sessions.length === 0 ? (
          <div className="text-gray-500 text-center py-12">No sessions scheduled.</div>
        ) : (
          <div className="space-y-6">
            {[...sessionsByDate.keys()].map(dateKey => (
              <div key={dateKey}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm md:text-base font-semibold text-gray-800">
                    {dateKey ? format(new Date(dateKey), 'EEE, MMM d, yyyy') : 'Unknown Date'}
                  </h3>
                  <span className="text-xs text-gray-500">{sessionsByDate.get(dateKey)?.length} sessions</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <AnimatePresence>
                    {sessionsByDate.get(dateKey).map(s => (
                      <div key={s.id} className="session-card">
                        <SessionCard session={s} canManage={canSchedule} onChangeStatus={updateSessionStatus} onOpenReschedule={openReschedule} />
                        {canSchedule && resched?.id === s.id && (
                          <div className="mt-2 p-2 border rounded-lg bg-white">
                            <div className="grid grid-cols-2 gap-2">
                              <input type="date" value={resched.date || ''} onChange={(e)=>setResched(rs=>({...rs, date: e.target.value}))} className="px-2 py-1 border rounded" />
                              <input type="time" value={resched.time || ''} onChange={(e)=>setResched(rs=>({...rs, time: e.target.value}))} className="px-2 py-1 border rounded" />
                            </div>
                            <div className="mt-2 flex gap-2 justify-end">
                              <button onClick={()=>saveReschedule(s)} disabled={resched.busy} className="px-3 py-1.5 rounded bg-gradient-to-r from-blue-600 to-indigo-600 text-white disabled:opacity-50">{resched.busy?'Saving...':'Save'}</button>
                              <button onClick={cancelReschedule} disabled={resched.busy} className="px-3 py-1.5 rounded border">Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View-only: scheduling modal removed */}
    </div>
  );
}

TherapyScheduling.propTypes = {
  currentUser: PropTypes.object
};

export default TherapyScheduling;