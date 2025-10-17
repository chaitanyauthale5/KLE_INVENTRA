import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Activity, Info, ArrowRight } from "lucide-react";
import { User, Patient, TherapySession } from "@/services";

function Badge({ children, color = "blue" }) {
  const map = {
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    red: "bg-rose-100 text-rose-700 border-rose-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200",
  };
  return <span className={`px-2 py-0.5 text-xs rounded-full border ${map[color]}`}>{children}</span>;
}

export default function PatientSchedule() {
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const me = await User.me();
        if (!me) { setLoading(false); return; }
        const patients = await Patient.filter({ user_id: me.id });
        const p = patients?.[0] || null;
        setPatient(p);
        if (p) {
          const list = await TherapySession.filter({ patient_id: p.id }, "-scheduled_date", 60);
          setSessions(list || []);
        }
      } catch (e) {
        console.warn("Failed to load schedule, using demo", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Build grouped-by-date view with demo fallback
  const { grouped, upcoming, isDemo } = useMemo(() => {
    let list = Array.isArray(sessions) ? sessions : [];
    const hasData = list.length > 0;

    if (!hasData) {
      const today = new Date();
      const day = (offset) => {
        const d = new Date(today);
        d.setDate(d.getDate() + offset);
        return d.toISOString().slice(0, 10);
      };
      list = [
        { id: "d1", scheduled_date: day(0), scheduled_time: "10:00", therapy_type: "abhyanga", status: "scheduled", therapist_name: "Therapist Priya" },
        { id: "d2", scheduled_date: day(0), scheduled_time: "16:00", therapy_type: "shirodhara", status: "scheduled", therapist_name: "Therapist Priya" },
        { id: "d3", scheduled_date: day(1), scheduled_time: "09:30", therapy_type: "swedana", status: "scheduled", therapist_name: "Therapist Arjun" },
        { id: "d4", scheduled_date: day(2), scheduled_time: "11:00", therapy_type: "basti", status: "scheduled", therapist_name: "Therapist Arjun" },
        { id: "d5", scheduled_date: day(-1), scheduled_time: "10:00", therapy_type: "abhyanga", status: "completed", therapist_name: "Therapist Priya" },
      ];
    }

    // Sort by date then time
    const sorted = [...list].sort((a, b) => {
      const da = String(a.scheduled_date), db = String(b.scheduled_date);
      if (da !== db) return da.localeCompare(db);
      return String(a.scheduled_time || "").localeCompare(String(b.scheduled_time || ""));
    });

    const map = new Map();
    for (const s of sorted) {
      const key = String(s.scheduled_date || "");
      const arr = map.get(key) || [];
      arr.push(s);
      map.set(key, arr);
    }

    // upcoming = next 'scheduled' today or future
    const nowISO = new Date().toISOString().slice(0, 16);
    const upcomingItem = sorted.find((s) => s.status !== "completed");

    return { grouped: map, upcoming: upcomingItem || null, isDemo: !hasData };
  }, [sessions]);

  const statusColor = (s) =>
    s === "completed" ? "green" : s === "in_progress" ? "orange" : "blue";

  // Derive the assigned therapist name (from sessions or patient fallback)
  const therapistName = useMemo(() => {
    const fromSession = sessions.find(s => s.therapist_name || s.therapist)?.therapist_name || sessions.find(s => s.therapist)?.therapist?.full_name;
    return fromSession || patient?.assigned_therapist || patient?.assigned_doctor || "Assigned";
  }, [sessions, patient]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 w-64 rounded" />
        <div className="h-24 bg-gray-200 rounded-2xl" />
        <div className="h-96 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Schedule</h1>
              {isDemo && <Badge color="purple">Demo</Badge>}
            </div>
            <p className="text-gray-500">View therapies scheduled by your doctor with date & time</p>
            <div className="mt-2"><Badge color="purple">Therapist: {therapistName}</Badge></div>
          </div>
        </div>
        {upcoming && (
          <div className="hidden md:flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
            <span className="text-sm text-gray-500">Next</span>
            <Badge>{String(upcoming.scheduled_date)}</Badge>
            <Badge color="gray">{upcoming.scheduled_time || "--:--"}</Badge>
            <Badge color="green" >{String(upcoming.therapy_type || "therapy").replace(/_/g, " ")}</Badge>
            <Badge color="purple">Therapist: {upcoming.therapist_name || therapistName}</Badge>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
        <span className="mr-2">Legend:</span>
        <Badge color="blue">Scheduled</Badge>
        <Badge color="orange">In Progress</Badge>
        <Badge color="green">Completed</Badge>
      </div>

      {/* Schedule list grouped by date */}
      <div className="space-y-5">
        {Array.from(grouped.entries()).map(([date, items]) => (
          <div key={date} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-semibold text-gray-800">{date}</span>
              </div>
              <span className="text-xs text-gray-500">{items.length} session{items.length>1?"s":""}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {items.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Badge color={statusColor(s.status)}>{s.status?.replace(/_/g, " ") || "scheduled"}</Badge>
                    <div className="text-sm text-gray-900 font-medium capitalize">{String(s.therapy_type || 'therapy').replace(/_/g, ' ')}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{s.scheduled_time || "--:--"}</span>
                    </div>
                    <Badge color="gray">{s.room || "Room A"}</Badge>
                    <Badge color="purple">Therapist: {s.therapist_name || therapistName}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <Info className="w-4 h-4 text-blue-600 mt-0.5" />
        <div>
          Sessions are assigned by your clinic. If you need changes, please contact the front desk.
        </div>
      </div>
    </div>
  );
}
