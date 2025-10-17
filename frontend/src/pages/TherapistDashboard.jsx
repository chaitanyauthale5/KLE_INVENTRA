import React from 'react';
import { Activity, Calendar, ClipboardList } from 'lucide-react';

export default function TherapistDashboard() {
  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Therapist's Dashboard</h1>
          <p className="text-gray-500">Manage your daily sessions and patient progress.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Calendar className="text-green-500" /> Today's Sessions</h2>
            <p className="mt-2 text-gray-600">View your schedule for today.</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-xl font-semibold flex items-center gap-2"><ClipboardList className="text-blue-500" /> Session Notes</h2>
            <p className="mt-2 text-gray-600">Log notes and mark sessions as complete.</p>
        </div>
      </div>
    </div>
  );
}