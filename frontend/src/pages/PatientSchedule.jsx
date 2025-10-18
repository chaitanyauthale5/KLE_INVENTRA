import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Activity, Info, ArrowRight } from "lucide-react";
import { User, Patient, TherapySession, RescheduleRequests } from "@/services";

function Badge({ children, color = "blue" }) {
  const map = {
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    red: "bg-rose-100 text-rose-700 border-rose-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200",
  };
  return <span className={`px-2 py-0.5 text-xs rounded-full border ${map[color]}`}>{children}</span>;
}

export default function PatientSchedule() {
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [pendingMap, setPendingMap] = useState({});
  const [reqModal, setReqModal] = useState({ open: false, session: null, reason: '', date: '', time: '', busy: false });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        // Resolve the patient's own record
        const p = await Patient.me().catch(async () => {
          const me = await User.me().catch(() => null);
          if (!me) return null;
          const arr = await Patient.filter({ user_id: me.id }).catch(() => []);
          return arr?.[0] || null;
        });
        if (!alive) return;
        setPatient(p);
        if (p) {
          const list = await TherapySession.filter({ patient_id: p.id }).catch(() => []);
          if (!alive) return;
          setSessions(Array.isArray(list) ? list : []);
          const reqs = await RescheduleRequests.list({ status: 'pending' }).catch(() => []);
          if (!alive) return;
          const map = {};
          for (const r of (reqs || [])) { if (r.session_id) map[String(r.session_id)] = true; }
          setPendingMap(map);
        } else {
          setSessions([]);
          setPendingMap({});
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 30000); // poll every 30s for near real-time
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Build grouped-by-date view (real-time only)
  const { grouped, upcoming } = useMemo(() => {
    const list = Array.isArray(sessions) ? sessions : [];
    const sorted = [...list].sort((a, b) => {
      const da = String(a.scheduled_date), db = String(b.scheduled_date);
      if (da !== db) return da.localeCompare(db);
      return String(a.scheduled_time || "").localeCompare(String(b.scheduled_time || ""));
    });
    const map = new Map();
    for (const s of sorted) {
      const key = String(s.scheduled_date || "");
      const arr = map.get(key) || [];
      arr.push(s);
      map.set(key, arr);
    }
    // Find next non-completed session
    const upcomingItem = sorted.find((s) => s.status !== "completed") || null;
    return { grouped: map, upcoming: upcomingItem };
  }, [sessions]);

  const statusColor = (s) =>
    s === "completed" ? "green" : s === "in_progress" ? "orange" : "blue";

  // Derive the assigned therapist name (from sessions or patient fallback)
  const therapistName = useMemo(() => {
    const fromSession = sessions.find(s => s.therapist_name || s.therapist)?.therapist_name || sessions.find(s => s.therapist)?.therapist?.full_name;
    return fromSession || patient?.assigned_therapist || patient?.assigned_doctor || "Assigned";
  }, [sessions, patient]);

  const openRequestModal = (s) => {
    if (!s?.id) return;
    const id = String(s.id);
    if (pendingMap[id]) return;
    setReqModal({ open: true, session: s, reason: '', date: '', time: '', busy: false });
  };
  const closeRequestModal = () => setReqModal({ open: false, session: null, reason: '', date: '', time: '', busy: false });
  const submitRequest = async () => {
    if (!reqModal.session?.id) return;
    const id = String(reqModal.session.id);
    if (!reqModal.reason.trim()) {
      return window.showNotification?.({ type: 'error', title: 'Reason required', message: 'Please enter a short reason.' });
    }
    setReqModal(m => ({ ...m, busy: true }));
    try {
      const payload = { session_id: reqModal.session.id, reason: reqModal.reason.trim() };
      if (reqModal.date && reqModal.time) { payload.requested_date = reqModal.date; payload.requested_time = reqModal.time; }
      await RescheduleRequests.create(payload);
      setPendingMap(m => ({ ...m, [id]: true }));
      window.showNotification?.({ type: 'success', title: 'Request sent' });
      closeRequestModal();
    } catch (e) {
      window.showNotification?.({ type: 'error', title: 'Failed', message: e?.message || 'Unable to send request' });
      setReqModal(m => ({ ...m, busy: false }));
    }
  };

  const confirmProposed = async (s) => {
    if (!s?.id) return;
    try {
      await TherapySession.update(s.id, { status: 'scheduled' });
      setSessions(ss => ss.map(x => x.id === s.id ? { ...x, status: 'scheduled' } : x));
      window.showNotification?.({ type: 'success', title: 'Confirmed' });
    } catch (e) {
      window.showNotification?.({ type: 'error', title: 'Failed', message: e?.message || 'Unable to confirm' });
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 w-64 rounded" />
        <div className="h-24 bg-gray-200 rounded-2xl" />
        <div className="h-96 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Schedule</h1>
            </div>
            <p className="text-gray-500">View therapies scheduled by your doctor with date & time</p>
            <div className="mt-2"><Badge color="purple">Therapist: {therapistName}</Badge></div>
          </div>
        </div>
        {upcoming && (
          <div className="hidden md:flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
            <span className="text-sm text-gray-500">Next</span>
            <Badge>{String(upcoming.scheduled_date)}</Badge>
            <Badge color="gray">{upcoming.scheduled_time || "--:--"}</Badge>
            <Badge color="green" >{String(upcoming.therapy_type || "therapy").replace(/_/g, " ")}</Badge>
            <Badge color="purple">Therapist: {upcoming.therapist_name || therapistName}</Badge>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
        <span className="mr-2">Legend:</span>
        <Badge color="blue">Scheduled</Badge>
        <Badge color="orange">In Progress</Badge>
        <Badge color="green">Completed</Badge>
      </div>

      {/* Schedule list grouped by date */}
      <div className="space-y-5">
        {grouped.size === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-500">No sessions scheduled yet.</div>
        ) : Array.from(grouped.entries()).map(([date, items]) => (
          <div key={date} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-semibold text-gray-800">{date}</span>
              </div>
              <span className="text-xs text-gray-500">{items.length} session{items.length>1?"s":""}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {items.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Badge color={statusColor(s.status)}>{s.status?.replace(/_/g, " ") || "scheduled"}</Badge>
                    <div className="text-sm text-gray-900 font-medium capitalize">{String(s.therapy_type || 'therapy').replace(/_/g, ' ')}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{s.scheduled_time || "--:--"}</span>
                    </div>
                    <Badge color="gray">{s.room_number || s.room_name || s.room || "Room"}</Badge>
                    <Badge color="purple">Therapist: {s.therapist_name || therapistName}</Badge>
                    {s.status === 'scheduled' && (
                      <button
                        onClick={() => openRequestModal(s)}
                        disabled={!!pendingMap[String(s.id)]}
                        className={`px-2 py-1 text-xs rounded border ${pendingMap[String(s.id)] ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >{pendingMap[String(s.id)] ? 'Requested' : 'Request reschedule'}</button>
                    )}
                    {s.status === 'awaiting_confirmation' && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => confirmProposed(s)} className="px-2 py-1 text-xs rounded bg-emerald-600 text-white">Confirm</button>
                        <button onClick={() => openRequestModal(s)} className="px-2 py-1 text-xs rounded border">Request change</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <Info className="w-4 h-4 text-blue-600 mt-0.5" />
        <div>
          Sessions are assigned by your clinic. If you need changes, please contact the front desk.
        </div>
      </div>

      {reqModal.open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Request reschedule</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Reason</label>
                <textarea value={reqModal.reason} onChange={(e)=>setReqModal(m=>({...m, reason: e.target.value}))} className="w-full px-3 py-2 border rounded-lg" rows={3} placeholder="Why do you need a change?" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Preferred date (optional)</label>
                  <input type="date" value={reqModal.date} onChange={(e)=>setReqModal(m=>({...m, date: e.target.value}))} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Preferred time (optional)</label>
                  <input type="time" value={reqModal.time} onChange={(e)=>setReqModal(m=>({...m, time: e.target.value}))} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={closeRequestModal} disabled={reqModal.busy} className="px-4 py-2 rounded border">Cancel</button>
                <button onClick={submitRequest} disabled={reqModal.busy} className="px-4 py-2 rounded bg-gradient-to-r from-blue-600 to-indigo-600 text-white disabled:opacity-50">{reqModal.busy ? 'Sending...' : 'Send request'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
