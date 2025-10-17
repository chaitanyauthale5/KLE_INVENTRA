import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { X, Printer, Download, FileText } from 'lucide-react';

const STORAGE_KEY = 'ayursutra_prescriptions_v1';
function loadAll() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

export default function PrescriptionRecordsModal({ isOpen, onClose, patient, currentUser }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    try {
      setItems(loadAll());
    } finally { setLoading(false); }
  }, [isOpen]);

  const scoped = useMemo(() => {
    const pid = patient?.id || patient?._id;
    const hid = currentUser?.hospital_id;
    return (items || []).filter(r => (!hid || r.hospital_id === hid) && (r.patient_id === pid));
  }, [items, patient?.id, patient?._id, currentUser?.hospital_id]);

  const printEntry = (entry) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Prescription</title><style>
      body{font-family:Inter,system-ui,sans-serif;padding:24px}
      h1{font-size:20px;margin:0 0 8px}
      .muted{color:#6b7280}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}
    </style></head><body>`);
    w.document.write(`<h1>Prescription</h1>
      <div class="muted">${new Date(entry.date || entry.created_at).toLocaleString()}</div>
      <div><strong>Patient:</strong> ${entry.patient_name || entry.patient_id}</div>
      <div><strong>Doctor:</strong> ${entry.doctor_name || ''}</div>
      <hr/>
      <div><strong>Complaints:</strong><br/>${(entry.complaints||'').replace(/\n/g,'<br/>')}</div>
      <h2 style="margin-top:12px">Panchakarma Plan</h2>
      <div><strong>Procedures:</strong> ${entry.pk_plan?.procedures || ''}</div>
      <div><strong>Oils/Decoctions:</strong> ${entry.pk_plan?.oils || ''}</div>
      <div><strong>Basti/Other:</strong> ${entry.pk_plan?.basti || ''}</div>
      <div><strong>Diet & Lifestyle:</strong> ${entry.pk_plan?.diet || ''}</div>
      <h2 style="margin-top:12px">Clinical Notes</h2>
      <div><strong>Vitals:</strong> BP ${entry.clinical?.vitals?.bp || '-'}, Pulse ${entry.clinical?.vitals?.pulse || '-'}, Temp ${entry.clinical?.vitals?.temp || '-'}, SpO₂ ${entry.clinical?.vitals?.spo2 || '-'}</div>
      <div><strong>Diagnosis:</strong> ${entry.clinical?.diagnosis || ''}</div>
      <table><thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
      <tbody>${(entry.meds||[]).map(m=>`<tr><td>${m.name||''}</td><td>${m.dosage||''}</td><td>${m.frequency||''}</td><td>${m.duration||''}</td></tr>`).join('')}</tbody></table>`);
    w.document.write('</body></html>');
    w.document.close();
    w.focus();
    w.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex p-4 md:p-6 overflow-y-auto">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full md:w-[92vw] lg:w-[70vw] xl:w-[56vw] max-w-[920px] max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-3rem)] flex flex-col mx-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 md:p-6 border-b border-gray-100 bg-white rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">Prescriptions & Records</h2>
              <p className="text-gray-500 text-sm">Patient: <span className="font-medium">{patient?.full_name || patient?.name || patient?.patient_id}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X className="w-6 h-6 text-gray-600"/></button>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto">
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : scoped.length === 0 ? (
            <div className="text-sm text-gray-500">No records found for this patient.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Doctor</th>
                    <th className="py-2 pr-4">Complaints</th>
                    <th className="py-2 pr-4">Medicines</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {scoped.map((p)=> (
                    <tr key={p.id}>
                      <td className="py-2 pr-4">{new Date(p.date || p.created_at).toLocaleDateString()}</td>
                      <td className="py-2 pr-4">{p.doctor_name || '-'}</td>
                      <td className="py-2 pr-4">{p.complaints || '-'}</td>
                      <td className="py-2 pr-4">{(p.meds||[]).map(m=>m.name).filter(Boolean).join(', ')}</td>
                      <td className="py-2 pr-4 flex items-center gap-2">
                        <button className="px-2 py-1 rounded-md border" onClick={()=>printEntry(p)} title="Print"><Printer className="w-4 h-4"/></button>
                        <button className="px-2 py-1 rounded-md border" onClick={()=>printEntry(p)} title="Download"><Download className="w-4 h-4"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

PrescriptionRecordsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  patient: PropTypes.object,
  currentUser: PropTypes.object,
};
