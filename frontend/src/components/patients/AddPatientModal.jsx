import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { User } from '@/services';
import { Patient } from '@/services';
import { Hospital } from '@/services';
import { X, Plus, UserPlus, Heart, MapPin, Shield } from 'lucide-react';

export default function AddPatientModal({ isOpen, onClose, onPatientAdded, patient, currentUser }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    age: '',
    gender: 'other',
    address: '', // New field
    medicalHistory: '',
    currentConditions: '',
    allergies: '',
    assignedDoctor: '',
    Id: '', // New field for  assignment
    progressScore: 0
  });
  const [doctors, setDoctors] = useState([]); // Doctors list for assignment
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (patient && isOpen) {
      setFormData({
        fullName: patient.full_name || '',
        email: patient.email || '',
        phone: patient.phone || '',
        age: patient.age || '',
        gender: patient.gender || 'other',
        address: patient.address || '', // Populate address
        medicalHistory: patient.medical_history || '',
        currentConditions: Array.isArray(patient.current_conditions) ? patient.current_conditions.join(', ') : '',
        allergies: Array.isArray(patient.allergies) ? patient.allergies.join(', ') : '',
        assignedDoctor: patient.assigned_doctor || '',
        Id: patient._ids?.[0] || '', // Assuming one  for simplicity in UI
        progressScore: patient.progress_score || 0
      });
    } else if (!patient && isOpen) {
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        age: '',
        gender: 'other',
        address: '', // Reset address for new patient
        medicalHistory: '',
        currentConditions: '',
        allergies: '',
        assignedDoctor: currentUser?.full_name || '', // Default to current doctor
        Id: '', // Reset Id for new patient
        progressScore: 0
      });
    }

    // Load doctors for assignment
    const loadDoctors = async () => {
      try {
        if (!currentUser?.hospital_id) {
          setDoctors([]);
          return;
        }
        const staff = await Hospital.listStaff(currentUser.hospital_id);
        const docs = (staff || []).filter(u => u.role === 'doctor');
        setDoctors(docs);
      } catch (err) {
        console.error('Failed to load doctors', err);
        setDoctors([]);
      }
    };
    if (isOpen) {
      loadDoctors();
    }
  }, [patient, isOpen, currentUser]); // Added currentUser to dependencies

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    // If changing doctor Id in assignment, also set assignedDoctor name for UI consistency
    if (name === 'Id') {
      const doc = doctors.find(d => String(d.id) === String(value));
      setFormData(prev => ({ ...prev, Id: value, assignedDoctor: doc ? (doc.full_name || doc.name || '') : '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!formData.fullName || !formData.email) {
      setError('Full Name and Email are required.');
      setIsLoading(false);
      return;
    }

    try {
      const patientData = {
        age: Number(formData.age) || 0,
        gender: formData.gender,
        address: formData.address, // Include address
        medical_history: formData.medicalHistory,
        current_conditions: formData.currentConditions.split(',').map(s => s.trim()).filter(s => s),
        allergies: formData.allergies.split(',').map(s => s.trim()).filter(s => s),
        assigned_doctor: formData.assignedDoctor,
        progress_score: Number(formData.progressScore) || 0,
        full_name: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        // doctor assignment id kept for future linkage if needed
        doctor_id: formData.Id || undefined,
        hospital_id: currentUser?.hospital_id, // Ensure hospital_id is set
      };

      if (patient) {
        // Update existing patient
        await Patient.update(patient.id, patientData);
        window.showNotification?.({
          type: 'success',
          title: 'Patient Updated',
          message: `${formData.fullName} has been updated successfully.`,
          autoClose: true
        });
      } else {
        // Create new patient
        await Patient.create({
          user_id: `user_${Date.now()}`, // Generate a temporary user ID
          ...patientData
        });
        window.showNotification?.({
          type: 'success',
          title: 'Patient Added',
          message: `${formData.fullName} has been added to the system.`,
          autoClose: true
        });
      }
      
      onPatientAdded({ stayAtTop: true }); // Pass option to stay at top
      onClose();
    } catch (err) {
      console.error("Failed to save patient:", err);
      setError('Failed to save patient. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex p-4 md:p-6 overflow-y-auto">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full md:w-[92vw] lg:w-[84vw] xl:w-[70vw] max-w-[1160px] max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-3rem)] flex flex-col mx-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-100 bg-white rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
              {patient ? <UserPlus className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              {patient ? 'Edit Patient Details' : 'Add New Patient'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6 overscroll-contain">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 lg:gap-x-8 gap-y-6">
            {/* Left Column */}
            <div>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-2xl space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  Personal & Contact Information
                </h3>
                <input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Full Name *" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" required />
                <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email Address *" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" required />
                <input name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="Phone Number" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" />
                <div className="grid grid-cols-2 gap-4">
                  <input name="age" type="number" value={formData.age} onChange={handleChange} placeholder="Age" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" />
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                 <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input name="address" value={formData.address} onChange={handleChange} placeholder="Patient Address" className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-6 rounded-2xl mt-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-teal-600" />
                   Assignment
                </h3>
                <select name="Id" value={formData.Id} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white">
                  <option value="">No Doctor Assigned</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{(d.full_name || d.name) || 'Doctor'} {d.email ? `(${d.email})` : ''}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">Select from existing doctors. New staff can be invited from the Staff page.</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="bg-gradient-to-r from-green-50 to-lime-50 p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Heart className="w-5 h-5 text-green-600" />
                Medical Information
              </h3>
              <textarea name="medicalHistory" value={formData.medicalHistory} onChange={handleChange} placeholder="Medical History (e.g., hypertension)" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 h-24" />
              <input name="currentConditions" value={formData.currentConditions} onChange={handleChange} placeholder="Current Conditions (comma-separated)" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
              <input name="allergies" value={formData.allergies} onChange={handleChange} placeholder="Allergies (comma-separated)" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Doctor
                </label>
                 <input name="assignedDoctor" value={formData.assignedDoctor} onChange={handleChange} placeholder="Doctor's Name" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Progress Score (0-100)
                </label>
                <input name="progressScore" type="number" min="0" max="100" value={formData.progressScore} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
          </div>
        </form>

        <div className="sticky bottom-0 z-10 p-6 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-3xl">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium flex items-center gap-2 disabled:opacity-50 hover:shadow-lg transition-all"
          >
            {isLoading ? 'Saving...' : (patient ? 'Update Patient' : 'Add Patient')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Move prop types outside component definition (ensures they are not inside hooks/effects)
AddPatientModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onPatientAdded: PropTypes.func.isRequired,
  patient: PropTypes.shape({
    id: PropTypes.any,
    full_name: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    age: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    gender: PropTypes.string,
    address: PropTypes.string,
    medical_history: PropTypes.string,
    current_conditions: PropTypes.arrayOf(PropTypes.string),
    allergies: PropTypes.arrayOf(PropTypes.string),
    assigned_doctor: PropTypes.string,
    _ids: PropTypes.array,
    progress_score: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  currentUser: PropTypes.shape({
    full_name: PropTypes.string,
    hospital_id: PropTypes.any,
  }),
};
