import { useEffect, useMemo, useState } from "react";
import PropTypes from 'prop-types';
import { SuperAdmin, Hospital, Patient } from "@/services";
import { Building, Users, IndianRupee, UserRound, RefreshCcw, Calendar, CalendarDays, Gauge } from "lucide-react";

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [totals, setTotals] = useState({
    clinics: 0,
    patients: 0,
    revenue: 0,
    doctors: 0,
    office_executives: 0,
    appt_today: 0,
    appt_week: 0,
    avg_progress: 0,
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Clinics
      const list = await SuperAdmin.listClinics({ page: 1, limit: 200 });
      const items = Array.isArray(list?.items) ? list.items : (Array.isArray(list) ? list : []);
      setClinics(items);

      const clinicIds = items.map(c => c.id || c._id).filter(Boolean);

      // 2) Parallel aggregate fetches per clinic
      const staffListsP = clinicIds.map(id => Hospital.listStaff(id).catch(() => []));
      const financesP = clinicIds.map(id => SuperAdmin.getClinicFinances(id).catch(() => ({})));
      const patientsP = clinicIds.map(id => Patient.withRecords({ hospital_id: id }).catch(() => []));
      // optional appointment windows if backend supports it via params
      const apptTodayP = clinicIds.map(id => SuperAdmin.getClinicFinances(id, { window: 'today' }).catch(() => ({})));
      const apptWeekP = clinicIds.map(id => SuperAdmin.getClinicFinances(id, { window: 'week' }).catch(() => ({})));

      const [staffLists, finances, patientsLists, apptToday, apptWeek] = await Promise.all([
        Promise.all(staffListsP),
        Promise.all(financesP),
        Promise.all(patientsP),
        Promise.all(apptTodayP),
        Promise.all(apptWeekP),
      ]);

      // 3) Reduce totals
      const clinicsCount = clinicIds.length;
      const patientsCount = patientsLists.reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
      const revenueSum = finances.reduce((sum, f) => {
        const val = Number(
          f?.totalRevenue ?? f?.revenue ?? f?.net ?? f?.net_revenue ?? 0
        );
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

      // appointments counts if present in finances responses
      const todayCount = apptToday.reduce((sum, f) => {
        const v = Number(f?.appointmentsToday ?? f?.appointments ?? f?.count ?? 0);
        return sum + (isNaN(v) ? 0 : v);
      }, 0);
      const weekCount = apptWeek.reduce((sum, f) => {
        const v = Number(f?.appointmentsWeek ?? f?.appointments ?? f?.count ?? 0);
        return sum + (isNaN(v) ? 0 : v);
      }, 0);

      let doctors = 0, officeExecutives = 0;
      staffLists.forEach(listArr => {
        (listArr || []).forEach(s => {
          const role = (s.role || '').toLowerCase();
          if (role === 'doctor') doctors += 1;
          if (role === 'office_executive') officeExecutives += 1;
        });
      });

      // average progress across all patients
      const allPatients = patientsLists.flat();
      const progressVals = allPatients.map(p => Number(p.progress_score) || 0);
      const avgProgress = progressVals.length ? Math.round(progressVals.reduce((a,b)=>a+b,0) / progressVals.length) : 0;

      setTotals({
        clinics: clinicsCount,
        patients: patientsCount,
        revenue: revenueSum,
        doctors,
        office_executives: officeExecutives,
        appt_today: todayCount,
        appt_week: weekCount,
        avg_progress: avgProgress,
      });
    } catch (e) {
      setError(e?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const currency = useMemo(() => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }), []);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Global Dashboard</h1>
          <p className="text-gray-500">Overview across all clinics</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-60">
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <SummaryCard
          title="Total Clinics"
          value={totals.clinics}
          icon={<Building className="w-6 h-6" />}
          iconBg="bg-blue-100 text-blue-600"
        />
        <SummaryCard
          title="Total Patients"
          value={totals.patients}
          icon={<Users className="w-6 h-6" />}
          iconBg="bg-green-100 text-green-600"
        />
        <SummaryCard
          title="Total Revenue"
          value={currency.format(totals.revenue)}
          icon={<IndianRupee className="w-6 h-6" />}
          iconBg="bg-amber-100 text-amber-600"
        />
        <SummaryCard
          title="Doctors"
          value={totals.doctors}
          icon={<UserRound className="w-6 h-6" />}
          iconBg="bg-indigo-100 text-indigo-600"
        />
        <SummaryCard
          title="Office Executives"
          value={totals.office_executives}
          icon={<UserRound className="w-6 h-6" />}
          iconBg="bg-orange-100 text-orange-600"
        />
        <SummaryCard
          title="Appointments Today"
          value={totals.appt_today}
          icon={<Calendar className="w-6 h-6" />}
          iconBg="bg-rose-100 text-rose-600"
        />
        <SummaryCard
          title="Appointments This Week"
          value={totals.appt_week}
          icon={<CalendarDays className="w-6 h-6" />}
          iconBg="bg-cyan-100 text-cyan-600"
        />
        <SummaryCard
          title="Average Progress"
          value={`${totals.avg_progress}%`}
          icon={<Gauge className="w-6 h-6" />}
          iconBg="bg-emerald-100 text-emerald-600"
        />
      </div>

      {/* Clinics quick list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Clinics</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clinics.map((c) => (
              <div key={c.id || c._id} className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                <div className="text-sm font-semibold text-gray-800 truncate">{c.name}</div>
                <div className="text-xs text-gray-500 truncate">{[c.city, c.state].filter(Boolean).join(', ')}</div>
              </div>
            ))}
            {clinics.length === 0 && (
              <div className="text-gray-500">No clinics found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, iconBg = "bg-gray-100 text-gray-600" }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${iconBg}`}>{icon}</div>
      <div>
        <div className="text-sm text-gray-500">{title}</div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

SummaryCard.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.node.isRequired,
  iconBg: PropTypes.string,
};
