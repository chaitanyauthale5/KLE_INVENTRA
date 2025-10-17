import { useEffect, useMemo, useState } from "react";
import { SuperAdmin } from "@/services";
import { IndianRupee, Filter, RefreshCcw } from "lucide-react";
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
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-bold">Finances</h1>
        <button onClick={()=>setPage(1)} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center gap-2">
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4">
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
          ].map((k) => (
            <div key={k.title} className="rounded-xl p-3 bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">{k.title}</p>
                <IndianRupee className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-xl font-semibold mt-1">₹{Number(k.value||0).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-3 text-sm text-gray-600">
          <span className="flex items-center gap-2"><Filter className="w-4 h-4" />Transactions</span>
          <span>Page {data.page} / {Math.max(1, Math.ceil((data.total||0) / (data.limit||20)))}</span>
        </div>
        <div className="divide-y">
          {(data.items||[]).map((t, idx) => (
            <div key={idx} className="p-4 text-sm flex items-center justify-between">
              <div>
                <p className="font-medium">{t.category || t.type}</p>
                <p className="text-xs text-gray-500">{new Date(t.created_at || t.createdAt).toLocaleString()} · {t.method || 'cash'}{t.notes ? ` · ${t.notes}` : ''}</p>
              </div>
              <div className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>₹{Number(t.amount||0).toLocaleString()}</div>
            </div>
          ))}
          {(!data.items || data.items.length===0) && (
            <div className="p-6 text-center text-gray-500 text-sm">No transactions found.</div>
          )}
        </div>
        <div className="flex items-center justify-between p-3">
          <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="text-sm px-3 py-1.5 rounded bg-gray-100 disabled:opacity-50">Prev</button>
          <button disabled={(data.page||1) >= Math.ceil((data.total||0)/(data.limit||20))} onClick={()=>setPage(p=>p+1)} className="text-sm px-3 py-1.5 rounded bg-gray-100 disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}

SuperFinances.propTypes = {
  currentUser: PropTypes.object
};
