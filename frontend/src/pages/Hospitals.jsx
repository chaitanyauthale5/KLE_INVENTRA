import { useState, useEffect } from "react";
import PropTypes from 'prop-types';

import { Hospital } from "@/services";
import { User } from "@/services";
import { Patient } from "@/services";
import { TherapySession } from "@/services";
import { motion } from "framer-motion";
import {
  Building,
  
  MapPin,
  Users,
  Calendar,
  Activity,
  TrendingUp,
  Mail
} from "lucide-react";

import { format } from "date-fns";

export default function HospitalsPage({ currentUser }) {
  const [effectiveUser, setEffectiveUser] = useState(currentUser);
  const [hospitals, setHospitals] = useState([]);
  const [hospitalStats, setHospitalStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Ensure we have a user even if not passed as prop (Routes children don't get cloneElement props)
  useEffect(() => {
    let mounted = true;
    if (!currentUser) {
      (async () => {
        try {
          const me = await User.me();
          if (mounted) setEffectiveUser(me);
        } catch {
          if (mounted) setEffectiveUser(null);
        }
      })();
    } else {
      setEffectiveUser(currentUser);
    }
    return () => { mounted = false; };
  }, [currentUser]);

  useEffect(() => {
    if (effectiveUser?.role === 'super_admin' || effectiveUser?.role === 'admin' || effectiveUser?.role === 'hospital_admin') {
      loadHospitals();
    }
  }, [effectiveUser?.role]);

  const loadHospitals = async () => {
    setIsLoading(true);
    try {
      const hospitalsData = await Hospital.list('-created_date', 100);
      setHospitals(hospitalsData);

      // Load stats for each hospital
      const statsPromises = hospitalsData.map(async (hospital) => {
        try {
          const [patients, sessions] = await Promise.all([
            Patient.filter({ hospital_id: hospital.id }).catch(() => []),
            TherapySession.filter({ hospital_id: hospital.id }).catch(() => [])
          ]);

          const todaySessions = sessions.filter(s => {
            try {
              return format(new Date(s.scheduled_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            } catch {
              return false;
            }
          });

          const completedSessions = sessions.filter(s => s.status === 'completed');

          return {
            hospitalId: hospital.id,
            totalPatients: patients.length,
            totalSessions: sessions.length,
            todaySessions: todaySessions.length,
            completedSessions: completedSessions.length,
            completionRate: sessions.length > 0 ? Math.round((completedSessions.length / sessions.length) * 100) : 0
          };
        } catch {
          return {
            hospitalId: hospital.id,
            totalPatients: 0,
            totalSessions: 0,
            todaySessions: 0,
            completedSessions: 0,
            completionRate: 0
          };
        }
      });

      const stats = await Promise.all(statsPromises);
      const statsMap = {};
      stats.forEach(stat => {
        statsMap[stat.hospitalId] = stat;
      });
      setHospitalStats(statsMap);

    } catch (error) {
      console.error("Error loading hospitals:", error);
    }
    setIsLoading(false);
  };

  // Add/CRUD helpers removed in simplified view

  // Delete helper removed in simplified view

  // Simplified listing without filters

  const HospitalCard = ({ hospital }) => {
    const stats = hospitalStats[hospital.id] || {};
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group"
      >
        {/* Hospital Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {hospital.logo_url ? (
              <img
                src={hospital.logo_url}
                alt={hospital.name}
                className="w-16 h-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center">
                <Building className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">{hospital.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <MapPin className="w-4 h-4" />
                <span>{hospital.address || 'Address not provided'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  hospital.subscription_plan === 'enterprise' 
                    ? 'bg-purple-100 text-purple-700'
                    : hospital.subscription_plan === 'premium'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {hospital.subscription_plan?.toUpperCase() || 'BASIC'}
                </span>
                {hospital.established_year && (
                  <span className="text-xs text-gray-500">Est. {hospital.established_year}</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions removed in simplified view */}
        </div>

        {/* Hospital Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-blue-600 mr-1" />
              <span className="text-lg font-bold text-blue-600">{stats.totalPatients || 0}</span>
            </div>
            <div className="text-xs text-gray-500">Patients</div>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <Calendar className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-lg font-bold text-green-600">{stats.todaySessions || 0}</span>
            </div>
            <div className="text-xs text-gray-500">Today</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <Activity className="w-4 h-4 text-purple-600 mr-1" />
              <span className="text-lg font-bold text-purple-600">{stats.totalSessions || 0}</span>
            </div>
            <div className="text-xs text-gray-500">Sessions</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-orange-600 mr-1" />
              <span className="text-lg font-bold text-orange-600">{stats.completionRate || 0}%</span>
            </div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
        </div>

        {/* Hospital Contact Info */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span>{hospital.email || '—'}</span>
          </div>
          <div className="text-xs">
            Added {hospital.created_date ? format(new Date(hospital.created_date), 'MMM dd, yyyy') : 'Recently'}
          </div>
        </div>
      </motion.div>
    );
  };
  
  // PropTypes for HospitalCard (defined inside HospitalsPage scope)
  HospitalCard.propTypes = {
    hospital: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      logo_url: PropTypes.string,
      name: PropTypes.string.isRequired,
      address: PropTypes.string,
      subscription_plan: PropTypes.string,
      established_year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      email: PropTypes.string,
      created_date: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)])
    }).isRequired
  };

  

  if (effectiveUser === undefined) {
    return (
      <div className="p-8 text-center text-gray-500">Loading...</div>
    );
  }
  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-40 bg-gray-200 rounded-2xl"></div>
          <div className="h-40 bg-gray-200 rounded-2xl"></div>
          <div className="h-40 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center">
          <Building className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hospitals</h1>
          <p className="text-gray-500">Managed facilities</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {hospitals.map((h) => (
          <HospitalCard key={h.id} hospital={h} />
        ))}
      </div>
      {hospitals.length === 0 && (
        <div className="text-center text-gray-500 py-12">No hospitals found</div>
      )}
    </div>
  );
};

HospitalsPage.propTypes = {
  currentUser: PropTypes.object
};