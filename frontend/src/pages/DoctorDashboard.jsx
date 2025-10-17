import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, Bell, ClipboardList, Stethoscope } from 'lucide-react';
import { User, Hospital, Notification } from '@/services';
import PropTypes from 'prop-types';

export default function DoctorDashboard() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({ patients: 0, apptsToday: 0, unread: 0 });
  const [upcoming, setUpcoming] = useState([]); // optional
  const [recentPatients, setRecentPatients] = useState([]); // optional

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await User.me();
        if (!mounted) return;
        setMe(u || null);

        // Unread notifications (optional API)
        let unread = 0;
        try {
          if (Notification && typeof Notification.listIncoming === 'function') {
            const items = await Notification.listIncoming();
            unread = (items || []).filter(n => !n.is_read).length;
          }
        } catch (e) { console.warn('DoctorDashboard: notifications fetch failed', e); }

        // Assigned patients count (optional API)
        let patients = 0;
        try {
          if (Hospital && typeof Hospital.listDoctorPatients === 'function') {
            const pts = await Hospital.listDoctorPatients(u?.hospital_id, u?.id || u?._id);
            patients = (pts || []).length;
            setRecentPatients((pts || []).slice(0, 6));
          }
        } catch (e) { console.warn('DoctorDashboard: patients fetch failed', e); }

        // Today appointments (optional API)
        let apptsToday = 0;
        try {
          if (Hospital && typeof Hospital.listDoctorAppointmentsToday === 'function') {
            const appts = await Hospital.listDoctorAppointmentsToday(u?.hospital_id, u?.id || u?._id);
            apptsToday = (appts || []).length;
            setUpcoming((appts || []).slice(0, 5));
          }
        } catch (e) { console.warn('DoctorDashboard: appointments fetch failed', e); }

        setKpi({ patients, apptsToday, unread });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Doctor&apos;s Dashboard</h1>
            <p className="text-gray-500">Care hub for your patients, schedule, and notes.</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
          <span>Role:</span>
          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700">{me?.role || '—'}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <KpiCard title="My Patients" value={loading ? '—' : kpi.patients} icon={Users} color="bg-blue-100 text-blue-700" to="/Patients" />
        <KpiCard title="Appointments Today" value={loading ? '—' : kpi.apptsToday} icon={Calendar} color="bg-emerald-100 text-emerald-700" to="/DoctorAppointments" />
        <KpiCard title="Unread Notifications" value={loading ? '—' : kpi.unread} icon={Bell} color="bg-amber-100 text-amber-700" to="/Notifications" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <ActionCard title="My Patients" desc="View and manage assigned patients" to="/Patients" icon={Users} iconClass="text-blue-500" />
        <ActionCard title="Therapy Schedule" desc="Review today’s and upcoming sessions" to="/DoctorAppointments" icon={Calendar} iconClass="text-green-600" />
        <ActionCard title="Clinical Notes" desc="Create or review documentation" to="/Patients" icon={ClipboardList} iconClass="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming appointments (optional) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Today&apos;s Schedule</h2>
            <Link className="text-sm text-blue-600 hover:underline" to="/DoctorAppointments">View all</Link>
          </div>
          {upcoming && upcoming.length > 0 ? (
            <ul className="divide-y">
              {upcoming.map((a, i) => (
                <li key={a.id || a._id || i} className="py-2 text-sm flex items-center justify-between">
                  <div>
                    <p className="font-medium">{a.patient_name || a.patient?.full_name || 'Patient'}</p>
                    <p className="text-gray-500 text-xs">{a.time || a.start_time || a.slot || ''}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-xs">{a.type || 'Session'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500 text-sm">{loading ? 'Loading...' : 'No sessions for today.'}</div>
          )}
        </div>

        {/* Recent patients (optional) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent Patients</h2>
            <Link className="text-sm text-blue-600 hover:underline" to="/Patients">Manage</Link>
          </div>
          {recentPatients && recentPatients.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentPatients.map((p, i) => (
                <li key={p.id || p._id || i} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <p className="font-medium text-sm">{p.full_name || p.name || 'Patient'}</p>
                  <p className="text-xs text-gray-500">{p.email || p.phone || ''}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500 text-sm">{loading ? 'Loading...' : 'No recent patients.'}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color, to }) {
  const content = (
    <div className="rounded-2xl p-4 bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-center gap-3">
        <div className={`${color || 'bg-gray-100 text-gray-700'} w-10 h-10 rounded-xl flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function ActionCard({ title, desc, to, icon: Icon, iconClass }) {
  return (
    <Link to={to} className="block rounded-2xl p-5 bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center ${iconClass || ''}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-gray-500">{desc}</p>
        </div>
      </div>
    </Link>
  );
}

KpiCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.string,
  to: PropTypes.string,
};

ActionCard.propTypes = {
  title: PropTypes.string.isRequired,
  desc: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  iconClass: PropTypes.string,
};