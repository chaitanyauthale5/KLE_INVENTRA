import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building, MapPin, Upload, Check, AlertTriangle } from 'lucide-react';
import { Hospital } from '@/services';
import { User } from '@/services';
import { UploadFile } from '@/services/integrations';

export default function HospitalRegistrationModal({ isOpen, onClose, onHospitalRegistered, currentUser }) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [hospitalData, setHospitalData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    contact_email: currentUser?.email || '',
    established_year: '',
    subscription_plan: 'basic',
    description: '',
    specializations: []
  });

  const handleInputChange = (field, value) => {
    setHospitalData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user starts typing
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('Image file size should be less than 5MB.');
      return;
    }

    setIsUploadingLogo(true);
    setError('');

    try {
      const uploadResult = await UploadFile({ file });
      setLogoUrl(uploadResult.file_url);
      setLogoFile(file);
      
      // Show success notification
      if (window.showNotification) {
        window.showNotification({
          type: 'success',
          title: 'Logo Uploaded',
          message: 'Hospital logo uploaded successfully!',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Logo upload failed:', error);
      setError('Failed to upload logo. Please try again.');
      
      if (window.showNotification) {
        window.showNotification({
          type: 'error',
          title: 'Upload Failed',
          message: 'Failed to upload logo. Please try again.',
          duration: 5000
        });
      }
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const validateForm = () => {
    const errors = [];

    if (!hospitalData.name.trim()) errors.push('Hospital name is required');
    if (!hospitalData.address.trim()) errors.push('Address is required');
    if (!hospitalData.city.trim()) errors.push('City is required');
    if (!hospitalData.state.trim()) errors.push('State is required');
    if (!hospitalData.pinCode.trim()) errors.push('Pin code is required');
    if (!hospitalData.contact_email.trim()) errors.push('Contact email is required');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (hospitalData.contact_email && !emailRegex.test(hospitalData.contact_email)) {
      errors.push('Please enter a valid email address');
    }

    // Validate pin code (should be numeric and 6 digits for India)
    if (hospitalData.pinCode && !/^\d{6}$/.test(hospitalData.pinCode)) {
      errors.push('Pin code should be 6 digits');
    }

    // Validate established year
    if (hospitalData.established_year) {
      const year = parseInt(hospitalData.established_year);
      const currentYear = new Date().getFullYear();
      if (year < 1800 || year > currentYear) {
        errors.push('Please enter a valid established year');
      }
    }

    return errors;
  };

  const handleSubmit = async () => {
    setError('');
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      return;
    }

    setIsLoading(true);

    try {
      // Create hospital data
      const hospitalPayload = {
        name: hospitalData.name.trim(),
        address: `${hospitalData.address.trim()}, ${hospitalData.city.trim()}, ${hospitalData.state.trim()} - ${hospitalData.pinCode.trim()}`,
        contact_email: hospitalData.contact_email.trim(),
        subscription_plan: hospitalData.subscription_plan,
        logo_url: logoUrl || null,
        established_year: hospitalData.established_year || null,
        description: hospitalData.description.trim() || null
      };

      console.log('Creating hospital with data:', hospitalPayload);

      // Create the hospital
      const createdHospital = await Hospital.create(hospitalPayload);
      
      console.log('Hospital created successfully:', createdHospital);

      // Update user's role and hospital association
      const userUpdateData = {
        role: 'hospital_admin',
        hospital_id: createdHospital.id,
        has_selected_role: true
      };

      console.log('Updating user with data:', userUpdateData);

      await User.updateMyUserData(userUpdateData);

      // Show success notification
      if (window.showNotification) {
        window.showNotification({
          type: 'success',
          title: '🏥 Hospital Registered Successfully!',
          message: `Welcome to AyurSutra! ${hospitalData.name} has been registered and you are now the Hospital Administrator.`,
          duration: 8000
        });
      }

      // Call success callback
      onHospitalRegistered();

    } catch (error) {
      console.error('Hospital registration failed:', error);
      
      let errorMessage = 'Failed to register hospital. Please try again.';
      
      if (error.response?.status === 422) {
        errorMessage = 'Invalid data provided. Please check all fields and try again.';
      } else if (error.response?.status === 400) {
        errorMessage = 'Bad request. Please ensure all required fields are filled correctly.';
      } else if (error.response?.status === 409) {
        errorMessage = 'A hospital with this name or email already exists.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }

      setError(errorMessage);

      if (window.showNotification) {
        window.showNotification({
          type: 'error',
          title: 'Registration Failed',
          message: errorMessage,
          duration: 7000
        });
      }

    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError('');
      setStep(1);
      setHospitalData({
        name: '',
        address: '',
        city: '',
        state: '',
        pinCode: '',
        contact_email: currentUser?.email || '',
        established_year: '',
        subscription_plan: 'basic',
        description: '',
        specializations: []
      });
      setLogoFile(null);
      setLogoUrl('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-green-600 text-white p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Register Your Hospital</h2>
                <p className="text-blue-100">Join the AyurSutra Healthcare Network</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Registration Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Hospital Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Hospital Details</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hospital/Clinic Name *
                  </label>
                  <input
                    type="text"
                    value={hospitalData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter your hospital or clinic name"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    value={hospitalData.contact_email}
                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                    placeholder="admin@hospital.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Established Year
                    </label>
                    <input
                      type="number"
                      value={hospitalData.established_year}
                      onChange={(e) => handleInputChange('established_year', e.target.value)}
                      placeholder="2020"
                      min="1800"
                      max={new Date().getFullYear()}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subscription Plan
                    </label>
                    <select
                      value={hospitalData.subscription_plan}
                      onChange={(e) => handleInputChange('subscription_plan', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isLoading}
                    >
                      <option value="basic">Basic Plan</option>
                      <option value="premium">Premium Plan</option>
                      <option value="enterprise">Enterprise Plan</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Location Details</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Address *
                  </label>
                  <textarea
                    value={hospitalData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Enter complete address"
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={hospitalData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="Mumbai"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      value={hospitalData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="Maharashtra"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pin Code *
                  </label>
                  <input
                    type="text"
                    value={hospitalData.pinCode}
                    onChange={(e) => handleInputChange('pinCode', e.target.value)}
                    placeholder="400001"
                    maxLength="6"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Hospital Logo Upload */}
          <div className="mt-8 p-6 bg-purple-50 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Upload className="w-4 h-4 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Hospital Logo</h3>
              <span className="text-sm text-gray-500">(Optional)</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 file:cursor-pointer cursor-pointer"
                  disabled={isLoading || isUploadingLogo}
                />
                <p className="text-xs text-gray-500 mt-1">Upload your hospital logo (JPEG, PNG, WebP - Max 5MB)</p>
              </div>
              
              {logoUrl && (
                <div className="flex items-center gap-2">
                  <img src={logoUrl} alt="Logo preview" className="w-12 h-12 rounded-lg object-cover border" />
                  <Check className="w-5 h-5 text-green-600" />
                </div>
              )}
              
              {isUploadingLogo && (
                <div className="flex items-center gap-2 text-purple-600">
                  <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Uploading...</span>
                </div>
              )}
            </div>
          </div>

          {/* Subscription Plans */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Subscription Plans</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  plan: 'basic',
                  name: 'Basic Plan',
                  price: 'Free',
                  features: ['Up to 50 patients', 'Basic features', 'Email support'],
                  color: 'green'
                },
                {
                  plan: 'premium',
                  name: 'Premium Plan',
                  price: '₹2999/month',
                  features: ['Up to 200 patients', 'Advanced analytics', 'Priority support'],
                  color: 'blue'
                },
                {
                  plan: 'enterprise',
                  name: 'Enterprise Plan',
                  price: 'Custom pricing',
                  features: ['Unlimited patients', 'Custom features', '24/7 support'],
                  color: 'purple'
                }
              ].map((plan) => (
                <div
                  key={plan.plan}
                  onClick={() => handleInputChange('subscription_plan', plan.plan)}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    hospitalData.subscription_plan === plan.plan
                      ? `border-${plan.color}-500 bg-${plan.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">{plan.name}</h4>
                    <span className={`text-sm font-bold text-${plan.color}-600`}>{plan.price}</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={isLoading || isUploadingLogo}
              className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-8 py-3 rounded-2xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Registering Hospital...
                </>
              ) : (
                <>
                  <Building className="w-4 h-4" />
                  Register Hospital
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}