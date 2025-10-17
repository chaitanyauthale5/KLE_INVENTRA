import React, { useEffect, useMemo, useState } from "react";
import { User, Patient, TherapySession } from "@/services";
import { TrendingUp } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

export default function PatientAnalytics() {
  const [currentUser, setCurrentUser] = useState(null);
  const [patient, setPatient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await User.me();
        setCurrentUser(me);
        if (!me) { setLoading(false); return; }

        const patients = await Patient.filter({ user_id: me.id });
        const p = patients?.[0] || null;
        setPatient(p);

        if (p) {
          const list = await TherapySession.filter({ patient_id: p.id }, "-scheduled_date", 60);
          setSessions(list || []);
        } else {
          setSessions([]);
        }
      } catch (e) {
        console.error("Failed to load analytics", e);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Build a simple cumulative completion trend and weekly aggregation
  const { trendData, weeklyData, isDemo } = useMemo(() => {
    const hasData = Array.isArray(sessions) && sessions.length > 0;

    if (!hasData) {
      // Provide nice-looking demo datasets
      const today = new Date();
      const day = (offset) => {
        const d = new Date(today);
        d.setDate(d.getDate() - offset);
        return d.toISOString().slice(0, 10);
      };
      const trend = [
        { date: day(35), completed: 0 },
        { date: day(30), completed: 1 },
        { date: day(25), completed: 2 },
        { date: day(20), completed: 3 },
        { date: day(15), completed: 4 },
        { date: day(10), completed: 6 },
        { date: day(5), completed: 7 },
        { date: day(0), completed: 9 },
      ];

      const weekly = [
        { week: "2025-W30", completed: 1 },
        { week: "2025-W31", completed: 2 },
        { week: "2025-W32", completed: 1 },
        { week: "2025-W33", completed: 3 },
        { week: "2025-W34", completed: 2 },
        { week: "2025-W35", completed: 4 },
      ];

      return { trendData: trend, weeklyData: weekly, isDemo: true };
    }

    // Normalize to date label (YYYY-MM-DD)
    const sorted = [...sessions].sort((a, b) => String(a.scheduled_date).localeCompare(String(b.scheduled_date)));
    let cumCompleted = 0;
    const trend = sorted.map((s) => {
      if (s.status === "completed") cumCompleted += 1;
      const dateLabel = String(s.scheduled_date || "");
      return {
        date: dateLabel,
        completed: cumCompleted,
      };
    });

    // Weekly aggregation: count completed per week number
    const byWeek = new Map();
    for (const s of sorted) {
      const d = new Date(s.scheduled_date || s.created_at || Date.now());
      // Week key as YYYY-WW
      const firstJan = new Date(d.getFullYear(), 0, 1);
      const days = Math.floor((d - firstJan) / (24 * 60 * 60 * 1000));
      const week = Math.ceil((d.getDay() + 1 + days) / 7);
      const key = `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
      const item = byWeek.get(key) || { week: key, completed: 0 };
      if (s.status === "completed") item.completed += 1;
      byWeek.set(key, item);
    }
    const weekly = Array.from(byWeek.values()).sort((a, b) => a.week.localeCompare(b.week));

    return { trendData: trend, weeklyData: weekly, isDemo: false };
  }, [sessions]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="h-72 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  // Even if no patient record is linked, render the graph areas with empty data

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Analytics & Report</h1>
              {isDemo && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 border border-blue-200">Demo</span>
              )}
            </div>
            <p className="text-gray-500">Your therapy progress and session trends</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm hover:bg-gray-800 border border-gray-900/10 shadow-sm"
        >
          Export Report
        </button>
      </div>

      {/* Current therapy progress */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-gray-800">Current Therapy Progress</div>
          <div className="text-xs text-gray-500">Based on your recent sessions</div>
        </div>
        <ChartContainer
          id="patient-trend"
          config={{ completed: { label: "Completed", color: "#22c55e" } }}
          className="w-full h-80"
        >
          <LineChart data={trendData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={24} />
            <YAxis allowDecimals={false} width={32} tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line type="monotone" dataKey="completed" stroke="var(--color-completed)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </div>

      {/* Overall treatment progress */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-gray-800">Overall Treatment Progress</div>
        </div>
        <ChartContainer
          id="patient-weekly"
          config={{ completed: { label: "Completed", color: "#3b82f6" } }}
          className="w-full h-80"
        >
          <LineChart data={weeklyData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} minTickGap={24} />
            <YAxis allowDecimals={false} width={32} tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line type="monotone" dataKey="completed" stroke="var(--color-completed)" strokeWidth={2} dot />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}
