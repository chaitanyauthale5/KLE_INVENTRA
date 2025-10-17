import { useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { User as UserIcon, Stethoscope, ArrowRight } from 'lucide-react';
import { User } from '@/services';
import { createPageUrl } from '@/utils';

export default function RoleSelectionModal({ isOpen, onComplete, currentUser }) {
  // PropTypes will be defined at the bottom

  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelection = (role) => {
    setSelectedRole(role);
    setError(''); // Clear any previous errors
  };

  const handleContinue = async () => {
    if (!selectedRole || !currentUser) {
      setError('Please select a role to continue.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      console.log('Current user before role update:', currentUser);
      console.log('Selected role:', selectedRole);

      if (selectedRole === 'professional') {
        // For healthcare professionals, we'll set a default role first
        // then they can specify their exact role during hospital registration
        const updateData = {
          has_selected_role: true,
          role: 'clinic_admin', // Default to clinic_admin until they register hospital
          // Ensure we preserve existing user data
          full_name: currentUser.full_name,
          email: currentUser.email
        };

        console.log('Updating user with data:', updateData);
        
        await User.updateMyUserData(updateData);
        
        // Redirect to settings page for hospital registration
        window.location.href = createPageUrl('Settings');

      } else { // 'patient'
        const updateData = {
          role: 'patient',
          has_selected_role: true,
          // Ensure we preserve existing user data
          full_name: currentUser.full_name,
          email: currentUser.email,
          // Clear hospital_id for patients if it exists
          hospital_id: null
        };

        console.log('Updating patient with data:', updateData);
        
        await User.updateMyUserData(updateData);
        
        // Show success notification
        if (window.showNotification) {
          window.showNotification({
            type: 'success',
            title: '✅ Welcome to AyurSutra!',
            message: 'Your account has been set up successfully. Start your healing journey today.',
            duration: 5000,
            autoClose: true
          });
        }
        
        onComplete(); // This will reload the layout and redirect appropriately
      }
    } catch (error) {
      console.error("Failed to update role:", error);
      
      // Parse the error to show a user-friendly message
      let errorMessage = 'Failed to update your role. Please try again.';
      
      if (error.response?.status === 422) {
        errorMessage = 'There was a validation error. Please ensure all required information is provided.';
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid role selection. Please try again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to perform this action.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl text-center p-8 md:p-12 relative"
      >
        <div className="max-w-md mx-auto">
          <motion.div
            className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg"
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          >
            <Stethoscope className="w-10 h-10 text-white" />
          </motion.div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">Welcome to AyurSutra!</h1>
          <p className="text-gray-600 mb-8">To personalize your experience, please tell us who you are.</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              onClick={() => handleSelection('patient')}
              className={`p-8 rounded-2xl border-4 transition-all cursor-pointer ${
                selectedRole === 'patient' ? 'border-green-500 shadow-xl bg-green-50' : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <UserIcon className={`w-12 h-12 mx-auto mb-4 ${
                selectedRole === 'patient' ? 'text-green-600' : 'text-green-500'
              }`} />
              <h3 className="text-xl font-bold text-gray-800">I am a Patient</h3>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              onClick={() => handleSelection('professional')}
              className={`p-8 rounded-2xl border-4 transition-all cursor-pointer ${
                selectedRole === 'professional' ? 'border-blue-500 shadow-xl bg-blue-50' : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <Stethoscope className={`w-12 h-12 mx-auto mb-4 ${
                selectedRole === 'professional' ? 'text-blue-600' : 'text-blue-500'
              }`} />
              <h3 className="text-xl font-bold text-gray-800">Healthcare Professional</h3>
              <p className="text-gray-500 text-sm mt-1">Doctor, Admin</p>
            </motion.div>
          </div>

          <motion.button
            onClick={handleContinue}
            disabled={!selectedRole || isLoading}
            whileHover={{ scale: selectedRole && !isLoading ? 1.05 : 1 }}
            whileTap={{ scale: selectedRole && !isLoading ? 0.95 : 1 }}
            className={`w-full px-8 py-4 rounded-2xl text-lg font-bold shadow-lg transition-all flex items-center justify-center gap-3 ${
              selectedRole && !isLoading
                ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white hover:shadow-xl cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Setting up your account...
              </>
            ) : (
              <>
                Continue <ArrowRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
          
          <p className="text-xs text-gray-500 mt-4">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </motion.div>
    </div>
  );
}

RoleSelectionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onComplete: PropTypes.func.isRequired,
  currentUser: PropTypes.shape({
    full_name: PropTypes.string,
    email: PropTypes.string
  })
};