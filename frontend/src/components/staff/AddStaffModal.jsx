import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Hospital } from '@/services';
import { X, UserPlus } from 'lucide-react';

export default function AddStaffModal({ isOpen, onClose, onStaffAdded, currentUser, staffMember }) {
  const [formData, setFormData] = useState({
    fullName: '',
    role: 'doctor',
    email: '',
    phone: '',
    department: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && staffMember) {
      setFormData({
        fullName: staffMember.full_name || staffMember.name || '',
        role: staffMember.role || 'doctor',
        email: staffMember.email || '',
        phone: staffMember.phone || '',
        department: staffMember.department || staffMember.specialization || '',
        password: '', // not required for edit
      });
    } else if (isOpen && !staffMember) {
      setFormData({ fullName: '', role: 'doctor', email: '', phone: '', department: '', password: '' });
    }
  }, [isOpen, staffMember]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!formData.fullName || !formData.role) {
      setError('Full Name and Role are required.');
      setIsLoading(false);
      return;
    }
    if (formData.role !== 'therapist' && !formData.email) {
      setError('Email is required for login.');
      setIsLoading(false);
      return;
    }
    // For new staff: require password unless role is therapist (therapists won't log in)
    if (!staffMember && formData.role !== 'therapist') {
      if (!formData.password || String(formData.password).length < 6) {
        setError('Password must be at least 6 characters.');
        setIsLoading(false);
        return;
      }
    }

    try {
      if (!currentUser?.hospital_id) {
        throw new Error('Your account is not linked to any hospital.');
      }

      const payload = {
        full_name: formData.fullName.trim(),
        role: formData.role,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        department: formData.department?.trim() || undefined,
        // include password only when creating non-therapist
        ...(!staffMember && formData.role !== 'therapist' ? { password: formData.password } : {}),
      };
      let resultUser;
      if (staffMember) {
        if (typeof Hospital.updateStaff === 'function') {
          resultUser = await Hospital.updateStaff(currentUser.hospital_id, staffMember.id, payload);
        } else {
          throw new Error('Update staff is not supported by the current API.');
        }
      } else {
        resultUser = await Hospital.assignStaff(currentUser.hospital_id, payload);
      }
      
      window.showNotification?.({
        type: 'success',
        title: staffMember ? 'Staff Updated' : 'Staff Assigned',
        message: staffMember 
          ? `${formData.fullName} has been updated.` 
          : (formData.role === 'therapist' 
              ? `${formData.fullName} (Therapist) has been added to your clinic.` 
              : `${formData.fullName} has been assigned and can now log in.`),
        autoClose: true,
        duration: 8000,
      });

      onStaffAdded?.(resultUser);
      onClose();
    } catch (err) {
      console.error("Failed to add staff:", err);
      setError(err?.details?.message || err?.message || 'Failed to assign staff.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex p-4 md:p-6 overflow-y-auto">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full md:w-[92vw] lg:w-[70vw] xl:w-[56vw] max-w-[920px] max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-3rem)] flex flex-col mx-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-100 bg-white rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Assign Staff</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        
        <form id="assign-staff-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6 overscroll-contain">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
              <select name="role" value={formData.role} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="doctor">Doctor</option>
                <option value="therapist">Therapist</option>
                <option value="office_executive">Office Executive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address {formData.role !== 'therapist' ? '(for login) *' : '(optional)'}</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="user@example.com" required={formData.role !== 'therapist'} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="9999999999" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department (optional)</label>
              <input name="department" value={formData.department} onChange={handleChange} placeholder="Panchakarma" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500" />
            </div>
            {formData.role !== 'therapist' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password {staffMember ? '(leave blank to keep unchanged)' : '(for login) *'}</label>
                  <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="•••••••" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500" required={!staffMember} />
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500">This staff member will be associated with your hospital: <strong>{currentUser?.hospital_name || `Hospital ID ${currentUser?.hospital_id}`}</strong>. {staffMember ? 'Updating profile details will not change access scope.' : (formData.role === 'therapist' ? 'This therapist will not receive login access.' : 'They will log in using the provided email and password. Access will be restricted to this hospital.')}</p>
          </div>
        </form>

        <div className="sticky bottom-0 z-10 p-6 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-3xl md:flex-row-reverse">
          <button form="assign-staff-form" type="submit" disabled={isLoading} className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-green-600 text-white font-medium flex items-center gap-2 disabled:opacity-50">
            {isLoading ? 'Saving...' : (staffMember ? 'Save Changes' : 'Save & Assign Staff')}
          </button>
          <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border bg-white hover:bg-gray-50 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
}

AddStaffModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onStaffAdded: PropTypes.func.isRequired,
  currentUser: PropTypes.object,
  staffMember: PropTypes.object,
};
