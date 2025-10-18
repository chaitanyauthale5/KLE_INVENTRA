import { useEffect, useMemo, useState } from "react";
import PropTypes from 'prop-types';
import { Finance, Patient, Hospital, SuperAdmin, User } from "@/services";
import { IndianRupee, RefreshCcw } from "lucide-react";

export default function FinanceManagement({ currentUser }) {
  const [me, setMe] = useState(null);
  const effectiveUser = currentUser || me;
  const role = String(effectiveUser?.role || '').toLowerCase();
  const [hospitalId, setHospitalId] = useState(effectiveUser?.hospital_id || "");

  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ type: "income", patient_id: "", therapy_option: "", therapy_name: "", expense_category: "", amount: "", method: "cash", notes: "" });

  const [pending, setPending] = useState({ items: [], total: 0, page: 1, limit: 20 });
  const [summary, setSummary] = useState({ revenue: 0, expense: 0, net: 0 });
  const [recent, setRecent] = useState({ items: [], total: 0, page: 1, limit: 10 });
  const [viewTxn, setViewTxn] = useState(null);

  const isOfficeExec = role === 'office_executive';
  const isClinicAdmin = role === 'clinic_admin' || role === 'hospital_admin';
  const therapyOptions = [
    "VAMANA",
    "VIRECHANA",
    "BASTI",
    "NASYA",
    "RAKTMOKSHANA",
    "CONSULTATION",
    "OTHER",
  ];
  const expenseCategories = [
    { label: "Pharmacy", value: "pharmacy" },
    { label: "Room", value: "room" },
    { label: "Other", value: "other" },
  ];

  const load = async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      if (isOfficeExec) {
        const pats = await Patient.filter({ hospital_id: hospitalId }).catch(()=>[]);
        setPatients(pats);
      }
      // pending disabled (auto-approved flow)
      setPending({ items: [], total: 0, page: 1, limit: 50 });
      // summary for TODAY only (APPROVED ONLY) so cards exactly match visible transactions
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(); end.setHours(23,59,59,999);
      const recentRes = await Finance.list({ hospital_id: hospitalId, status: 'approved', from: start.toISOString(), to: end.toISOString(), page: 1, limit: 500 }).catch(()=>({ items: [], total: 0, page:1, limit:500 }));
      setRecent(recentRes);
      const items = Array.isArray(recentRes.items) ? recentRes.items : [];
      const income = items.filter(t => String(t.type||'')==='income').reduce((a,c)=>a+Number(c.amount||0),0);
      const expense = items.filter(t => String(t.type||'')==='expense').reduce((a,c)=>a+Number(c.amount||0),0);
      setSummary({ revenue: Number(income||0), expense: Number(expense||0), net: Number(income - expense || 0) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hospitalId]);
  useEffect(() => {
    if (effectiveUser?.hospital_id && hospitalId !== effectiveUser.hospital_id) {
      setHospitalId(effectiveUser.hospital_id);
    }
  }, [effectiveUser?.hospital_id]);

  // Fallback: get current user if not provided by RoleGuard
  useEffect(() => {
    let mounted = true;
    if (!currentUser && !me) {
      (async () => {
        try {
          const u = await User.me();
          if (!mounted) return;
          setMe(u);
          if (u?.hospital_id) setHospitalId(u.hospital_id);
        } catch {}
      })();
    }
    return () => { mounted = false; };
  }, [currentUser, me]);

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    if (!hospitalId) return;
    try {
      setLoading(true);
      const typeLower = String(form.type || 'income').toLowerCase();
      let therapyName;
      let category;
      if (typeLower === 'income') {
        const optionLower = String(form.therapy_option || '').toLowerCase();
        therapyName = optionLower === 'other' ? String(form.therapy_name || '').trim() : form.therapy_option;
        category = optionLower === 'consultation' ? 'consultation' : 'therapy';
        if (!therapyName) {
          window.showNotification?.({ type: 'error', title: 'Therapy required', message: 'Please select a therapy or enter a custom therapy name.' });
          setLoading(false);
          return;
        }
      } else {
        category = String(form.expense_category || 'other');
        therapyName = undefined;
      }
      const payload = {
        hospital_id: hospitalId,
        patient_id: form.patient_id || undefined,
        therapy_name: therapyName,
        amount: Number(form.amount),
        method: form.method,
        category,
        type: typeLower,
        notes: form.notes || undefined,
      };
      await Finance.create(payload);
      window.showNotification?.({ type: 'success', title: 'Saved', message: 'Finance entry saved and visible to Clinic Admin and Office Executive.' });
      setForm({ type: "income", patient_id: "", therapy_option: "", therapy_name: "", expense_category: "", amount: "", method: "cash", notes: "" });
      await load();
    } catch (err) {
      window.showNotification?.({ type: 'error', title: 'Failed', message: err?.details?.message || err.message || 'Submit failed' });
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id) => {
    try {
      setLoading(true);
      await Finance.approve(id);
      await load();
    } catch (err) {
      window.showNotification?.({ type: 'error', title: 'Approve failed', message: err?.details?.message || err.message });
    } finally {
      setLoading(false);
    }
  };

  const reject = async (id) => {
    try {
      setLoading(true);
      await Finance.reject(id);
      await load();
    } catch (err) {
      window.showNotification?.({ type: 'error', title: 'Reject failed', message: err?.details?.message || err.message });
    } finally {
      setLoading(false);
    }
  };

  const currency = useMemo(() => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }), []);
  const fieldClass = "w-full border rounded px-3 py-2 bg-gradient-to-br from-emerald-50/60 to-white focus:outline-none focus:ring-2 focus:ring-emerald-300";

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-bold">Finances</h1>
        <button onClick={load} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center gap-2">
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {[
          { title: 'Revenue', value: summary.revenue },
          { title: 'Expense', value: summary.expense },
          { title: 'Net', value: summary.net },
        ].map((k) => {
          const isRev = k.title === 'Revenue';
          const isExp = k.title === 'Expense';
          const wrap = isRev ? 'from-emerald-50 to-white ring-emerald-100' : isExp ? 'from-rose-50 to-white ring-rose-100' : 'from-sky-50 to-white ring-sky-100';
          const txt = isRev ? 'text-emerald-700' : isExp ? 'text-rose-700' : 'text-sky-700';
          return (
            <div key={k.title} className={`rounded-xl p-3 bg-gradient-to-br ${wrap} ring-1 border-0 shadow-sm`}>
              <div className="flex items-center justify-between">
                <p className={`text-sm ${txt}`}>{k.title}</p>
                <IndianRupee className={`w-4 h-4 ${txt.replace('text-','text-')}`} />
              </div>
              <p className={`text-xl font-semibold mt-1 ${txt}`}>₹{Number(k.value||0).toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      {/* Office Executive: Create entry */}
      {isOfficeExec && (
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl ring-1 ring-emerald-200 shadow p-4">
          <h2 className="text-lg font-semibold mb-3">New Finance Entry</h2>
          {!hospitalId && (
            <div className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">Your account is not linked to a clinic yet. Ask admin to assign you to a clinic to submit finance entries.</div>
          )}
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500">Type</label>
              <select value={form.type} onChange={(e)=>setForm(f=>({...f, type:e.target.value}))} className={fieldClass}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            {form.type === 'income' && (
              <>
                <div>
                  <label className="block text-xs text-gray-500">Patient</label>
                  <select value={form.patient_id} onChange={(e)=>setForm(f=>({...f, patient_id:e.target.value}))} className={fieldClass}>
                    <option value="">Select patient (optional)</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name || p.name || p.email || p.id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Therapy</label>
                  <select value={form.therapy_option} onChange={(e)=>setForm(f=>({...f, therapy_option:e.target.value}))} className={fieldClass}>
                    <option value="">Select therapy</option>
                    {therapyOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                {String(form.therapy_option || '').toLowerCase() === 'other' && (
                  <div>
                    <label className="block text-xs text-gray-500">Custom Therapy Name</label>
                    <input value={form.therapy_name} onChange={(e)=>setForm(f=>({...f, therapy_name:e.target.value}))} className={fieldClass} placeholder="Enter therapy name" />
                  </div>
                )}
              </>
            )}
            {form.type === 'expense' && (
              <>
                <div>
                  <label className="block text-xs text-gray-500">Expense Category</label>
                  <select value={form.expense_category} onChange={(e)=>setForm(f=>({...f, expense_category:e.target.value}))} className={fieldClass}>
                    <option value="">Select category</option>
                    {expenseCategories.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block text-xs text-gray-500">Amount (INR)</label>
              <input type="number" min="1" value={form.amount} onChange={(e)=>setForm(f=>({...f, amount:e.target.value}))} className={fieldClass} placeholder="e.g., 1500" required />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Method</label>
              <select value={form.method} onChange={(e)=>setForm(f=>({...f, method:e.target.value}))} className={fieldClass}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="insurance">Insurance</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500">Notes</label>
              <input value={form.notes} onChange={(e)=>setForm(f=>({...f, notes:e.target.value}))} className={fieldClass} placeholder="Optional notes" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-60">Save</button>
            </div>
          </form>
        </div>
      )}

      {/* Pending section removed (auto-approved flow) */}

      <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl ring-1 ring-emerald-200 shadow-sm">
        <div className="flex items-center justify-between p-3">
          <h2 className="text-lg font-semibold text-gray-800">Recent Transactions</h2>
          <span className="text-xs text-gray-400">Showing latest approved</span>
        </div>
        <div className="divide-y">
          {(recent.items||[]).map((t) => (
            <div key={(t.id||t._id)+'_recent'} className="p-4 text-sm flex items-center justify-between">
              <div>
                <p className="font-medium">{t.therapy_name || t.category || t.type}</p>
                <p className="text-xs text-gray-500">{(t.patient_id?.name || t.patient_record_id?.name || t.patient_id?.username || t.patient_id?.email) ? `Patient: ${t.patient_id?.name || t.patient_record_id?.name || t.patient_id?.username || t.patient_id?.email} · ` : ''}{new Date(t.created_at || t.createdAt).toLocaleString()} · {t.method || 'cash'}{t.notes ? ` · ${t.notes}` : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`font-semibold ${String(t.type||'')==='expense' ? 'text-red-700' : 'text-green-700'}`}>{String(t.type||'')==='expense' ? '-' : ''}₹{Number(t.amount||0).toLocaleString()}</div>
                <button onClick={()=>setViewTxn(t)} className="px-2 py-1.5 rounded bg-gray-100 hover:bg-gray-200">View</button>
              </div>
            </div>
          ))}
          {(!recent.items || recent.items.length===0) && (
            <div className="p-6 text-center text-gray-500 text-sm">No recent transactions.</div>
          )}
        </div>
      </div>

      {viewTxn && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl ring-1 ring-emerald-100">
            <div className="bg-gradient-to-r from-emerald-500/90 to-emerald-400/90 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Transaction Details</h3>
              <button onClick={()=>setViewTxn(null)} className="text-white/90 hover:text-white text-sm">Close</button>
            </div>
            <div className="bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Status</div>
                  <div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${String(viewTxn.status||'').toLowerCase()==='approved' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'}`}>
                      {String(viewTxn.status||'').toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className={`text-2xl font-semibold ${String(viewTxn.type||'')==='expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {String(viewTxn.type||'')==='expense' ? '-' : ''}₹{Number(viewTxn.amount||0).toLocaleString()}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-0.5">
                  <div className="text-gray-500 text-xs">Type</div>
                  <div className="font-medium capitalize">{String(viewTxn.type||'')}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-gray-500 text-xs">Method</div>
                  <div className="font-medium capitalize">{viewTxn.method || 'cash'}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-gray-500 text-xs">Therapy / Category</div>
                  <div className="font-medium">{viewTxn.therapy_name || viewTxn.category || viewTxn.type}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-gray-500 text-xs">Patient</div>
                  <div className="font-medium">{viewTxn.patient_id?.name || viewTxn.patient_record_id?.name || viewTxn.patient_id?.username || viewTxn.patient_id?.email || '-'}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-gray-500 text-xs">Created</div>
                  <div>{new Date(viewTxn.created_at || viewTxn.createdAt).toLocaleString()}</div>
                </div>
                {viewTxn.approved_by && (
                  <div className="space-y-0.5">
                    <div className="text-gray-500 text-xs">Approved By</div>
                    <div>{viewTxn.approved_by?.name || viewTxn.approved_by?.username || viewTxn.approved_by?.email}</div>
                  </div>
                )}
                {viewTxn.approved_at && (
                  <div className="space-y-0.5">
                    <div className="text-gray-500 text-xs">Approved At</div>
                    <div>{new Date(viewTxn.approved_at).toLocaleString()}</div>
                  </div>
                )}
                {viewTxn.notes && (
                  <div className="md:col-span-2 space-y-0.5">
                    <div className="text-gray-500 text-xs">Notes</div>
                    <div className="rounded-md bg-gray-50 px-3 py-2 border border-gray-200">{viewTxn.notes}</div>
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end">
                <button onClick={()=>setViewTxn(null)} className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

FinanceManagement.propTypes = {
  currentUser: PropTypes.object
};
