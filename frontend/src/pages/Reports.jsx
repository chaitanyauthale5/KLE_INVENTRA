import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FileText, Download, Users, Activity, BarChart3, TrendingUp, Eye, Printer, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { SuperAdmin, User } from '../services';
import { ResponsiveContainer, BarChart as RBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';

const StatCard = ({ title, value, icon: Icon, color, suffix = '' }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}<span className="text-lg font-medium">{suffix}</span></p>
      </div>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color}`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
    </div>
  </div>
);

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.string.isRequired,
  suffix: PropTypes.string,
};

const ReportCard = ({ report }) => {
  const handleAction = (actionType) => {
    window.showNotification?.({ type: 'info', title: `${actionType} Requested`, message: `This is a demo. The ${report.title} would be ${actionType.toLowerCase()}ed.` });
  };
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{report.title}</h3>
            <p className="text-sm text-gray-500">ID: {report.id} • {report.type}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${report.status === 'Ready' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {report.status}
        </span>
      </div>
      <p className="text-gray-600 text-sm mb-4">{report.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>Generated: {format(new Date(report.generatedDate), 'MMM d, yyyy')}</span>
          <span>Pages: {report.pages}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleAction('View')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="w-4 h-4" /></button>
          <button onClick={() => handleAction('Download')} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Download className="w-4 h-4" /></button>
          <button onClick={() => handleAction('Print')} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"><Printer className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
};

ReportCard.propTypes = {
  report: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    generatedDate: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    pages: PropTypes.number.isRequired,
    description: PropTypes.string,
  }).isRequired,
};

export default function Reports() {
  const [me, setMe] = useState(null);
  const [data, setData] = useState({ kpis: {}, series: [], therapyDistribution: [], granularity: 'month' });
  const [granularity, setGranularity] = useState('month');
  const [loading, setLoading] = useState(true);
  const [scopedHospitalId, setScopedHospitalId] = useState(null);
  const [reports, setReports] = useState([
    { id: 'RPT001', title: 'Monthly Patient Progress Report', type: 'Patient Analytics', generatedDate: '2024-12-20', status: 'Ready', pages: 15, description: 'Comprehensive analysis of patient progress across all therapy types.' },
    { id: 'RPT002', title: 'Therapy Session Efficiency Analysis', type: 'Operational Report', generatedDate: '2024-12-19', status: 'Ready', pages: 23, description: 'Detailed breakdown of therapy session completion rates, duration, and resource utilization.' },
    { id: 'RPT003', title: 'Financial Summary & Revenue Analysis', type: 'Financial Report', generatedDate: '2024-12-18', status: 'Processing', pages: 12, description: 'Monthly revenue analysis, payment collections, and outstanding dues summary.' }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const isAnalyticsAllowed = (u) => ['super_admin','clinic_admin','hospital_admin','admin'].includes(u?.role);

  const load = async (g, currentUser) => {
    if (!isAnalyticsAllowed(currentUser)) return; // avoid 403s for other roles
    const params = { granularity: g, mode: demoMode ? 'demo' : 'live' };
    if (!demoMode) {
      if (currentUser?.hospital_id) {
        params.hospitalId = currentUser.hospital_id;
      } else if (scopedHospitalId) {
        params.hospitalId = scopedHospitalId;
      } else if (currentUser?.role === 'super_admin') {
        const list = await SuperAdmin.listClinics({ page: 1, limit: 1 }).catch(() => ({ items: [] }));
        const first = Array.isArray(list?.items) && list.items[0];
        if (first) {
          setScopedHospitalId(first._id || first.id);
          params.hospitalId = first._id || first.id;
        }
      }
    }
    const resp = await SuperAdmin.analyticsGlobal(params);
    setData(resp || {});
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await User.me();
        if (!mounted) return;
        setMe(u);
        if (isAnalyticsAllowed(u)) {
          await load(granularity, u);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [granularity]);

  const toggleDemo = async (on) => {
    setDemoMode(on);
    if (!me) return;
    try {
      if (on) {
        await SuperAdmin.seed();
        toast.success('Demo data ready');
      }
      await load(granularity, me);
    } catch {
      toast.error('Failed to update data');
    }
  };

  const COLORS = ['#4f46e5','#22c55e','#f59e0b','#ef4444','#06b6d4','#a855f7','#64748b'];
  const fmt = (n) => typeof n === 'number' ? n.toLocaleString('en-IN') : n;
  const therapyWithPct = useMemo(() => {
    const arr = data?.therapyDistribution || [];
    const total = arr.reduce((s, x) => s + (x?.value || 0), 0) || 0;
    return arr.map(x => ({ ...x, percent: total ? Math.round((x.value * 100) / total) : 0 }));
  }, [data]);
  const monthsSeries = useMemo(() => {
    const map = new Map();
    (data?.series || []).forEach(d => map.set(d._id || d.key || d.month || d.label, d.count || d.value || 0));
    const now = new Date();
    const arr = [];
    if ((data?.granularity || granularity) === 'day') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i*24*60*60*1000);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        arr.push({ period: key, value: map.get(key) || 0 });
      }
    } else if ((data?.granularity || granularity) === 'week') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getTime() - i*7*24*60*60*1000);
        const week = Math.ceil((((d - new Date(d.getFullYear(),0,1)) / 86400000) + new Date(d.getFullYear(),0,1).getDay()+1)/7);
        const key = `${d.getFullYear()}-${String(week).padStart(2,'0')}`;
        arr.push({ period: key, value: map.get(key) || 0 });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        arr.push({ period: key, value: map.get(key) || 0 });
      }
    }
    return arr;
  }, [data, granularity]);

  const generateReport = () => {
    setIsGenerating(true);
    window.showNotification?.({ type: 'info', title: 'Generating Report', message: 'Your new comprehensive report is being generated...' });
    setTimeout(() => {
      const newReport = { id: `RPT${Math.floor(Math.random() * 900) + 100}`, title: 'On-Demand Comprehensive Report', type: 'Generated Report', generatedDate: new Date().toISOString(), status: 'Ready', pages: 20, description: 'A newly generated report with the latest data.' };
      setReports(prev => [newReport, ...prev]);
      setIsGenerating(false);
      window.showNotification?.({ type: 'success', title: 'Report Ready!', message: 'Your new report has been successfully generated.' });
    }, 2000);
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-500">Comprehensive insights and performance metrics.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <div className="bg-white border border-gray-200 rounded-xl p-1 text-sm">
            {['day','week','month'].map(g => (
              <button key={g} onClick={() => setGranularity(g)} className={`px-3 py-1 rounded-lg ${granularity===g?'bg-gray-900 text-white':'text-gray-700 hover:bg-gray-50'}`}>{g[0].toUpperCase()+g.slice(1)}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1 text-sm">
            <span className={`text-gray-700 ${demoMode ? 'opacity-50' : ''}`}>Live</span>
            <button onClick={() => toggleDemo(!demoMode)} className={`w-12 h-6 rounded-full relative transition-colors ${demoMode ? 'bg-indigo-600' : 'bg-gray-300'}`} aria-label="Toggle demo data">
              <span className={`absolute top-0.5 ${demoMode ? 'right-0.5' : 'left-0.5'} w-5 h-5 bg-white rounded-full transition-all`}></span>
            </button>
            <span className={`text-gray-700 ${!demoMode ? 'opacity-50' : ''}`}>Demo</span>
          </div>
          <button onClick={() => load(granularity, me)} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 text-sm">
            Refresh
          </button>
          {/* Generate Report stays */}
          <button onClick={generateReport} disabled={isGenerating} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-3 rounded-2xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-wait">
            <Download className="w-5 h-5" />
            {isGenerating ? 'Generating...' : 'Generate New Report'}
          </button>
        </div>
      </div>

      {isAnalyticsAllowed(me) ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="Total Patients" value={fmt(data?.kpis?.totalPatients || 0)} icon={Users} color="bg-gradient-to-br from-blue-500 to-blue-600" />
            <StatCard title="Completed Sessions" value={fmt(data?.kpis?.completedSessions || 0)} icon={Activity} color="bg-gradient-to-br from-green-500 to-green-600" />
            <StatCard title="Average Progress" value={typeof data?.kpis?.averageProgressPct==='number' ? `${data.kpis.averageProgressPct}%` : '—'} icon={TrendingUp} color="bg-gradient-to-br from-purple-500 to-purple-600" />
            <StatCard title="Active Staff" value={fmt(data?.kpis?.activeStaff || 0)} icon={Briefcase} color="bg-gradient-to-br from-orange-500 to-orange-600" />
          </div>

          {/* Dynamic Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 lg:col-span-2">
              <p className="text-sm text-gray-600 mb-4">Patients ({granularity === 'day' ? '7 days' : '12 periods'})</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RBarChart data={monthsSeries} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                    <defs>
                      <linearGradient id="barGradientReports" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#93c5fd" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v)=>[fmt(v),'Patients']} />
                    <Bar dataKey="value" radius={[6,6,0,0]} fill="url(#barGradientReports)" />
                  </RBarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-600 mb-4">Therapy Distribution (current window)</p>
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
        </>
      ) : (
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 p-4">
          This section shows analytics. Please sign in as a Super Admin or Clinic Admin to view dynamic charts and the demo data button. You can still generate printable reports below.
        </div>
      )}

      {/* Dynamic Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 lg:col-span-2">
          <p className="text-sm text-gray-600 mb-4">Patients ({granularity === 'day' ? '7 days' : '12 periods'})</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RBarChart data={monthsSeries} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="barGradientReports" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#93c5fd" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v)=>[fmt(v),'Patients']} />
                <Bar dataKey="value" radius={[6,6,0,0]} fill="url(#barGradientReports)" />
              </RBarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600 mb-4">Therapy Distribution (current window)</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  dataKey="value"
                  data={therapyWithPct}
                  innerRadius={48}
                  outerRadius={80}
                  paddingAngle={2}
                  labelLine={false}
                  label={({ percent }) => `${Math.round(percent * 100)}%`}
                >
                  {therapyWithPct.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v, n, p)=>[`${fmt(v)} (${p?.payload?.percent ?? 0}%)`, p?.payload?.label || '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {therapyWithPct.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-gray-700">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="truncate">{d.label}</span>
                <span className="ml-auto font-medium">{fmt(d.value)} ({d.percent}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-6">Generated Reports</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reports.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>
    </div>
  );
}