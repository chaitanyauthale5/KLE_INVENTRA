import { useState, useEffect, useCallback } from "react";
import PropTypes from 'prop-types';
import { Patient } from "@/services";
import { User } from "@/services";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Users,
  Search,
  Eye,
  Edit,
  Trash2,
  Filter,
  MoreVertical,
  Heart,
  Phone,
  FileText,
  
} from "lucide-react";
import AddPatientModal from "../components/patients/AddPatientModal";
import PatientDetailModal from "../components/patients/PatientDetailModal";
import PrescriptionRecordsModal from "../components/prescriptions/PrescriptionRecordsModal.jsx";
import BulkUploadModal from "../components/patients/BulkUploadModal";

export default function PatientsPage({ currentUser }) {
  const [allPatients, setAllPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [self, setSelf] = useState(currentUser);

  useEffect(() => {
    let mounted = true;
    if (!currentUser) {
      (async () => {
        try {
          const me = await User.me();
          if (mounted) setSelf(me);
        } catch {
          if (mounted) setSelf(null);
        }

PatientsPage.propTypes = {
  currentUser: PropTypes.object,
};
      })();
    } else {
      setSelf(currentUser);
    }
    return () => { mounted = false; };
  }, [currentUser]);

  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false); // Renamed state variable
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [showPrescriptionsModal, setShowPrescriptionsModal] = useState(false);
  const [selectedPatientObj, setSelectedPatientObj] = useState(null);

  const loadPatients = useCallback(async () => {
    const user = self;
    if (!user) return;
    setIsLoading(true);
    try {
      // Fetch patients with records (appointment_count, last_appointment)
      // Backend already scopes non-super users to their hospital, so fetch as-is
      const patientsData = await Patient.withRecords({});
      setAllPatients(patientsData);
      setFilteredPatients(patientsData);
      
    } catch (error) {
      console.error("Failed to load data:", error);
      window.showNotification?.({
        type: 'error',
        title: 'Data Load Failed',
        message: 'Could not load patient data. Please try again.',
        autoClose: true
      });
    }
    setIsLoading(false);
  }, [self]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const handlePatientAdded = (options = {}) => {
    loadPatients();
    if (options.stayAtTop) {
      window.scrollTo(0, 0);
    }
  };

  // handlePatientUpdated is implicitly handled by handlePatientAdded as it triggers a reload.

  useEffect(() => {
    let filtered = allPatients;
    
    if (searchTerm) {
      filtered = filtered.filter(patient => 
        patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.patient_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.current_conditions?.some(condition => 
          condition.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(patient => 
        (patient.status || 'active').toLowerCase() === filterStatus
      );
    }
    
    setFilteredPatients(filtered);
  }, [allPatients, searchTerm, filterStatus]);

  const deletePatient = async (patientId) => { // Renamed from handleDeletePatient
    if (!window.confirm("Are you sure you want to delete this patient? This action cannot be undone.")) {
      return;
    }
    
    try {
      await Patient.delete(patientId);
      setAllPatients(prev => prev.filter(p => p.id !== patientId));
      if (window.showNotification) {
        window.showNotification({
          type: 'success',
          title: 'Patient Deleted',
          message: 'Patient record has been successfully removed from the system.',
          autoClose: true
        });
      }
    } catch (error) {
      console.error("Failed to delete patient:", error);
      if (window.showNotification) {
        window.showNotification({
          type: 'error',
          title: 'Delete Failed',
          message: 'Unable to delete patient. Please try again.',
          autoClose: true
        });
      }
    }
  };

  const handleViewDetails = (patientId) => {
    setSelectedPatientId(patientId);
    setShowDetailModal(true);
  };

  const handleOpenPrescriptions = (patient) => {
    setSelectedPatientObj(patient);
    setShowPrescriptionsModal(true);
  };

  const handleEditPatient = (patient) => {
    setEditingPatient(patient);
    setIsAddPatientModalOpen(true); // Changed to new state variable
  };

  // handleAssignGuardian removed

  const getStatusColor = (status) => {
    const colors = {
      'active': 'bg-green-100 text-green-700',
      'recovering': 'bg-blue-100 text-blue-700', 
      'critical': 'bg-red-100 text-red-700',
      'inactive': 'bg-gray-100 text-gray-700'
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  const getProgressColor = (score) => {
    if (score >= 80) return 'from-green-500 to-green-600';
    if (score >= 60) return 'from-blue-500 to-blue-600';
    if (score >= 40) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const PatientCard = ({ patient, onEdit, onDelete, onViewDetails }) => {
    const safeProgressScore = Number(patient.progress_score) || 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-blue-200 transition-all duration-300 group"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">{patient.full_name?.charAt(0).toUpperCase() || (patient.patient_id ? patient.patient_id.charAt(0).toUpperCase() : 'P')}</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                {patient.full_name || `Patient ID: ${patient.patient_id}`}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>ID: {patient.patient_id || patient.id}</span>
                <span>•</span>
                <span>{patient.age ? `${patient.age} years` : 'Age not specified'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
              {patient.status || 'Active'}
            </span>
            
            <div className="relative group/actions">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="More actions">
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>
              <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all z-10 min-w-[160px] transform origin-top-right scale-95 group-hover/actions:scale-100">
                <button onClick={() => onViewDetails(patient.id)} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                  <Eye className="w-4 h-4" /> View Details & Report
                </button>
                <button onClick={() => handleOpenPrescriptions(patient)} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Prescriptions & Records
                </button>
                <button onClick={() => onEdit(patient)} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                  <Edit className="w-4 h-4" /> Edit Patient
                </button>
                {/* Assign Guardian removed */}
                <button onClick={() => onDelete(patient.id)} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Delete Patient
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Heart className="w-4 h-4 text-red-500" />
            <span>{patient.assigned_doctor || 'No doctor assigned'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="w-4 h-4 text-blue-500" />
            <span>{patient.phone || 'No phone'}</span>
          </div>
        </div>

        {/* Appointment summary */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Appointments:</span> {patient.appointment_count || 0}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Last Appointment:</span> {patient.last_appointment ? format(new Date(patient.last_appointment), 'MMM dd, yyyy') : '—'}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Treatment Progress</span>
            <span className="text-sm font-bold text-gray-800">{safeProgressScore}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full bg-gradient-to-r ${getProgressColor(safeProgressScore)} transition-all duration-500`}
              style={{ width: `${safeProgressScore}%` }}
            ></div>
          </div>
        </div>

        {patient.current_conditions && patient.current_conditions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {patient.current_conditions.slice(0, 3).map((condition, index) => (
              <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                {condition}
              </span>
            ))}
            {patient.current_conditions.length > 3 && (
              <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded-full text-xs">
                +{patient.current_conditions.length - 3} more
              </span>
            )}
          </div>
        )}
      </motion.div>
    );
  };
  // PropTypes for inner card component (declared inside to avoid scope issues)
  PatientCard.propTypes = {
    patient: PropTypes.shape({
      id: PropTypes.any,
      full_name: PropTypes.string,
      patient_id: PropTypes.string,
      age: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      status: PropTypes.string,
      progress_score: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      assigned_doctor: PropTypes.string,
      phone: PropTypes.string,
      appointment_count: PropTypes.number,
      last_appointment: PropTypes.any,
      current_conditions: PropTypes.arrayOf(PropTypes.string),
    }).isRequired,
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onViewDetails: PropTypes.func.isRequired,
  };

  if (!self || isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Patient Management</h1>
              <p className="text-gray-500">{filteredPatients.length} patients in your care</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddPatientModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-green-600 text-white font-medium hover:shadow-md"
            >
              Add Patient
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search patients by name, ID, or condition..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative w-full md:w-auto">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full md:w-auto pl-10 pr-4 py-3 border border-gray-200 rounded-xl appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="recovering">Recovering</option>
                <option value="critical">Critical</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Patients Table (or Grid of Cards) */}
          <div className="overflow-x-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredPatients.map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    onEdit={handleEditPatient}
                    onViewDetails={handleViewDetails}
                    
                    onDelete={deletePatient} // Changed to new function name
                  />
                ))}
              </AnimatePresence>
            </div>

            {filteredPatients.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-500 mb-2">No patients found</h3>
                <p className="text-gray-400 mb-4">
                  {(searchTerm || filterStatus !== 'all') 
                    ? 'Try adjusting your search or filter criteria.' 
                    : 'Get started by adding your first patient.'}
                </p>
                {(!searchTerm && filterStatus === 'all') && (
                  <button
                    onClick={() => setIsAddPatientModalOpen(true)} // Changed to new state variable
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                  >
                    Add First Patient
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddPatientModal
        isOpen={isAddPatientModalOpen} // Changed to new state variable
        onClose={() => {
          setIsAddPatientModalOpen(false); // Changed to new state variable
          setEditingPatient(null);
        }}
        onPatientAdded={handlePatientAdded}
        patient={editingPatient}
        currentUser={self}
      />

      <PatientDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        patientId={selectedPatientId}
        onEditPatient={handleEditPatient}
      />

      <PrescriptionRecordsModal
        isOpen={showPrescriptionsModal}
        onClose={() => setShowPrescriptionsModal(false)}
        patient={selectedPatientObj}
        currentUser={self}
      />

      <BulkUploadModal
        isOpen={false}
        onClose={() => {}}
        onUploadComplete={loadPatients}
      />

      {/* AssignGuardianModal removed */}
    </>
  );
}

PatientsPage.propTypes = {
  currentUser: PropTypes.object,
};
