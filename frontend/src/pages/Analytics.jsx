import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { SuperAdmin, User } from '../services';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [data, setData] = useState({ kpis: {}, series: [], therapyDistribution: [], financeCategoryWeightage: [], granularity: 'month' });
  const [granularity, setGranularity] = useState('month');
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState(false);

  const loadAnalytics = async (g) => {
    const resp = await SuperAdmin.analyticsGlobal({ granularity: g });
    setData(resp || {});
    setError('');
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await User.me();
        if (mounted) setMe(u);
        const resp = await SuperAdmin.analyticsGlobal({ granularity });
        if (mounted) setData(resp || {});
        if (mounted) setError('');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [granularity]);

  const handleSeed = async () => {
    if (seeding) return;
    try {
      setSeeding(true);
      await SuperAdmin.seed();
      toast.success('Demo data generated');
      await loadAnalytics(granularity);
    } catch (e) {
      toast.error('Failed to seed demo data');
    } finally {
      setSeeding(false);
    }
  };

  const monthsSeries = useMemo(() => {
    // Normalize to 12 months series
    const map = new Map();
    (data?.series || []).forEach(d => map.set(d._id || d.key || d.month || d.label, d.count || d.value || 0));
    const now = new Date();
    const arr = [];
    if ((data?.granularity || granularity) === 'day') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i*24*60*60*1000);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        arr.push({ month: key, count: map.get(key) || 0 });
      }
    } else if ((data?.granularity || granularity) === 'week') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getTime() - i*7*24*60*60*1000);
        const week = Math.ceil((((d - new Date(d.getFullYear(),0,1)) / 86400000) + new Date(d.getFullYear(),0,1).getDay()+1)/7);
        const key = `${d.getFullYear()}-${String(week).padStart(2,'0')}`;
        arr.push({ month: key, count: map.get(key) || 0 });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        arr.push({ month: key, count: map.get(key) || 0 });
      }
    }
    return arr;
  }, [data]);

  const COLORS = ['#4f46e5','#22c55e','#f59e0b','#ef4444','#06b6d4','#a855f7','#64748b'];
  const fmt = (n) => typeof n === 'number' ? n.toLocaleString('en-IN') : n;
  const topCategory = useMemo(() => {
    const list = data?.financeCategoryWeightage || [];
    return list.length ? list.slice().sort((a,b)=> (b.value||0) - (a.value||0))[0] : null;
  }, [data]);

  const getDashboardUrl = () => {
    switch (me?.role) {
      case 'doctor': return createPageUrl('DoctorDashboard');
      case 'therapist': return createPageUrl('TherapistDashboard');
      case 'super_admin': return createPageUrl('SuperAdminDashboard');
      default: return createPageUrl('Dashboard');
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-500">Global insights across all clinics.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-1 text-sm">
            {['day','week','month'].map(g => (
              <button key={g} onClick={() => setGranularity(g)} className={`px-3 py-1 rounded-lg ${granularity===g?'bg-gray-900 text-white':'text-gray-700 hover:bg-gray-50'}`}>{g[0].toUpperCase()+g.slice(1)}</button>
            ))}
          </div>
          {me?.role === 'super_admin' && (
            <button onClick={handleSeed} disabled={seeding} className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-sm">
              {seeding ? 'Generating…' : 'Generate Demo Data'}
            </button>
          )}
          <Link to={getDashboardUrl()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[{t:'Total Patients',v:data?.kpis?.totalPatients,color:'blue'},
          {t:'Completed Sessions',v:data?.kpis?.completedSessions,color:'emerald'},
          {t:'Average Progress',v:(typeof data?.kpis?.averageProgressPct==='number'? `${data.kpis.averageProgressPct}%`:'—'),color:'violet'},
          {t:'Active Staff',v:data?.kpis?.activeStaff,color:'orange'}].map((k)=> (
          <div key={k.t} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
            <p className="text-sm text-gray-500">{k.t}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{loading ? '—' : fmt(k.v ?? '—')}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5 lg:col-span-2">
          <p className="text-sm text-gray-600 mb-4">Patients (12 months)</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthsSeries} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#93c5fd" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v)=>[fmt(v),'Patients']} />
                <Bar dataKey="count" radius={[6,6,0,0]} fill="url(#barGradient)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
          <p className="text-sm text-gray-600 mb-4">Therapy Distribution (last 90d)</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={data?.therapyDistribution || []} innerRadius={48} outerRadius={80} paddingAngle={2}>
                  {(data?.therapyDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v, n, p)=>[fmt(v), p?.payload?.label || '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {(data?.therapyDistribution || []).map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-gray-700">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="truncate">{d.label}</span>
                <span className="ml-auto font-medium">{fmt(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5 mt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-600">Finance Category Weightage (last 90d)</p>
          <p className="text-xs text-gray-500">Highlighting top demand</p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(data?.financeCategoryWeightage || []).map(x=>({ ...x, name: x.label }))} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v)=>[fmt(v),'Total']} />
              <Bar dataKey="value" radius={[6,6,0,0]}>
                {(data?.financeCategoryWeightage || []).map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={index === 0 ? '#22c55e' : COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {(data?.financeCategoryWeightage || []).map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-gray-700">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: i===0?'#22c55e':COLORS[i % COLORS.length] }} />
              <span className="truncate">{d.label}</span>
              <span className="ml-auto font-medium">₹{fmt(d.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-6 text-sm text-rose-600">{error}</div>
      )}
    </div>
  );
}