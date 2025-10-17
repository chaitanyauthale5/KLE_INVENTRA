import React, { useEffect, useMemo, useState } from 'react';
import { Appointments, Hospital, User } from '@/services';
import { Calendar, Plus, Clock, Users, CheckCircle2, XCircle, ArrowRightLeft } from 'lucide-react';

export default function PatientAppointments({ currentUser }) {
  const [effectiveUser, setEffectiveUser] = useState(currentUser);
  const [hospitals, setHospitals] = useState([]);
  const [staff, setStaff] = useState([]); // doctors + therapists of hospital
  const [form, setForm] = useState({ hospital_id: '', staff_id: '', type: 'doctor', start_time: '', end_time: '', notes: '' });
  const [mine, setMine] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      let me = currentUser;
      if (!me) me = await User.me();
      setEffectiveUser(me);
      if (!me) return;

      // Load hospitals and staff
      const hs = await Hospital.list();
      setHospitals(hs);
      const myHospital = me.hospital_id || (hs[0]?.id || '');
      setForm((f) => ({ ...f, hospital_id: myHospital }));
      if (myHospital) {
        const st = await Hospital.listStaff(myHospital);
        setStaff(st);
      }
      await reloadMine();
      setIsLoading(false);
    })();
  }, [currentUser]);

  // Reload staff when hospital changes
  useEffect(() => {
    (async () => {
      if (form.hospital_id) {
        const st = await Hospital.listStaff(form.hospital_id);
        setStaff(st);
        // Reset selected staff when hospital changes
        setForm((f) => ({ ...f, staff_id: '' }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.hospital_id]);

  const reloadMine = async () => {
    const list = await Appointments.mine();
    setMine(list);
  };

  const doctors = useMemo(() => staff.filter(s => s.role === 'doctor'), [staff]);
  const therapists = useMemo(() => staff.filter(s => s.role === 'therapist'), [staff]);

  const upcoming = mine.filter(a => new Date(a.start_time) >= new Date());
  const past = mine.filter(a => new Date(a.start_time) < new Date());

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleBook = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!form.hospital_id || !form.staff_id || !form.start_time || !form.end_time) {
        throw new Error('Please fill all required fields');
      }
      await Appointments.book({ ...form });
      window.showNotification?.({ type: 'success', title: 'Appointment Requested', message: 'Your appointment has been created.' });
      setForm((f) => ({ ...f, staff_id: '', start_time: '', end_time: '', notes: '' }));
      await reloadMine();
    } catch (e1) {
      window.showNotification?.({ type: 'error', title: 'Failed', message: e1?.details?.message || e1?.message || 'Could not create appointment' });
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    await Appointments.cancel(id);
    await reloadMine();
  };

  const reschedule = async (id) => {
    const start = prompt('New start time (YYYY-MM-DD HH:mm)');
    if (!start) return;
    const end = prompt('New end time (YYYY-MM-DD HH:mm)');
    if (!end) return;
    await Appointments.reschedule(id, { start_time: new Date(start), end_time: new Date(end) });
    await reloadMine();
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-gray-200 rounded-2xl"></div>
          <div className="h-48 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Appointments</h1>
            <p className="text-gray-500">Book with doctors and therapists, view upcoming and past visits</p>
          </div>
        </div>
      </div>

      {/* Booking Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
        <form onSubmit={handleBook} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hospital</label>
            <select name="hospital_id" value={form.hospital_id} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl">
              <option value="">Select Hospital</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select name="type" value={form.type} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl">
              <option value="doctor">Doctor</option>
              <option value="therapist">Therapist</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{form.type === 'doctor' ? 'Doctor' : 'Therapist'}</label>
            <select name="staff_id" value={form.staff_id} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl">
              <option value="">Select {form.type}</option>
              {(form.type === 'doctor' ? doctors : therapists).map(s => (
                <option key={s.id} value={s.id}>{s.full_name || s.name} ({s.email})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
              <input type="datetime-local" name="start_time" value={form.start_time} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
              <input type="datetime-local" name="end_time" value={form.end_time} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl" />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl" placeholder="Any specific concerns or preferences..." />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-green-600 text-white flex items-center gap-2 disabled:opacity-50">
              <Plus className="w-4 h-4" /> {saving ? 'Booking...' : 'Book Appointment'}
            </button>
          </div>
        </form>
      </div>

      {/* Staff Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Doctors List */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Doctors at this hospital</h2>
            <span className="text-sm text-gray-500">{doctors.length} total</span>
          </div>
          <div className="space-y-3 max-h-[360px] overflow-auto pr-1">
            {doctors.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                <div>
                  <div className="font-medium text-gray-900">{d.full_name || d.name}</div>
                  <div className="text-xs text-gray-500">{d.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, staff_id: d.id, type: 'doctor' }))}
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm"
                >Quick Book</button>
              </div>
            ))}
            {doctors.length === 0 && <div className="text-gray-500 text-sm">No doctors found for this hospital.</div>}
          </div>
        </div>

        {/* Therapists List */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Therapists at this hospital</h2>
            <span className="text-sm text-gray-500">{therapists.length} total</span>
          </div>
          <div className="space-y-3 max-h-[360px] overflow-auto pr-1">
            {therapists.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                <div>
                  <div className="font-medium text-gray-900">{t.full_name || t.name}</div>
                  <div className="text-xs text-gray-500">{t.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, staff_id: t.id, type: 'therapist' }))}
                  className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm"
                >Quick Book</button>
              </div>
            ))}
            {therapists.length === 0 && <div className="text-gray-500 text-sm">No therapists found for this hospital.</div>}
          </div>
        </div>
      </div>

      {/* Upcoming */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Clock className="w-5 h-5" /> Upcoming</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcoming.map(a => (
            <div key={a.id} className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900">{a.type === 'doctor' ? 'Doctor' : 'Therapist'} Visit</div>
                <div className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 capitalize">{a.status}</div>
              </div>
              <div className="text-gray-600 text-sm mt-1">{new Date(a.start_time).toLocaleString()} - {new Date(a.end_time).toLocaleTimeString()}</div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => reschedule(a.id)} className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 flex items-center gap-1 text-sm"><ArrowRightLeft className="w-4 h-4" /> Reschedule</button>
                <button onClick={() => cancel(a.id)} className="px-3 py-2 rounded-lg bg-red-50 text-red-700 flex items-center gap-1 text-sm"><XCircle className="w-4 h-4" /> Cancel</button>
              </div>
            </div>
          ))}
          {upcoming.length === 0 && <div className="text-gray-500">No upcoming appointments.</div>}
        </div>
      </div>

      {/* Past */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Past</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {past.map(a => (
            <div key={a.id} className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900">{a.type === 'doctor' ? 'Doctor' : 'Therapist'} Visit</div>
                <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">{a.status}</div>
              </div>
              <div className="text-gray-600 text-sm mt-1">{new Date(a.start_time).toLocaleString()} - {new Date(a.end_time).toLocaleTimeString()}</div>
            </div>
          ))}
          {past.length === 0 && <div className="text-gray-500">No past appointments.</div>}
        </div>
      </div>
    </div>
  );
}
