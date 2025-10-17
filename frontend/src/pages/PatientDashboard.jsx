import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from 'react-router-dom';

import { Patient } from "@/services";
import { TherapySession } from "@/services";
import { Feedback } from "@/services";
import { Notification } from "@/services";
import { User } from "@/services";
import { Prescription } from "@/services";
import ClayCard from "../components/shared/ClayCard";
import ClayButton from "../components/shared/ClayButton";
import ProgressCard from "../components/shared/ProgressCard";
import { Calendar, Activity, Heart, Bell, CheckCircle, Clock, AlertTriangle, FileText } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

export default function PatientDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);

  const [patientData, setPatientData] = useState(null);
  const [todaySessions, setTodaySessions] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Smooth-scroll to sections when hash is present (e.g., #progress)
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
    }
  }, [location.hash]);

  const loadDashboardData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);

      const patient = await Patient.me();
      if (patient) {
        setPatientData(patient);

        const today = format(new Date(), 'yyyy-MM-dd');
        const todaySessionsData = await TherapySession.filter({ 
          patient_id: patient.id, 
          scheduled_date: today 
        }, '-scheduled_time');
        setTodaySessions(todaySessionsData);

        const upcomingSessionsData = await TherapySession.filter({ 
          patient_id: patient.id,
          status: 'scheduled'
        }, 'scheduled_date', 5);
        setUpcomingSessions(upcomingSessionsData.filter(s => s.scheduled_date !== today));

        const feedbackData = await Feedback.filter({ 
          patient_id: patient.id 
        }, '-created_date', 3);
        setRecentFeedback(feedbackData);

        const notificationData = await Notification.filter({ 
          recipient_id: user?.id 
        }, '-created_date', 5);
        setNotifications(notificationData);

        const allRx = await Prescription.mine();
        const pid = String(patient.id);
        const mineRx = (allRx || []).filter(r => String(r?.patient_id?._id || r?.patient_id) === pid).slice(0, 3);
        setRecentPrescriptions(mineRx);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    }
    setIsLoading(false);
  };

  const safeFormatDate = (value, fmt = 'MMM d') => {
    if (!value) return 'TBD';
    let d = value instanceof Date ? value : new Date(value);
    if (!isValid(d)) {
      try { d = parseISO(String(value)); } catch { d = null; }
    }
    if (d && isValid(d)) {
      try { return format(d, fmt); } catch { return 'TBD'; }
    }
    return 'TBD';
  };

  const getStatusColor = (status) => {
    const colors = {
      'scheduled': 'text-blue-600 bg-blue-100',
      'in_progress': 'text-orange-600 bg-orange-100',
      'completed': 'text-green-600 bg-green-100',
      'cancelled': 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getTherapyIcon = (therapyType) => {
    const icons = {
      'vamana': '🤮',
      'virechana': '💊',
      'basti': '💉',
      'nasya': '👃',
      'raktamokshana': '🩸',
      'abhyanga': '💆‍♀️',
      'shirodhara': '🫗',
      'swedana': '♨️'
    };
    return icons[therapyType] || '🏥';
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Welcome Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Welcome back, {currentUser?.full_name || 'Patient'}!
        </h1>
        <p className="text-gray-600 text-lg">
          Track your Panchakarma journey and healing progress
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div id="progress">
        <ProgressCard
          title="Progress Score"
          value={patientData?.progress_score || 0}
          suffix="%"
          icon={Activity}
          color="purple"
        />
        </div>
        <ProgressCard
          title="Today's Sessions"
          value={todaySessions.length}
          icon={Calendar}
          color="blue"
        />
        <ProgressCard
          title="Completed Sessions"
          value={todaySessions.filter(s => s.status === 'completed').length}
          icon={CheckCircle}
          color="green"
        />
        <ProgressCard
          title="Unread Notifications"
          value={notifications.filter(n => !n.is_read).length}
          icon={Bell}
          color="orange"
        />
      </div>

      {/* Today's Schedule */}
      <ClayCard>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-400 rounded-2xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Today's Schedule</h2>
            <p className="text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
        </div>

        {todaySessions.length > 0 ? (
          <div className="space-y-4">
            {todaySessions.map((session) => (
              <div
                key={session.id}
                className="bg-white/50 rounded-2xl p-4 border border-white/50 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{getTherapyIcon(session.therapy_type)}</div>
                    <div>
                      <h3 className="font-semibold text-gray-800 capitalize">
                        {session.therapy_type.replace('_', ' ')}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {session.scheduled_time} • Room {session.room_number || 'TBD'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-xl text-sm font-medium ${getStatusColor(session.status)}`}>
                      {session.status.replace('_', ' ')}
                    </span>
                    {session.status === 'scheduled' && (
                      <Clock className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                </div>
                {session.pre_instructions && (
                  <div className="mt-3 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Pre-session Instructions:</p>
                        <p className="text-sm text-yellow-700 mt-1">{session.pre_instructions}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No sessions today</h3>
            <p className="text-gray-400">Enjoy your rest day!</p>
          </div>
        )}
      </ClayCard>

      {/* Upcoming Sessions & Recent Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <ClayCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-400 rounded-2xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Upcoming Sessions</h3>
          </div>

          {upcomingSessions.length > 0 ? (
            <div className="space-y-3">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white/30 rounded-xl p-3 border border-white/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getTherapyIcon(session.therapy_type)}</span>
                      <div>
                        <p className="font-medium text-gray-800 capitalize">
                          {session.therapy_type.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {safeFormatDate(session.scheduled_date, 'MMM d')} at {session.scheduled_time || 'TBD'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No upcoming sessions</p>
          )}
        </ClayCard>

        {/* Quick Actions */}
        <ClayCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-400 rounded-2xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Quick Actions</h3>
          </div>

          <div className="space-y-3">
            <Link to="/TherapyScheduling" className="block">
              <ClayButton
                variant="primary"
                className="w-full justify-start"
                size="lg"
              >
                <Calendar className="w-5 h-5 mr-3" />
                View Full Schedule
              </ClayButton>
            </Link>
            <Link to="/PatientDashboard#progress" className="block">
              <ClayButton
                variant="success"
                className="w-full justify-start"
                size="lg"
              >
                <Activity className="w-5 h-5 mr-3" />
                Track Progress
              </ClayButton>
            </Link>
            <ClayButton
              variant="warning"
              className="w-full justify-start"
              size="lg"
              onClick={() => navigate('/Notifications')}
            >
              <Bell className="w-5 h-5 mr-3" />
              Check Notifications
            </ClayButton>
          </div>
        </ClayCard>

        {/* Recent Prescriptions */}
        <ClayCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-2xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Recent Prescriptions</h3>
          </div>

          {recentPrescriptions.length > 0 ? (
            <div className="space-y-3">
              {recentPrescriptions.map((p) => (
                <div
                  key={p.id}
                  className="bg-white/30 rounded-xl p-3 border border-white/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getTherapyIcon(p.therapy_type)}</span>
                      <div>
                        <p className="font-medium text-gray-800 capitalize">
                          {(p.meds||[]).map(m=>m.name).filter(Boolean).slice(0,3).join(', ')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {safeFormatDate(p.created_date, 'MMM d')} 
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No prescriptions yet.</p>
          )}
        </ClayCard>
      </div>
    </div>
  );
}