import React, { useEffect, useState, useMemo } from 'react';
import { User, Patient, TherapySession } from '@/services';
import { Activity, CheckCircle, Clock, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function PatientProgress() {
  const [currentUser, setCurrentUser] = useState(null);
  const [patient, setPatient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await User.me();
        setCurrentUser(me);
        if (!me) { setIsLoading(false); return; }

        // Resolve patient linked to this user
        const patients = await Patient.filter({ user_id: me.id });
        const p = patients?.[0] || null;
        setPatient(p);

        if (p) {
          // Load last 30 sessions for simple trend
          const list = await TherapySession.filter({ patient_id: p.id }, '-scheduled_date', 30);
          setSessions(list);
        } else {
          setSessions([]);
        }
      } catch (e) {
        console.error('Failed to load progress', e);
        setSessions([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const total = sessions.length;
    const completed = sessions.filter(s => s.status === 'completed').length;
    const pending = sessions.filter(s => s.status === 'scheduled' || s.status === 'in_progress').length;
    const progressScore = typeof patient?.progress_score === 'number' ? patient.progress_score : 0;
    return { total, completed, pending, progressScore };
  }, [sessions, patient]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6">
        <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-800">
          No patient record linked to your account yet.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Track Progress</h1>
          <p className="text-gray-500">Your Panchakarma journey overview</p>
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Progress Score</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold text-gray-900">{stats.progressScore}%</span>
            <Activity className="w-6 h-6 text-purple-600" />
          </div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500" style={{ width: `${Math.min(100, Math.max(0, stats.progressScore))}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Completed Sessions</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold text-gray-900">{stats.completed}</span>
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Pending</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold text-gray-900">{stats.pending}</span>
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Total Sessions</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold text-gray-900">{stats.total}</span>
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Recent sessions timeline */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Sessions</h2>
        {sessions.length === 0 ? (
          <div className="text-gray-500">No sessions found.</div>
        ) : (
          <div className="space-y-3">
            {sessions.slice(0, 10).map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                <div>
                  <div className="font-medium capitalize text-gray-900">{(s.therapy_type || 'therapy').replace(/_/g, ' ')}</div>
                  <div className="text-xs text-gray-500">{s.scheduled_date} {s.scheduled_time ? `• ${s.scheduled_time}` : ''}</div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs capitalize ${s.status === 'completed' ? 'bg-green-100 text-green-700' : s.status === 'in_progress' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{s.status || 'scheduled'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
