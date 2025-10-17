
import React, { useState, useEffect } from "react";
import { User } from "@/services";
import HospitalRegistrationModal from "../components/auth/HospitalRegistrationModal";
import {
  Settings as SettingsIcon,
  Save,
  User as UserIcon,
  Bell,
  Shield,
  Palette,
  Database,
  Download,
  Upload,
  Building, // Add building icon
} from "lucide-react";

// Helper Components
const TabButton = ({ id, label, icon: Icon, isActive, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-2xl transition-all duration-300 ${
      isActive
        ? "bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-lg"
        : "text-gray-600 hover:bg-gray-100"
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
  </button>
);

const SettingGroup = ({ title, children }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
    <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
    {children}
  </div>
);

const InputField = ({ label, type = 'text', value, onChange, placeholder, disabled = false }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
    />
  </div>
);

const ToggleSwitch = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between py-3">
    <div>
      <p className="font-medium text-gray-800">{label}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input 
        type="checkbox" 
        checked={checked || false} 
        onChange={(e) => onChange(e.target.checked)} 
        className="sr-only peer" 
      />
      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
    </label>
  </div>
);

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showHospitalModal, setShowHospitalModal] = useState(false); // State for modal
  const [settings, setSettings] = useState({
    profile: { 
      full_name: '', 
      email: '', 
      phone: '', 
      specialization: '', 
      emergency_contact: '' 
    },
    notifications: { 
      email_notifications: true, 
      sms_notifications: false, 
      push_notifications: true, 
      therapy_reminders: true, 
      feedback_alerts: true, 
      guardian_updates: true 
    },
    privacy: { 
      profile_visibility: 'staff', 
      data_sharing: false, 
      analytics_tracking: true, 
      session_timeout: '30' 
    },
    system: { 
      language: 'en', 
      timezone: 'Asia/Kolkata', 
      date_format: 'DD/MM/YYYY', 
      time_format: '12h' 
    },
  });

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      const userSettings = user.settings || {};
      
      setSettings(prevSettings => ({
        profile: {
          full_name: user.full_name || '',
          email: user.email || '',
          phone: user.phone || '',
          specialization: user.specialization || '',
          emergency_contact: user.emergency_contact || '',
        },
        notifications: { ...prevSettings.notifications, ...userSettings.notifications },
        privacy: { ...prevSettings.privacy, ...userSettings.privacy },
        system: { ...prevSettings.system, ...userSettings.system },
      }));

    } catch (error) {
      console.error("Failed to load user settings:", error);
    }
    setIsLoading(false);
  };
  
  const handleInputChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const saveSettings = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      await User.updateMyUserData({ 
        full_name: settings.profile.full_name,
        phone: settings.profile.phone,
        specialization: settings.profile.specialization,
        emergency_contact: settings.profile.emergency_contact,
        settings: {
          notifications: settings.notifications,
          privacy: settings.privacy,
          system: settings.system,
        }
      });
      setSaveMessage("✅ Settings saved successfully!");
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveMessage("❌ Failed to save settings. Please try again.");
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleHospitalRegistered = () => {
    // Reload data to reflect new user role and hospital ID
    loadUserSettings(); 
    setShowHospitalModal(false);
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="flex gap-8">
          <div className="w-64 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
          <div className="flex-1 space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-2xl flex items-center justify-center">
              <SettingsIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-500">Manage your account and system preferences</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saveMessage && (
              <div className={`px-4 py-2 rounded-lg ${
                saveMessage.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {saveMessage}
              </div>
            )}
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-3 rounded-2xl hover:shadow-lg transition-all duration-300 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 space-y-2 flex-shrink-0">
            <TabButton
              id="profile"
              label="Profile"
              icon={UserIcon}
              isActive={activeTab === "profile"}
              onClick={setActiveTab}
            />
            <TabButton
              id="notifications"
              label="Notifications"
              icon={Bell}
              isActive={activeTab === "notifications"}
              onClick={setActiveTab}
            />
            <TabButton
              id="privacy"
              label="Privacy & Security"
              icon={Shield}
              isActive={activeTab === "privacy"}
              onClick={setActiveTab}
            />
            <TabButton
              id="system"
              label="System"
              icon={SettingsIcon}
              isActive={activeTab === "system"}
              onClick={setActiveTab}
            />
            {/* Show hospital management if not super_admin */}
            {currentUser?.role !== 'super_admin' && (
              <TabButton
                id="hospital"
                label="Hospital"
                icon={Building}
                isActive={activeTab === "hospital"}
                onClick={setActiveTab}
              />
            )}
            <TabButton
              id="appearance"
              label="Appearance"
              icon={Palette}
              isActive={activeTab === "appearance"}
              onClick={setActiveTab}
            />
            <TabButton
              id="data"
              label="Data Management"
              icon={Database}
              isActive={activeTab === "data"}
              onClick={setActiveTab}
            />
          </aside>

          {/* Content */}
          <main className="flex-1">
            {activeTab === "profile" && (
              <div>
                <SettingGroup title="Personal Information">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                      label="Full Name"
                      value={settings.profile.full_name}
                      onChange={(value) => handleInputChange('profile', 'full_name', value)}
                      placeholder="Enter your full name"
                    />
                    <InputField
                      label="Email Address"
                      type="email"
                      value={settings.profile.email}
                      onChange={(value) => handleInputChange('profile', 'email', value)}
                      placeholder="Enter your email"
                      disabled={true}
                    />
                    <InputField
                      label="Phone Number"
                      type="tel"
                      value={settings.profile.phone}
                      onChange={(value) => handleInputChange('profile', 'phone', value)}
                      placeholder="Enter your phone number"
                    />
                    <InputField
                      label="Specialization"
                      value={settings.profile.specialization}
                      onChange={(value) => handleInputChange('profile', 'specialization', value)}
                      placeholder="Your area of expertise"
                    />
                  </div>
                  <div className="mt-4">
                    <InputField
                      label="Emergency Contact"
                      value={settings.profile.emergency_contact}
                      onChange={(value) => handleInputChange('profile', 'emergency_contact', value)}
                      placeholder="Emergency contact information"
                    />
                  </div>
                </SettingGroup>

                <SettingGroup title="Professional Details">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                      <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                        <span className="capitalize text-gray-800 font-medium">
                          {currentUser?.role || 'Not specified'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Member Since</label>
                      <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                        <span className="text-gray-800 font-medium">
                          {currentUser?.created_date ? new Date(currentUser.created_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </SettingGroup>
              </div>
            )}

            {activeTab === "notifications" && (
              <div>
                <SettingGroup title="Notification Preferences">
                  <ToggleSwitch 
                    label="Email Notifications" 
                    description="Receive updates via email" 
                    checked={settings.notifications.email_notifications} 
                    onChange={(value) => handleInputChange('notifications', 'email_notifications', value)} 
                  />
                  <ToggleSwitch 
                    label="SMS Notifications" 
                    description="Receive text message alerts" 
                    checked={settings.notifications.sms_notifications} 
                    onChange={(value) => handleInputChange('notifications', 'sms_notifications', value)} 
                  />
                  <ToggleSwitch 
                    label="Push Notifications" 
                    description="Browser and app notifications" 
                    checked={settings.notifications.push_notifications} 
                    onChange={(value) => handleInputChange('notifications', 'push_notifications', value)} 
                  />
                </SettingGroup>

                <SettingGroup title="Therapy & Treatment Alerts">
                  <ToggleSwitch 
                    label="Therapy Reminders" 
                    description="Get reminded about upcoming sessions" 
                    checked={settings.notifications.therapy_reminders} 
                    onChange={(value) => handleInputChange('notifications', 'therapy_reminders', value)} 
                  />
                  <ToggleSwitch 
                    label="Feedback Alerts" 
                    description="Notifications for patient feedback" 
                    checked={settings.notifications.feedback_alerts} 
                    onChange={(value) => handleInputChange('notifications', 'feedback_alerts', value)} 
                  />
                  <ToggleSwitch 
                    label="Guardian Updates" 
                    description="Alerts about guardian activities" 
                    checked={settings.notifications.guardian_updates} 
                    onChange={(value) => handleInputChange('notifications', 'guardian_updates', value)} 
                  />
                </SettingGroup>
              </div>
            )}

            {activeTab === "privacy" && (
              <div>
                <SettingGroup title="Privacy Settings">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Visibility</label>
                    <select 
                      value={settings.privacy.profile_visibility} 
                      onChange={(e) => handleInputChange('privacy', 'profile_visibility', e.target.value)} 
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="private">Private</option>
                      <option value="staff">Staff Only</option>
                      <option value="public">Public</option>
                    </select>
                  </div>
                  <ToggleSwitch 
                    label="Data Sharing" 
                    description="Share anonymized data for research" 
                    checked={settings.privacy.data_sharing} 
                    onChange={(value) => handleInputChange('privacy', 'data_sharing', value)} 
                  />
                  <ToggleSwitch 
                    label="Analytics Tracking" 
                    description="Help improve the system with usage data" 
                    checked={settings.privacy.analytics_tracking} 
                    onChange={(value) => handleInputChange('privacy', 'analytics_tracking', value)} 
                  />
                  <div className="my-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                    <select 
                      value={settings.privacy.session_timeout} 
                      onChange={(e) => handleInputChange('privacy', 'session_timeout', e.target.value)} 
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="120">2 hours</option>
                      <option value="0">Never</option>
                    </select>
                  </div>
                </SettingGroup>
              </div>
            )}
            
            {activeTab === "system" && (
              <div>
                <SettingGroup title="Regional Settings">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                      <select 
                        value={settings.system.language} 
                        onChange={(e) => handleInputChange('system', 'language', e.target.value)} 
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="en">English</option>
                        <option value="hi">Hindi</option>
                        <option value="mr">Marathi</option>
                        <option value="ta">Tamil</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                      <select 
                        value={settings.system.timezone} 
                        onChange={(e) => handleInputChange('system', 'timezone', e.target.value)} 
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="UTC">UTC</option>
                        <option value="Asia/Kolkata">Asia/Kolkata</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="Europe/London">Europe/London</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                      <select 
                        value={settings.system.date_format} 
                        onChange={(e) => handleInputChange('system', 'date_format', e.target.value)} 
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Time Format</label>
                      <select 
                        value={settings.system.time_format} 
                        onChange={(e) => handleInputChange('system', 'time_format', e.target.value)} 
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="12h">12 Hour</option>
                        <option value="24h">24 Hour</option>
                      </select>
                    </div>
                  </div>
                </SettingGroup>
              </div>
            )}

            {activeTab === "hospital" && (
              <div>
                <SettingGroup title="Hospital Management">
                  {currentUser?.hospital_id ? (
                    <div>
                      <p className="text-gray-700">
                        You are associated with a hospital. Contact your hospital administrator for management options.
                      </p>
                      {/* Can add hospital details here later */}
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-700 mb-4">
                        You are not yet associated with a hospital. Register your hospital to unlock administrative features and manage your practice.
                      </p>
                      <button
                        onClick={() => setShowHospitalModal(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-2xl hover:shadow-lg transition-all duration-300"
                      >
                        <Building className="w-5 h-5" />
                        Register Your Hospital
                      </button>
                    </div>
                  )}
                </SettingGroup>
              </div>
            )}

            {activeTab === "appearance" && (
              <div>
                <SettingGroup title="Theme & Display">
                  <p className="text-gray-600 mb-4">Choose a theme for the application.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border-2 border-blue-500 rounded-xl cursor-pointer transition-colors">
                      <div className="w-full h-20 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg mb-3"></div>
                      <p className="text-sm font-medium text-center">Medical Blue (Active)</p>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 transition-colors">
                      <div className="w-full h-20 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg mb-3"></div>
                      <p className="text-sm font-medium text-center">Healing Green</p>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 transition-colors">
                      <div className="w-full h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg mb-3"></div>
                      <p className="text-sm font-medium text-center">Wellness Purple</p>
                    </div>
                  </div>
                </SettingGroup>
              </div>
            )}

            {activeTab === "data" && (
              <div>
                <SettingGroup title="Data Export & Import">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                      <div>
                        <h4 className="font-medium text-gray-900">Export My Data</h4>
                        <p className="text-sm text-gray-500">Download all your personal data</p>
                      </div>
                      <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
                        <Download className="w-4 h-4" />
                        Export
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                      <div>
                        <h4 className="font-medium text-gray-900">Import Data</h4>
                        <p className="text-sm text-gray-500">Import data from another system</p>
                      </div>
                      <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-colors">
                        <Upload className="w-4 h-4" />
                        Import
                      </button>
                    </div>
                  </div>
                </SettingGroup>
              </div>
            )}
          </main>
        </div>
      </div>
      <HospitalRegistrationModal
        isOpen={showHospitalModal}
        onClose={() => setShowHospitalModal(false)}
        onHospitalRegistered={handleHospitalRegistered}
        currentUser={currentUser}
      />
    </>
  );
}
