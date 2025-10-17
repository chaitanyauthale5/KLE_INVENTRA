import { useEffect, useMemo, useState } from 'react';
import { SuperAdmin, Hospital, User } from "@/services";
import { Link } from 'react-router-dom';
import { Building, IndianRupee, BarChart3, Star, RefreshCcw, Users, UserCheck, Briefcase } from "lucide-react";
import PropTypes from 'prop-types';

export default function Dashboard({ currentUser: incomingUser }) {
  const [me, setMe] = useState(incomingUser);
  useEffect(() => { if (incomingUser) setMe(incomingUser); }, [incomingUser]);
  useEffect(() => { if (!incomingUser) { (async()=>{ try{ const u = await User.me(); setMe(u||null); } catch{ setMe(null);} })(); } }, [incomingUser]);

  const isSuper = me?.role === 'super_admin';
  const hasClinic = !!me?.hospital_id;

  // Super admin state
  const [loading, setLoading] = useState(false);
  const [clinics, setClinics] = useState({ items: [], total: 0, page: 1, limit: 10 });
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [finance, setFinance] = useState({ income: 0, expense: 0, net: 0, items: [], total: 0 });
  // Clinic admin summary
  const [clinicSummary, setClinicSummary] = useState({ patients: 0, doctors: 0, office_executives: 0, income: 0, expense: 0, net: 0 });
  const [clinicLoading, setClinicLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (!isSuper) return;
    const run = async () => {
      setLoading(true);
      try {
        const data = await SuperAdmin.listClinics({ page: 1, limit: 10 });
        setClinics(data);
        const first = data?.items?.[0];
        if (first) setSelectedClinic(first);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }

Dashboard.propTypes = {
  currentUser: PropTypes.object
};
    };
    run();
  }, [isSuper]);

  useEffect(() => {
    if (!isSuper || !selectedClinic) return;
    const run = async () => {
      setLoading(true);
      try {
        const fid = selectedClinic._id || selectedClinic.id;
        const data = await SuperAdmin.getClinicFinances(fid, { page: 1, limit: 10 });
        setFinance(data || { income: 0, expense: 0, net: 0, items: [] });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [isSuper, selectedClinic]);

  // Load clinic KPIs for any user scoped to a clinic
  useEffect(() => {
    if (!hasClinic) return;
    const run = async () => {
      setClinicLoading(true);
      try {
        const s = await Hospital.summary(me.hospital_id);
        setClinicSummary(s || {});
        setLastUpdated(new Date());
      } catch (e) {
        console.warn('Failed to load clinic summary', e);
        try { window.showNotification && window.showNotification({ type: 'error', title: 'Dashboard', message: 'Failed to load clinic KPIs' }); } catch {}
      } finally {
        setClinicLoading(false);
      }
    };
    run();
  }, [hasClinic, me?.hospital_id]);

  const kpis = useMemo(() => {
    if (!isSuper) return [];
    const items = clinics?.items || [];
    const hospitals = clinics?.total || items.length;
    const revenue = items.reduce((s, c) => s + (c.totalRevenue || 0), 0);
    const net = items.reduce((s, c) => s + ((c.totalRevenue || 0) - (c.totalExpenses || 0)), 0);
    const ratings = items.map(i => i.avgRating).filter(n => typeof n === 'number');
    const avgRating = ratings.length ? (ratings.reduce((a,b)=>a+b,0)/ratings.length) : 0;
    return [
      { title: 'Hospitals', value: hospitals.toLocaleString(), icon: Building },
      { title: 'Revenue (sum)', value: `₹${revenue.toLocaleString()}`, icon: IndianRupee },
      { title: 'Net (sum)', value: `₹${net.toLocaleString()}`, icon: BarChart3 },
      { title: 'Avg Rating', value: avgRating.toFixed(2), icon: Star },
    ];
  }, [isSuper, clinics]);

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Welcome{me?.full_name ? `, ${me.full_name}` : ''}</h1>
          <p className="text-gray-500">This is your AyurSutra Dashboard. No redirects, fully local.</p>
        </div>
        {isSuper && (
          <button
            onClick={() => {
              if (clinics?.page) {
                (async () => {
                  setLoading(true);
                  try {
                    const data = await SuperAdmin.listClinics({ page: clinics.page, limit: clinics.limit || 10 });
                    setClinics(data);
                    const cur = data.items?.find(i => (i._id||i.id) === (selectedClinic?._id||selectedClinic?.id));
                    if (cur) setSelectedClinic(cur);
                    setLastUpdated(new Date());
                  } finally { setLoading(false); }
                })();
              }
            }}
            className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        )}
        {hasClinic && (
          <button
            onClick={() => {
              if (!me?.hospital_id) return;
              (async () => {
                setClinicLoading(true);
                try {
                  const s = await Hospital.summary(me.hospital_id);
                  setClinicSummary(s || {});
                  setLastUpdated(new Date());
                } finally { setClinicLoading(false); }
              })();
            }}
            className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        )}
      </div>

      {hasClinic && lastUpdated && (
        <div className="mb-2 text-xs text-gray-500">Last updated: {new Date(lastUpdated).toLocaleString()}</div>
      )}

      {!hasClinic && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Quick Links</h2>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Use the top navigation to access Patients, Scheduling, Hospitals, etc.</li>
              <li>Data is stored locally in your browser for this build.</li>
            </ul>
          </div>
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Status</h2>
            <p className="text-sm text-gray-600">{loading ? 'Loading...' : 'Working perfectly.'}</p>
          </div>
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">User</h2>
            <p className="text-sm text-gray-600">Role: <span className="font-medium">{me?.role || 'guest'}</span></p>
            {!me && (
              <p className="text-xs text-amber-700 mt-2">You are not signed in. Some KPIs may be hidden.</p>
            )}
          </div>
        </div>
      )}

      {/* Clinic KPIs (if user is linked to a clinic) */}
      {(
        hasClinic || !me?.hospital_id
      ) && (
        <>
          {!me?.hospital_id && (
            <div className="mt-6 p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="font-medium">No clinic assigned to your account.</div>
                <div className="text-sm">Please assign a clinic to view KPIs.</div>
              </div>
              <div className="mt-3 flex gap-2">
                <Link className="px-3 py-1.5 rounded-md bg-blue-600 text-white" to="/Hospitals">Go to Hospitals</Link>
                <Link className="px-3 py-1.5 rounded-md bg-gray-100" to="/Settings">Open Settings</Link>
              </div>
            </div>
          )}
          {hasClinic && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <KpiCard title="Total Patients" value={clinicSummary.patients} icon={Users} iconBg="bg-green-100 text-green-600" loading={clinicLoading} to="/Patients" />
              <KpiCard title="Doctors" value={clinicSummary.doctors} icon={UserCheck} iconBg="bg-indigo-100 text-indigo-600" loading={clinicLoading} to="/Staff" />
              <KpiCard title="Therapists" value={clinicSummary.therapists} icon={Users} iconBg="bg-teal-100 text-teal-600" loading={clinicLoading} to="/Staff" />
              <KpiCard title="Office Executives" value={clinicSummary.office_executives} icon={Briefcase} iconBg="bg-orange-100 text-orange-600" loading={clinicLoading} to="/Staff" />
              <KpiCard title="Appointments Today" value={clinicSummary.visits_today} icon={CalendarIcon} iconBg="bg-rose-100 text-rose-600" loading={clinicLoading} to="/TherapyScheduling" />
              <KpiCard title="Completed (MTD)" value={clinicSummary.sessions_completed_mtd} icon={BarChart3} iconBg="bg-emerald-100 text-emerald-600" loading={clinicLoading} to="/TherapyScheduling" />
              <KpiCard title="Appointments (Total)" value={clinicSummary.appointments_total} icon={CalendarIcon} iconBg="bg-sky-100 text-sky-600" loading={clinicLoading} to="/TherapyScheduling" />
              <KpiCard title="Total Revenue" value={`₹${(clinicSummary.income||0).toLocaleString()}`} icon={IndianRupee} iconBg="bg-amber-100 text-amber-600" loading={clinicLoading} to="/Analytics" />
              <KpiCard title="Revenue (MTD)" value={`₹${(clinicSummary.revenue_mtd||0).toLocaleString()}`} icon={IndianRupee} iconBg="bg-yellow-100 text-yellow-600" loading={clinicLoading} to="/Analytics" />
              <KpiCard title="Patients (MTD)" value={clinicSummary.patients_mtd} icon={Users} iconBg="bg-green-100 text-green-600" loading={clinicLoading} to="/Patients" />
            </div>
          )}
        </>
      )}

      {isSuper && (
        <>
          {/* KPIs */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            {kpis.map((k, i) => (
              <div key={i} className="rounded-2xl p-4 bg-gradient-to-br from-gray-700 to-gray-900 shadow text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">{k.title}</p>
                    <p className="text-2xl font-semibold">{k.value}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <k.icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Clinics and Finance summary */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Clinics</h2>
                <span className="text-sm text-gray-500">Total: {clinics.total}</span>
              </div>
              <div className="divide-y">
                {(clinics.items||[]).map((c) => (
                  <div key={c._id || c.id} className={`py-3 flex items-center justify-between ${selectedClinic && (selectedClinic._id||selectedClinic.id)===(c._id||c.id)?'bg-blue-50 rounded-lg px-2':''}`}>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-gray-500">Revenue ₹{(c.totalRevenue||0).toLocaleString()} | Net ₹{((c.totalRevenue||0)-(c.totalExpenses||0)).toLocaleString()} | Patients {c.totalPatients} | Doctors {c.totalDoctors} | Rating {c.avgRating ?? '-'}</p>
                    </div>
                    <button className="text-sm px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200" onClick={() => setSelectedClinic(c)}>Select</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <h2 className="font-semibold mb-2">Finance Summary</h2>
              {selectedClinic ? (
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">Clinic:</span> {selectedClinic.name}</p>
                  <p><span className="text-gray-500">Income:</span> ₹{(finance.income||0).toLocaleString()}</p>
                  <p><span className="text-gray-500">Expense:</span> ₹{(finance.expense||0).toLocaleString()}</p>
                  <p><span className="text-gray-500">Net:</span> ₹{(finance.net||0).toLocaleString()}</p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Select a clinic to view finance summary.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CalendarIcon(props){return (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>);}

function KpiCard({ title, value, icon: Icon, loading, to, iconBg }) {
  const card = (
    <div className="rounded-2xl p-4 bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-center gap-3">
        <div className={`${iconBg || 'bg-gray-100 text-gray-600'} w-10 h-10 rounded-xl flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{loading ? '—' : (value ?? 0)}</p>
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

KpiCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  icon: PropTypes.elementType.isRequired,
  loading: PropTypes.bool,
  to: PropTypes.string,
  iconBg: PropTypes.string,
};