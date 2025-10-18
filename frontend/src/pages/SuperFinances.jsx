import { useEffect, useMemo, useState } from "react";
import { SuperAdmin } from "@/services";
import { IndianRupee, RefreshCcw } from "lucide-react";
import PropTypes from 'prop-types';

export default function SuperFinances({ currentUser }) {
  const [loading, setLoading] = useState(false);
  const [clinics, setClinics] = useState({ items: [], total: 0 });
  const [selectedClinicId, setSelectedClinicId] = useState("");

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ from: "", to: "", type: "", method: "", category: "" });
  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: 20, income: 0, expense: 0, net: 0 });

  // Load clinics for selector
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await SuperAdmin.listClinics({ page: 1, limit: 100 });
        setClinics(res);
        const first = res?.items?.[0];
        if (first && !selectedClinicId) setSelectedClinicId(first._id || first.id);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load finances when clinic or filters change
  useEffect(() => {
    const run = async () => {
      if (!selectedClinicId) return;
      setLoading(true);
      try {
        const res = await SuperAdmin.getClinicFinances(selectedClinicId, { page, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([,v])=>v!=="")) });
        setData(res);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [selectedClinicId, page, filters]);

  const summary = useMemo(() => ({
    income: data.income || 0,
    expense: data.expense || 0,
    net: data.net || 0,
  }), [data]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl md:text-2xl font-bold">Finances</h1>
        <button onClick={()=>setPage(1)} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center gap-2">
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl ring-1 ring-slate-200 shadow p-4 mb-2">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500">Clinic</label>
            <select value={selectedClinicId} onChange={(e)=>{ setPage(1); setSelectedClinicId(e.target.value); }} className="border rounded px-2 py-2 w-full">
              {(clinics.items||[]).map(c => (
                <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500">From</label>
            <input type="date" value={filters.from} onChange={(e)=>setFilters(f=>({...f, from:e.target.value}))} className="border rounded px-2 py-2 w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-500">To</label>
            <input type="date" value={filters.to} onChange={(e)=>setFilters(f=>({...f, to:e.target.value}))} className="border rounded px-2 py-2 w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Type</label>
            <select value={filters.type} onChange={(e)=>setFilters(f=>({...f, type:e.target.value}))} className="border rounded px-2 py-2 w-full">
              <option value="">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500">Method</label>
            <select value={filters.method} onChange={(e)=>setFilters(f=>({...f, method:e.target.value}))} className="border rounded px-2 py-2 w-full">
              <option value="">All</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="insurance">Insurance</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          {[
            { title: 'Income', value: summary.income },
            { title: 'Expense', value: summary.expense },
            { title: 'Net', value: summary.net },
          ].map((k) => {
            const isInc = k.title === 'Income';
            const isExp = k.title === 'Expense';
            const wrap = isInc ? 'from-emerald-50 to-white ring-emerald-100' : isExp ? 'from-rose-50 to-white ring-rose-100' : 'from-sky-50 to-white ring-sky-100';
            const txt = isInc ? 'text-emerald-700' : isExp ? 'text-rose-700' : 'text-sky-700';
            return (
              <div key={k.title} className={`rounded-xl p-3 bg-gradient-to-br ${wrap} ring-1 border-0 shadow-sm`}>
                <div className="flex items-center justify-between">
                  <p className={`text-sm ${txt}`}>{k.title}</p>
                  <IndianRupee className={`w-4 h-4 ${txt}`} />
                </div>
                <p className={`text-xl font-semibold mt-1 ${txt}`}>₹{Number(k.value||0).toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* No transaction list in Super Admin view */}
    </div>
  );
}

SuperFinances.propTypes = {
  currentUser: PropTypes.object
};
