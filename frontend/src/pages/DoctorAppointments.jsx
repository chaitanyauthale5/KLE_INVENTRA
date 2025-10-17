import { useEffect, useMemo, useState } from 'react';
import { Appointments, User, Patient } from '@/services';
import { Calendar, Users, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function DoctorAppointments({ currentUser }) {
  // PropTypes will be defined at the bottom


  const [list, setList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [patientMap, setPatientMap] = useState({}); // id -> name/email

  useEffect(() => {
    (async () => {
      let me = currentUser;
      if (!me) me = await User.me();
      await reload();
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = async () => {
    const appts = await Appointments.mineForStaff();
    setList(appts);
    // Load patient identities for display
    try {
      const uniqueIds = [...new Set(appts.map(a => a.patient_id).filter(Boolean).map(String))];
      if (uniqueIds.length) {
        const entries = await Promise.all(uniqueIds.map(async (pid) => {
          try {
            // First try to find by linked user_id
            let name;
            try {
              const res = await Patient.filter({ user_id: pid });
              const p = res && res[0];
              name = p?.full_name || p?.name;
            } catch {}
            if (!name) {
              // If patient_id is actually a patient record id
              try {
                const p = await Patient.get(pid).catch(() => null);
                name = p?.full_name || p?.name;
              } catch {}
            }
            if (!name) name = pid;
            return [pid, name];
          } catch {
            return [pid, pid];
          }
        }));
        setPatientMap(Object.fromEntries(entries));
      } else {
        setPatientMap({});
      }
    } catch {
      // ignore name enrichment errors
    }
  };

  const grouped = useMemo(() => {
    const g = { pending: [], confirmed: [], completed: [], cancelled: [] };
    for (const a of list) {
      (g[a.status] || (g[a.status] = [])).push(a);
    }
    return g;
  }, [list]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
        </div>
        <div className="h-96 bg-gray-200 rounded-3xl"></div>
      </div>
    );
  }

  const count = (k) => grouped[k]?.length || 0;

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Appointments Management</h1>
            <p className="text-gray-500">All patient bookings with you</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard title="Pending" value={count('pending')} icon={<Clock className="w-5 h-5" />} className="bg-yellow-50"/>
        <SummaryCard title="Confirmed" value={count('confirmed')} icon={<Calendar className="w-5 h-5" />} className="bg-blue-50"/>
        <SummaryCard title="Completed" value={count('completed')} icon={<CheckCircle2 className="w-5 h-5" />} className="bg-green-50"/>
        <SummaryCard title="Cancelled" value={count('cancelled')} icon={<XCircle className="w-5 h-5" />} className="bg-red-50"/>
      </div>

      {/* Lists */}
      <Section title="Pending" items={grouped.pending} empty="No pending appointments." patientMap={patientMap} />
      <Section title="Confirmed" items={grouped.confirmed} empty="No confirmed appointments." patientMap={patientMap} />
      <Section title="Completed" items={grouped.completed} empty="No completed appointments." patientMap={patientMap} />
      <Section title="Cancelled" items={grouped.cancelled} empty="No cancelled appointments." patientMap={patientMap} />
    </div>
  );
}

function SummaryCard({ title, value, icon, className }) {
  return (
    <div className={`rounded-2xl p-4 border border-gray-100 ${className || 'bg-white'}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600">{title}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Section({ title, items, empty, patientMap }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{title}</h2>
      <div className="space-y-3">
        {items.map(a => (
          <div key={a.id} className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="font-medium text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4" /> Patient: {a.patient_name || patientMap?.[String(a.patient_id)] || String(a.patient_id)}
              </div>
              <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">{a.status}</div>
            </div>
            <div className="text-gray-600 text-sm mt-1">{new Date(a.start_time).toLocaleString()} - {new Date(a.end_time).toLocaleTimeString()}</div>
            {a.notes && <div className="text-gray-500 text-sm mt-1">Notes: {a.notes}</div>}
            <div className="mt-3 flex gap-2">
              {a.status === 'pending' && (
                <>
                  <button
                    onClick={async () => { await Appointments.confirm(a.id); window.showNotification?.({ type: 'success', title: 'Confirmed', message: 'Appointment confirmed' }); window.location.reload(); }}
                    className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm"
                  >Confirm</button>
                  <button
                    onClick={async () => { await Appointments.cancel(a.id); window.showNotification?.({ type: 'success', title: 'Cancelled', message: 'Appointment cancelled' }); window.location.reload(); }}
                    className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm"
                  >Cancel</button>
                </>
              )}
              {a.status === 'confirmed' && (
                <button
                  onClick={async () => { await Appointments.complete(a.id); window.showNotification?.({ type: 'success', title: 'Completed', message: 'Appointment completed' }); window.location.reload(); }}
                  className="px-3 py-2 rounded-lg bg-green-50 text-green-700 text-sm"
                >Mark Completed</button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-gray-500">{empty}</div>}
      </div>
    </div>
  );
}

DoctorAppointments.propTypes = {
  currentUser: (props, propName, componentName) => {
    if (props[propName] && typeof props[propName] !== 'object') {
      return new Error(`Invalid prop '${propName}' supplied to '${componentName}'. Expected an object.`);
    }
  }
};

function isNode(prop, propName, componentName) {
  // Accepts anything React can render
  const value = prop[propName];
  if (value !== undefined && typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'object' && typeof value !== 'function') {
    return new Error(`Invalid prop '${propName}' supplied to '${componentName}'. Expected a renderable node.`);
  }
}

SummaryCard.propTypes = {
  title: (props, propName, componentName) => {
    if (typeof props[propName] !== 'string') {
      return new Error(`Invalid prop '${propName}' supplied to '${componentName}'. Expected a string.`);
    }
  },
  value: (props, propName, componentName) => {
    if (typeof props[propName] !== 'number') {
      return new Error(`Invalid prop '${propName}' supplied to '${componentName}'. Expected a number.`);
    }
  },
  icon: isNode,
  className: (props, propName, componentName) => {
    if (props[propName] && typeof props[propName] !== 'string') {
      return new Error(`Invalid prop '${propName}' supplied to '${componentName}'. Expected a string.`);
    }
  }
};

Section.propTypes = {
  title: (props, propName, componentName) => {
    if (typeof props[propName] !== 'string') {
      return new Error(`Invalid prop '${propName}' supplied to '${componentName}'. Expected a string.`);
    }
  },
  items: (props, propName, componentName) => {
    if (!Array.isArray(props[propName])) {
      return new Error(`Invalid prop '${propName}' supplied to '${componentName}'. Expected an array.`);
    }
  },
  empty: (props, propName, componentName) => {
    if (typeof props[propName] !== 'string') {
      return new Error(`Invalid prop '${propName}' supplied to '${componentName}'. Expected a string.`);
    }
  },
  patientMap: (props, propName, componentName) => {
    if (props[propName] && typeof props[propName] !== 'object') {
      return new Error(`Invalid prop '${propName}' supplied to '${componentName}'. Expected an object.`);
    }
  }
};
