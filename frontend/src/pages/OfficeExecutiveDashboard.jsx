import React, { useEffect, useState } from 'react';
import { UserPlus, CreditCard, Users, Bed, CalendarCheck, Activity, PackageSearch, Stethoscope } from 'lucide-react';
import { User, Hospital, Rooms, Equipments } from '../services';

export default function OfficeExecutiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState({
    totalPatients: 0,
    totalRooms: 0,
    todaysAppointments: 0,
    todaysTherapy: 0,
    pendingBills: 0,
    newRegistrationsToday: 0,
    inventoryAlerts: 0,
    onDutyStaff: 0,
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const me = await User.me();
        const hospitalId = me?.hospital_id || me?.hospitalId;
        if (!hospitalId) throw new Error('No hospital associated');
        const [summary, rooms, equipment] = await Promise.all([
          Hospital.summary(hospitalId),
          Rooms.list(),
          Equipments.list(),
        ]);
        const newRegs = Number(summary?.patients_today || 0);
        const invAlerts = Array.isArray(equipment) ? equipment.filter((e) => (e.status && e.status !== 'available') || (typeof e.quantity === 'number' && e.quantity <= 0)).length : 0;
        const staffCount = typeof summary?.office_executives === 'number' && typeof summary?.doctors === 'number'
          ? (summary.office_executives + summary.doctors)
          : (summary?.office_executives || 0);
        const vals = {
          totalPatients: Number(summary?.patients || 0),
          totalRooms: Array.isArray(rooms) ? rooms.length : 0,
          todaysAppointments: Number(summary?.appointments_today ?? summary?.appointments_total ?? 0),
          todaysTherapy: Number(summary?.visits_today || 0),
          pendingBills: 0,
          newRegistrationsToday: newRegs,
          inventoryAlerts: invAlerts,
          onDutyStaff: staffCount,
        };
        if (mounted) setValues(vals);
      } catch (e) {
        if (mounted) setValues((v) => ({ ...v }));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const stats = [
    { title: 'Total Patients', value: String(values.totalPatients), icon: Users, bg: 'bg-blue-100', fg: 'text-blue-600' },
    { title: 'Total Rooms', value: String(values.totalRooms), icon: Bed, bg: 'bg-emerald-100', fg: 'text-emerald-600' },
    { title: "Today's Appointments", value: String(values.todaysAppointments), icon: CalendarCheck, bg: 'bg-indigo-100', fg: 'text-indigo-600' },
    { title: "Today's Therapy Schedules", value: String(values.todaysTherapy), icon: Activity, bg: 'bg-orange-100', fg: 'text-orange-600' },
    { title: 'Pending Bills', value: String(values.pendingBills), icon: CreditCard, bg: 'bg-rose-100', fg: 'text-rose-600' },
    { title: 'New Registrations Today', value: String(values.newRegistrationsToday), icon: UserPlus, bg: 'bg-purple-100', fg: 'text-purple-600' },
    { title: 'Inventory Alerts', value: String(values.inventoryAlerts), icon: PackageSearch, bg: 'bg-amber-100', fg: 'text-amber-600' },
    { title: 'On-Duty Staff', value: String(values.onDutyStaff), icon: Stethoscope, bg: 'bg-slate-100', fg: 'text-slate-600' },
  ];
  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
          <UserPlus className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Office Executive Dashboard</h1>
          <p className="text-gray-500">Tools for patient registration and administration.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((s) => (
          <div key={s.title} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.bg} ${s.fg}`}> 
              <s.icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500 truncate">{s.title}</p>
              <p className="text-2xl font-semibold text-gray-900">{loading ? '—' : s.value}</p>
            </div>
          </div>
        ))}
      </div>
      {/* ...rest of the dashboard content... */}
    </div>
  );
}
