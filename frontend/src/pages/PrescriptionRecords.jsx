import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardPlus, Download, FileText, Printer, Search, Trash2 } from 'lucide-react';
import { User, Patient, Prescription, Hospital } from '@/services';

// backend persistence via Prescription service

export default function PrescriptionRecords() {
  const [me, setMe] = useState(null);
  const [role, setRole] = useState('guest');
  const [patientOptions, setPatientOptions] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const canWrite = role === 'doctor' || role === 'clinic_admin' || role === 'super_admin' || role === 'office_executive';

  // form state (includes Panchakarma-specific fields)
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0,10),
    complaints: '',
    advice: '',
    meds: [ { name: '', dosage: '', frequency: '', duration: '' } ],
    therapies: [ { name: '', duration: '', frequency: '' } ],
    pk_plan: {
      procedures: '', // e.g., Abhyanga, Swedana
      oils: '',       // e.g., Dashmool Taila
      basti: '',      // e.g., Niruha/Anuvasan
      diet: '',       // Pathya-Apathya
    },
    clinical: {
      vitals: { bp: '', pulse: '', temp: '', spo2: '' },
      diagnosis: '',
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      follow_up: '', // date
      consent: false,
    }
  });

  // fetch current user and patient list (if doctor/admin)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const u = await User.me();
        setMe(u || null);
        const r = u?.role || 'guest';
        setRole(r);
        if (r === 'patient') {
          const p = await Patient.me();
          if (p) {
            setSelectedPatientId(p.id);
            setSelectedPatientName(p.full_name || p.name || 'You');
          }
        } else {
          // Load from Patient Management records, clinic-scoped by backend
          let pts = [];
          try {
            if (Patient && typeof Patient.withRecords === 'function') {
              pts = await Patient.withRecords({});
            } else if (Patient && typeof Patient.list === 'function') {
              pts = await Patient.list();
            }
          } catch (e) { console.warn('PrescriptionRecords: loading patients failed', e); }
          const mapped = (pts || []).map(p => ({ id: p.id || p._id, name: p.full_name || p.name || 'Patient', email: p.email }));
          setPatientOptions(mapped);
          if (mapped.length === 1) { setSelectedPatientId(mapped[0].id); setSelectedPatientName(mapped[0].name); }
          // Load therapists to support plan-assigned staff selection
          try {
            if (u?.hospital_id) {
              const staff = await Hospital.listStaff(u.hospital_id);
              setStaffOptions((staff || []).filter(s => String(s.role) === 'therapist').map(s => ({ id: s.id, name: s.full_name || s.name || 'Therapist' })));
            }
          } catch (e) { console.warn('PrescriptionRecords: load staff failed', e); }
        }
      } finally { setLoading(false); }
    })();
  }, []);

  // Auto-select when search narrows to a single option
  useEffect(() => {
    if (!patientSearch) return;
    const q = patientSearch.trim().toLowerCase();
    const filtered = patientOptions.filter(p => (p.name||'').toLowerCase().includes(q) || String(p.id||'').toLowerCase().includes(q));
    if (filtered.length === 1) {
      const only = filtered[0];
      if (only.id !== selectedPatientId) {
        setSelectedPatientId(only.id);
        setSelectedPatientName(only.name);
      }
    }
  }, [patientSearch, patientOptions, selectedPatientId]);

  // Debounced server-side search using Patient.filter
  useEffect(() => {
    let t;
    const run = async () => {
      const q = patientSearch.trim();
      if (!q) return; // keep current options
      try {
        if (Patient && typeof Patient.filter === 'function') {
          const res = await Patient.filter({ name: q });
          const mapped = (res || []).map(p => ({ id: p.id || p._id, name: p.full_name || p.name || 'Patient', email: p.email }));
          setPatientOptions(mapped);
        }
      } catch (e) { console.warn('PrescriptionRecords: Patient.filter failed', e); }
    };
    t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  // Fetch prescription records
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        if (role === 'patient') {
          const mine = await Prescription.mine();
          const p = await Patient.me();
          const pid = String(p?.id || '');
          const scoped = (mine || []).filter(r => String(r?.patient_id?._id || r?.patient_id) === pid);
          setRecords(scoped);
        } else {
          const q = {};
          if (selectedPatientId) q.patient_id = selectedPatientId;
          const list = await Prescription.list(q);
          setRecords(Array.isArray(list) ? list : []);
        }
      } catch (e) {
        console.warn('Load prescriptions failed', e);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedPatientId, me?.hospital_id, role]);

  // One-time migration from localStorage to backend if needed
  useEffect(() => {
    (async () => {
      if (!canWrite) return;
      try {
        const migrated = sessionStorage.getItem('ayursutra_prescriptions_migrated');
        if (migrated === '1') return;
        if (records.length > 0) return; // already have data in DB
        const raw = localStorage.getItem('ayursutra_prescriptions_v1');
        const local = JSON.parse(raw || '[]');
        const items = Array.isArray(local) ? local : [];
        const mine = me?.hospital_id ? items.filter(x => x.hospital_id === me.hospital_id) : items;
        if (mine.length === 0) return;
        // Migrate up to 50 recent entries to avoid long operations
        const batch = mine.slice(0, 50);
        for (const entry of batch) {
          try {
            await Prescription.create({
              date: entry.date || entry.created_at,
              complaints: entry.complaints,
              advice: entry.advice,
              meds: Array.isArray(entry.meds) ? entry.meds : [],
              therapies: Array.isArray(entry.therapies) ? entry.therapies : [],
              patient_id: entry.patient_id,
              patient_name: entry.patient_name,
            });
          } catch (e) { /* ignore individual failure */ }
        }
        sessionStorage.setItem('ayursutra_prescriptions_migrated', '1');
        const q = selectedPatientId ? { patient_id: selectedPatientId } : {};
        const list = await Prescription.list(q);
        setRecords(Array.isArray(list) ? list : []);
      } catch { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records.length, canWrite, selectedPatientId, me?.hospital_id]);

  

  const addMedRow = () => setForm(f => ({ ...f, meds: [...f.meds, { name: '', dosage: '', frequency: '', duration: '' }] }));
  const removeMedRow = (i) => setForm(f => ({ ...f, meds: f.meds.filter((_, idx) => idx !== i) }));
  const updateMed = (i, key, val) => setForm(f => ({ ...f, meds: f.meds.map((m, idx) => idx===i? { ...m, [key]: val } : m) }));

  // Therapies dynamic rows
  const addTherapyRow = () => setForm(f => ({ ...f, therapies: [...(f.therapies||[]), { name: '', duration: '', frequency: '' }] }));
  const removeTherapyRow = (i) => setForm(f => ({ ...f, therapies: (f.therapies||[]).filter((_, idx) => idx !== i) }));
  const updateTherapy = (i, key, val) => setForm(f => ({ ...f, therapies: (f.therapies||[]).map((t, idx) => idx===i? { ...t, [key]: val } : t) }));

  const handleSave = async () => {
    if (!selectedPatientId) { window.showNotification?.({ type: 'error', title: 'Prescription', message: 'Select a patient first.' }); return; }
    // Basic client-side validation to prevent bad requests
    if (form?.clinical?.follow_up) {
      const re = /^\d{4}-\d{2}-\d{2}$/;
      if (!re.test(form.clinical.follow_up)) {
        window.showNotification?.({ type: 'error', title: 'Prescription', message: 'Follow Up date must be in YYYY-MM-DD format.' });
        return;
      }
    }
    try {
      setLoading(true);
      await Prescription.create({
        date: form.date,
        complaints: form.complaints,
        advice: form.advice,
        meds: form.meds,
        therapies: form.therapies,
        pk_plan: form.pk_plan,
        clinical: form.clinical,
        patient_id: selectedPatientId,
        patient_name: selectedPatientName,
      });
      window.showNotification?.({ type: 'success', title: 'Prescription', message: 'Saved successfully.' });
      setForm({
        date: new Date().toISOString().slice(0,10), complaints: '', advice: '',
        meds: [ { name: '', dosage: '', frequency: '', duration: '' } ],
        therapies: [ { name: '', duration: '', frequency: '' } ],
        pk_plan: { procedures: '', oils: '', basti: '', diet: '' },
        clinical: { vitals: { bp: '', pulse: '', temp: '', spo2: '' }, diagnosis: '', subjective: '', objective: '', assessment: '', plan: '', follow_up: '', consent: false },
      });
      const list = await Prescription.list(selectedPatientId ? { patient_id: selectedPatientId } : {});
      setRecords(Array.isArray(list) ? list : []);
    } catch (e) {
      window.showNotification?.({ type: 'error', title: 'Prescription', message: e?.message || 'Failed to save' });
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (id) => {
    try {
      await Prescription.delete(id);
      const list = await Prescription.list(selectedPatientId ? { patient_id: selectedPatientId } : {});
      setRecords(Array.isArray(list) ? list : []);
      window.showNotification?.({ type: 'success', title: 'Prescription', message: 'Deleted.' });
    } catch (e) {
      window.showNotification?.({ type: 'error', title: 'Prescription', message: e?.message || 'Delete failed' });
    }
  };

  const printEntry = (entry) => {
    const doc = window.open('', '_blank');
    if (!doc) return;
    doc.document.write(`<!doctype html><html><head><title>Prescription</title><style>
      body{font-family:Inter,system-ui,sans-serif;padding:24px}
      h1{font-size:20px;margin:0 0 8px}
      .muted{color:#6b7280}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}
    </style></head><body>`);
    doc.document.write(`<h1>Prescription</h1>
      <div class="muted">${new Date(entry.date || entry.created_at || entry.createdAt).toLocaleString()}</div>
      <div><strong>Patient:</strong> ${entry.patient_name || entry.patient_id}</div>
      <div><strong>Doctor:</strong> ${entry.doctor_name || ''}</div>
      <hr/>
      <div><strong>Complaints:</strong><br/>${(entry.complaints||'').replace(/\n/g,'<br/>')}</div>
      <div style="margin-top:8px"><strong>Advice:</strong><br/>${(entry.advice||'').replace(/\n/g,'<br/>')}</div>
      <table><thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
      <tbody>${(entry.meds||[]).map(m=>`<tr><td>${m.name||''}</td><td>${m.dosage||''}</td><td>${m.frequency||''}</td><td>${m.duration||''}</td></tr>`).join('')}</tbody></table>`);
    // Therapies table
    if ((entry.therapies||[]).length) {
      doc.document.write('<h2 style="margin-top:12px">Therapies</h2>');
      doc.document.write('<table><thead><tr><th>Therapy</th><th>Duration</th><th>Frequency</th></tr></thead><tbody>');
      doc.document.write((entry.therapies||[]).map(t=>`<tr><td>${t.name||''}</td><td>${t.duration||''}</td><td>${t.frequency||''}</td></tr>`).join(''));
      doc.document.write('</tbody></table>');
    }
    doc.document.write('</body></html>');
    doc.document.close();
    doc.focus();
    doc.print();
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Prescription & Records</h1>
            <p className="text-gray-500 text-sm">Create and view patient prescriptions. Patients can see their own prescriptions only.</p>
          </div>
        </div>
        <Link to="/DoctorDashboard" className="hidden md:inline-flex text-sm px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">Back to Dashboard</Link>
      </div>

      {/* Patient scope */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
        {role === 'patient' ? (
          <div className="text-sm text-gray-600">Viewing your records{selectedPatientName?` for ${selectedPatientName}`:''}.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  className="w-full pl-10 pr-4 py-2 border rounded-xl"
                  value={patientSearch}
                  onChange={(e)=>setPatientSearch(e.target.value)}
                  placeholder="Search patient by name or ID"
                />
              </div>
              <select
                className="mt-2 w-full px-3 py-2 border rounded-xl bg-white"
                value={selectedPatientId}
                onChange={(e)=>{
                  const id = e.target.value; setSelectedPatientId(id);
                  const obj = patientOptions.find(p=>String(p.id)===String(id)); setSelectedPatientName(obj?.name||'');
                }}
              >
                <option value="">Select patient...</option>
                {patientOptions
                  .filter(p=>{
                    const q = patientSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (p.name||'').toLowerCase().includes(q) || String(p.id||'').toLowerCase().includes(q);
                  })
                  .map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
              </select>
            </div>
            <div className="text-sm text-gray-500">{selectedPatientId?`Selected: ${selectedPatientName}`:'No patient selected'}</div>
          </div>
        )}
      </div>

      {/* Create form (doctors/admins only) */}
      {canWrite && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><ClipboardPlus className="w-4 h-4 text-indigo-600"/> New Prescription</h2>
            <button className="px-3 py-1.5 rounded-md bg-blue-600 text-white disabled:opacity-50" disabled={!selectedPatientId} onClick={handleSave}>Save</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500">Date</label>
              <input type="date" className="w-full px-3 py-2 border rounded-lg" value={form.date} onChange={e=>setForm(f=>({...f, date:e.target.value}))} />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-gray-500">Complaints</label>
              <input className="w-full px-3 py-2 border rounded-lg" value={form.complaints} onChange={e=>setForm(f=>({...f, complaints:e.target.value}))} placeholder="e.g., lower back pain, headache" />
            </div>
          </div>
          {/* Therapies first for visibility */}
          <div className="mt-3">
            <label className="text-xs text-gray-500">Therapies</label>
            <div className="space-y-2">
              {(form.therapies||[]).map((t,i)=> (
                <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <input className="px-3 py-2 border rounded-lg" placeholder="Therapy Name" value={t.name} onChange={e=>updateTherapy(i,'name',e.target.value)} />
                  <input className="px-3 py-2 border rounded-lg" placeholder="Duration (e.g., 45 min / 10 days)" value={t.duration} onChange={e=>updateTherapy(i,'duration',e.target.value)} />
                  <input className="px-3 py-2 border rounded-lg" placeholder="Frequency (e.g., 2x/day)" value={t.frequency} onChange={e=>updateTherapy(i,'frequency',e.target.value)} />
                  <button className="px-3 py-2 rounded-lg border hover:bg-gray-50" onClick={()=>removeTherapyRow(i)}><Trash2 className="w-4 h-4"/></button>
                  <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-8 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500">Plan sessions</label>
                      <input type="number" min="0" className="w-full px-3 py-2 border rounded-lg" value={t.plan_sessions||0} onChange={e=>updateTherapy(i,'plan_sessions', Number(e.target.value)||0)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Interval (days)</label>
                      <input type="number" min="1" className="w-full px-3 py-2 border rounded-lg" value={t.plan_interval_days||1} onChange={e=>updateTherapy(i,'plan_interval_days', Number(e.target.value)||1)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Start date</label>
                      <input type="date" className="w-full px-3 py-2 border rounded-lg" value={t.plan_start_date||''} onChange={e=>updateTherapy(i,'plan_start_date', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Duration (min)</label>
                      <input type="number" min="0" className="w-full px-3 py-2 border rounded-lg" value={t.plan_duration_min||''} onChange={e=>updateTherapy(i,'plan_duration_min', Number(e.target.value)||0)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Preferred time</label>
                      <input type="time" className="w-full px-3 py-2 border rounded-lg" value={t.plan_preferred_time||''} onChange={e=>updateTherapy(i,'plan_preferred_time', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] text-gray-500">Preferred days</label>
                      <div className="flex flex-wrap gap-1">
                        {['mon','tue','wed','thu','fri','sat','sun'].map(d=>(
                          <button type="button" key={d} onClick={() => {
                            const arr = Array.isArray(t.plan_preferred_days)? t.plan_preferred_days.slice() : [];
                            const idx = arr.indexOf(d); if (idx>=0) arr.splice(idx,1); else arr.push(d);
                            updateTherapy(i,'plan_preferred_days', arr);
                          }} className={`px-2 py-1 text-xs rounded-full border ${Array.isArray(t.plan_preferred_days)&&t.plan_preferred_days.includes(d)?'bg-blue-600 text-white border-blue-600':'bg-white'}`}>{d.toUpperCase()}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Assigned therapist</label>
                      <select className="w-full px-3 py-2 border rounded-lg" value={t.plan_assigned_staff_id||''} onChange={e=>updateTherapy(i,'plan_assigned_staff_id', e.target.value)}>
                        <option value="">Auto-assign</option>
                        {staffOptions.map(s=> (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] text-gray-500">Plan notes</label>
                      <input className="w-full px-3 py-2 border rounded-lg" value={t.plan_notes||''} onChange={e=>updateTherapy(i,'plan_notes', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
              <button className="px-3 py-1.5 rounded-md border" onClick={addTherapyRow}>+ Add therapy</button>
            </div>
          </div>
          {/* Medicines after therapies */}
          <div className="mt-3">
            <label className="text-xs text-gray-500">Medicines</label>
            <div className="space-y-2">
              {form.meds.map((m,i)=> (
                <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <input className="px-3 py-2 border rounded-lg" placeholder="Medicine" value={m.name} onChange={e=>updateMed(i,'name',e.target.value)} />
                  <input className="px-3 py-2 border rounded-lg" placeholder="Dosage" value={m.dosage} onChange={e=>updateMed(i,'dosage',e.target.value)} />
                  <input className="px-3 py-2 border rounded-lg" placeholder="Frequency" value={m.frequency} onChange={e=>updateMed(i,'frequency',e.target.value)} />
                  <input className="px-3 py-2 border rounded-lg" placeholder="Duration" value={m.duration} onChange={e=>updateMed(i,'duration',e.target.value)} />
                  <button className="px-3 py-2 rounded-lg border hover:bg-gray-50" onClick={()=>removeMedRow(i)}><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
              <button className="px-3 py-1.5 rounded-md border" onClick={addMedRow}>+ Add medicine</button>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-gray-500">Advice / Notes</label>
            <textarea rows={3} className="w-full px-3 py-2 border rounded-lg" value={form.advice} onChange={e=>setForm(f=>({...f, advice:e.target.value}))} />
          </div>
          {/* Panchakarma Plan */}
          <div className="mt-3">
            <label className="text-xs text-gray-500">Panchakarma Plan</label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-1">
              <input className="px-3 py-2 border rounded-lg" placeholder="Procedures (e.g., Abhyanga, Swedana)" value={form.pk_plan.procedures} onChange={e=>setForm(f=>({...f, pk_plan:{...f.pk_plan, procedures:e.target.value}}))} />
              <input className="px-3 py-2 border rounded-lg" placeholder="Oils/Decoctions" value={form.pk_plan.oils} onChange={e=>setForm(f=>({...f, pk_plan:{...f.pk_plan, oils:e.target.value}}))} />
              <input className="px-3 py-2 border rounded-lg" placeholder="Basti/Other" value={form.pk_plan.basti} onChange={e=>setForm(f=>({...f, pk_plan:{...f.pk_plan, basti:e.target.value}}))} />
              <input className="px-3 py-2 border rounded-lg" placeholder="Diet & Lifestyle" value={form.pk_plan.diet} onChange={e=>setForm(f=>({...f, pk_plan:{...f.pk_plan, diet:e.target.value}}))} />
            </div>
          </div>
          {/* Clinical Details */}
          <div className="mt-3">
            <label className="text-xs text-gray-500">Clinical</label>
            <div className="grid grid-cols-2 md:grid-cols-8 gap-2 mt-1">
              <input className="px-3 py-2 border rounded-lg" placeholder="BP" value={form.clinical.vitals.bp} onChange={e=>setForm(f=>({...f, clinical:{...f.clinical, vitals:{...f.clinical.vitals, bp:e.target.value}}}))} />
              <input className="px-3 py-2 border rounded-lg" placeholder="Pulse" value={form.clinical.vitals.pulse} onChange={e=>setForm(f=>({...f, clinical:{...f.clinical, vitals:{...f.clinical.vitals, pulse:e.target.value}}}))} />
              <input className="px-3 py-2 border rounded-lg" placeholder="Temp" value={form.clinical.vitals.temp} onChange={e=>setForm(f=>({...f, clinical:{...f.clinical, vitals:{...f.clinical.vitals, temp:e.target.value}}}))} />
              <input className="px-3 py-2 border rounded-lg" placeholder="SpO₂" value={form.clinical.vitals.spo2} onChange={e=>setForm(f=>({...f, clinical:{...f.clinical, vitals:{...f.clinical.vitals, spo2:e.target.value}}}))} />
              <input className="px-3 py-2 border rounded-lg md:col-span-2" placeholder="Diagnosis" value={form.clinical.diagnosis} onChange={e=>setForm(f=>({...f, clinical:{...f.clinical, diagnosis:e.target.value}}))} />
              <input className="px-3 py-2 border rounded-lg md:col-span-2" placeholder="Follow Up (YYYY-MM-DD)" value={form.clinical.follow_up} onChange={e=>setForm(f=>({...f, clinical:{...f.clinical, follow_up:e.target.value}}))} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <textarea rows={2} className="w-full px-3 py-2 border rounded-lg" placeholder="Subjective" value={form.clinical.subjective} onChange={e=>setForm(f=>({...f, clinical:{...f.clinical, subjective:e.target.value}}))} />
              <textarea rows={2} className="w-full px-3 py-2 border rounded-lg" placeholder="Objective" value={form.clinical.objective} onChange={e=>setForm(f=>({...f, clinical:{...f.clinical, objective:e.target.value}}))} />
              <textarea rows={2} className="w-full px-3 py-2 border rounded-lg" placeholder="Assessment" value={form.clinical.assessment} onChange={e=>setForm(f=>({...f, clinical:{...f.clinical, assessment:e.target.value}}))} />
              <textarea rows={2} className="w-full px-3 py-2 border rounded-lg" placeholder="Plan" value={form.clinical.plan} onChange={e=>setForm(f=>({...f, clinical:{...f.clinical, plan:e.target.value}}))} />
            </div>
            <label className="inline-flex items-center gap-2 mt-2 text-sm">
              <input type="checkbox" className="accent-blue-600" checked={!!form.clinical.consent} onChange={e=>setForm(f=>({...f, clinical:{...f.clinical, consent:e.target.checked}}))} /> Consent obtained
            </label>
          </div>
      </div>
    )}

    {/* Records list */}
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Records</h2>
        <div className="text-sm text-gray-500">{records.length} total</div>
      </div>
      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : records.length === 0 ? (
        <div className="text-sm text-gray-500">No records found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Patient</th>
                <th className="py-2 pr-4">Doctor</th>
                <th className="py-2 pr-4">Complaints</th>
                <th className="py-2 pr-4">Medicines</th>
                <th className="py-2 pr-4">Therapies</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.flatMap((p) => {
                const summaryRow = (
                  <tr key={`${p.id}-summary`} className="align-top">
                    <td className="py-2 pr-4">{new Date(p.date || p.created_at || p.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 pr-4">{p.patient_name || 'Patient'}</td>
                    <td className="py-2 pr-4">{p.doctor_name || '-'}</td>
                    <td className="py-2 pr-4">{p.complaints || '-'}</td>
                    <td className="py-2 pr-4">{(p.meds||[]).map(m=>m.name).filter(Boolean).join(', ')}</td>
                    <td className="py-2 pr-4">{(p.therapies||[]).map(t=>t.name).filter(Boolean).join(', ')}</td>
                    <td className="py-2 pr-4 flex items-center gap-2">
                      <button className="px-2 py-1 rounded-md border" onClick={()=>setExpandedId(expandedId===p.id?null:p.id)} title="Details">{expandedId===p.id? 'Hide' : 'View'}</button>
                      <button className="px-2 py-1 rounded-md border" onClick={()=>printEntry(p)} title="Print"><Printer className="w-4 h-4"/></button>
                      <button className="px-2 py-1 rounded-md border" onClick={()=>printEntry(p)} title="Download"><Download className="w-4 h-4"/></button>
                      {canWrite && <button className="px-2 py-1 rounded-md border" onClick={()=>deleteEntry(p.id)} title="Delete"><Trash2 className="w-4 h-4"/></button>}
                    </td>
                  </tr>
                );
                const detailRow = expandedId === p.id ? (
                  <tr key={`${p.id}-detail`}>
                    <td colSpan={7} className="py-3 pr-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-gray-500">Advice / Notes</div>
                          <div className="whitespace-pre-wrap">{p.advice || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Panchakarma Plan</div>
                          <div><span className="text-gray-500 text-xs">Procedures:</span> {p.pk_plan?.procedures || '-'}</div>
                          <div><span className="text-gray-500 text-xs">Oils/Decoctions:</span> {p.pk_plan?.oils || '-'}</div>
                          <div><span className="text-gray-500 text-xs">Basti/Other:</span> {p.pk_plan?.basti || '-'}</div>
                          <div><span className="text-gray-500 text-xs">Diet & Lifestyle:</span> {p.pk_plan?.diet || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Clinical</div>
                          <div><span className="text-gray-500 text-xs">Vitals:</span> BP {p.clinical?.vitals?.bp || '-'}, Pulse {p.clinical?.vitals?.pulse || '-'}, Temp {p.clinical?.vitals?.temp || '-'}, SpO₂ {p.clinical?.vitals?.spo2 || '-'}</div>
                          <div><span className="text-gray-500 text-xs">Diagnosis:</span> {p.clinical?.diagnosis || '-'}</div>
                          <div><span className="text-gray-500 text-xs">Subjective:</span> {p.clinical?.subjective || '-'}</div>
                          <div><span className="text-gray-500 text-xs">Objective:</span> {p.clinical?.objective || '-'}</div>
                          <div><span className="text-gray-500 text-xs">Assessment:</span> {p.clinical?.assessment || '-'}</div>
                          <div><span className="text-gray-500 text-xs">Plan:</span> {p.clinical?.plan || '-'}</div>
                          <div><span className="text-gray-500 text-xs">Follow Up:</span> {p.clinical?.follow_up ? new Date(p.clinical.follow_up).toLocaleDateString() : '-'}</div>
                          <div><span className="text-gray-500 text-xs">Consent:</span> {p.clinical?.consent ? 'Yes' : 'No'}</div>
                        </div>
                      </div>
                      {(p.therapies||[]).length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs text-gray-500 mb-1">Therapies</div>
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="text-left text-gray-500">
                                <th className="py-1 pr-2">Therapy</th>
                                <th className="py-1 pr-2">Duration</th>
                                <th className="py-1 pr-2">Frequency</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {(p.therapies||[]).map((t, i)=> (
                                <tr key={i}>
                                  <td className="py-1 pr-2">{t.name || ''}</td>
                                  <td className="py-1 pr-2">{t.duration || ''}</td>
                                  <td className="py-1 pr-2">{t.frequency || ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {/* Plan details */}
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                            {(p.therapies||[]).map((t, i)=> (
                              <div key={`plan-${i}`} className="p-2 bg-white border rounded-lg">
                                <div className="text-xs font-medium text-gray-700">Plan for {t.name||'therapy'}</div>
                                <div className="text-[11px] text-gray-600 flex flex-wrap gap-2 mt-1">
                                  {t.plan_sessions>0 && <span>Sessions: {t.plan_sessions}</span>}
                                  {t.plan_interval_days>0 && <span>Interval: {t.plan_interval_days}d</span>}
                                  {t.plan_duration_min>0 && <span>Dur: {t.plan_duration_min}m</span>}
                                  {t.plan_start_date && <span>Start: {new Date(t.plan_start_date).toLocaleDateString()}</span>}
                                  {t.plan_preferred_time && <span>Time: {t.plan_preferred_time}</span>}
                                  {Array.isArray(t.plan_preferred_days)&&t.plan_preferred_days.length>0 && <span>Days: {t.plan_preferred_days.join(',').toUpperCase()}</span>}
                                  {t.plan_assigned_staff_id && <span>Therapist: {t.plan_assigned_staff_name || t.plan_assigned_staff_id}</span>}
                                  {t.plan_notes && <span>Notes: {t.plan_notes}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : null;
                return detailRow ? [summaryRow, detailRow] : [summaryRow];
              })}
            </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
