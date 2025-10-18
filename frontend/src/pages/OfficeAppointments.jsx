import { useEffect, useState } from 'react';
import { User, Hospital, Patient, Appointments, Prescription } from '@/services';
import { Calendar as CalendarIcon } from 'lucide-react';

export default function OfficeAppointments({ currentUser }) {
  const [me, setMe] = useState(currentUser);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ patientId: '', doctorId: '', date: '', time: '', duration: 30, notes: '' });
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => { (async () => { if (!me) setMe(await User.me().catch(()=>null)); })(); }, [me]);

  useEffect(() => {
    (async () => {
      const user = me || await User.me().catch(()=>null);
      if (!user?.hospital_id) { setPatients([]); setDoctors([]); return; }
      try {
        const [pts, staff] = await Promise.all([
          Patient.filter({ hospital_id: user.hospital_id }).catch(()=>[]),
          Hospital.listStaff(user.hospital_id).catch(()=>[]),
        ]);
        setPatients(pts || []);
        setDoctors((staff || []).filter(u => u.role === 'doctor'));
      } catch {
        setPatients([]); setDoctors([]);
      }
    })();
  }, [me]);

  // Load prescriptions for selected patient from backend
  useEffect(() => {
    (async () => {
      try {
        if (!form.patientId) { setPrescriptions([]); return; }
        const list = await Prescription.list({ patient_id: form.patientId });
        setPrescriptions(Array.isArray(list) ? list : []);
      } catch {
        setPrescriptions([]);
      }
    })();
  }, [form.patientId]);

  const handleBook = async (e) => {
    e?.preventDefault?.();
    const user = me || await User.me().catch(()=>null);
    if (!user?.hospital_id) return window.showNotification?.({ type: 'error', title: 'Clinic missing', message: 'Your account is not linked to a clinic.' });
    if (!form.patientId || !form.doctorId || !form.date || !form.time) return window.showNotification?.({ type: 'error', title: 'Missing details', message: 'Select patient, doctor, date and time.' });
    try {
      setBusy(true);
      const start = new Date(`${form.date}T${form.time}:00`);
      const end = new Date(start.getTime() + (Number(form.duration) || 30) * 60000);
      await Appointments.book({
        hospital_id: user.hospital_id,
        staff_id: form.doctorId,
        type: 'doctor',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        notes: form.notes || `Booked by ${user.full_name || 'staff'}`,
        patient_user_id: (patients.find(p=>String(p.id)===String(form.patientId))?.user_id) || undefined,
        patient_record_id: form.patientId,
      });
      window.showNotification?.({ type: 'success', title: 'Appointment booked', message: 'The appointment has been created.' });
      setForm({ patientId: '', doctorId: '', date: '', time: '', duration: 30, notes: '' });
    } catch (err) {
      window.showNotification?.({ type: 'error', title: 'Booking failed', message: err?.message || 'Unable to create appointment' });
    } finally { setBusy(false); }
  };

  // Removed inline new patient creation to avoid duplicates. Use Patient Management to add patients.

  return (
    <div className="p-6 md:p-8 space-y-6 bg-gradient-to-br from-blue-50 via-green-50 to-purple-50 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
          <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 text-xs md:text-base">Book appointments for patients with specific doctors</p>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-4 md:p-6 shadow-md border border-white/60">
        <form onSubmit={handleBook} className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-600 mb-1">Patient</label>
            <select value={form.patientId} onChange={(e)=>setForm(f=>({ ...f, patientId: e.target.value }))} className="w-full px-3 py-2 bg-white/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300">
              <option value="">Select patient</option>
              {patients.map(p => (<option key={p.id} value={p.id}>{p.full_name || p.name}</option>))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-600 mb-1">Doctor</label>
            <select value={form.doctorId} onChange={(e)=>setForm(f=>({ ...f, doctorId: e.target.value }))} className="w-full px-3 py-2 bg-white/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300">
              <option value="">Select doctor</option>
              {doctors.map(d => (<option key={d.id} value={d.id}>{d.full_name || d.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Date</label>
            <input type="date" value={form.date} onChange={(e)=>setForm(f=>({ ...f, date: e.target.value }))} className="w-full px-3 py-2 bg-white/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Time</label>
            <input type="time" value={form.time} onChange={(e)=>setForm(f=>({ ...f, time: e.target.value }))} className="w-full px-3 py-2 bg-white/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Duration (min)</label>
            <input type="number" min="10" step="5" value={form.duration} onChange={(e)=>setForm(f=>({ ...f, duration: e.target.value }))} className="w-full px-3 py-2 bg-white/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div className="md:col-span-6">
            <label className="block text-xs text-gray-600 mb-1">Notes</label>
            <input type="text" value={form.notes} onChange={(e)=>setForm(f=>({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 bg-white/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Optional notes" />
          </div>
          <div className="md:col-span-6 flex justify-end">
            <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-green-600 text-white disabled:opacity-50">{busy ? 'Booking...' : 'Book Appointment'}</button>
          </div>
        </form>
      </div>

      {/* Prescription & Records (Read-only for selected patient) */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-4 md:p-6 shadow-md border border-white/60 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base md:text-lg font-semibold text-gray-800">Prescription & Records</h2>
          <div className="text-sm text-gray-500">{prescriptions.length} total</div>
        </div>
        {(!form.patientId) && (
          <div className="text-sm text-gray-500">Select a patient to view their prescriptions.</div>
        )}
        {(form.patientId && prescriptions.length === 0) && (
          <div className="text-sm text-gray-500">No prescriptions found for this patient.</div>
        )}
        {form.patientId && prescriptions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Doctor</th>
                  <th className="py-2 pr-4">Complaints</th>
                  <th className="py-2 pr-4">Medicines</th>
                  <th className="py-2 pr-4">Therapies</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {prescriptions.map((p, idx) => (
                  <tr key={p.id || idx}>
                    <td className="py-2 pr-4">{new Date(p.date || p.created_at).toLocaleDateString()}</td>
                    <td className="py-2 pr-4">{p.doctor_name || '-'}</td>
                    <td className="py-2 pr-4">{p.complaints || '-'}</td>
                    <td className="py-2 pr-4">{(p.meds||[]).map(m=>m.name).filter(Boolean).join(', ')}</td>
                    <td className="py-2 pr-4">{(p.therapies||[]).map(t=>t.name).filter(Boolean).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
