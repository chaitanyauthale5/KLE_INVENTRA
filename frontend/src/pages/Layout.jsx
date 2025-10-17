import React, { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/services";
import LandingPageComponent from "../components/landing/LandingPageComponent";
import AIAvatarAssistant from "../components/avatar/AIAvatarAssistant";
import AIDoctorBot from "../components/doctor/AIDoctorBot";
import NotificationSystem from "../components/shared/NotificationSystem";
// import HospitalRegistrationModal from "../components/auth/HospitalRegistrationModal";
// import RoleSelectionModal from "../components/auth/RoleSelectionModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Users, Calendar, Bell, BarChart3, FileText, Settings, LogOut, Menu, X, Stethoscope, UserCheck, Activity, ChevronDown, Building
} from "lucide-react";
const SUPER_ADMIN_EMAIL = 'op940356622@gmail.com';
// --- Role-Specific Navigation Menus ---
const superAdminNavItems = [
  { title: "Dashboard", url: "SuperAdminDashboard", icon: Home },
  { title: "Clinics", url: "SuperClinics", icon: Building },
  { title: "Finances", url: "SuperFinances", icon: BarChart3 },
  { title: "Reports & Analysis", url: "Reports", icon: FileText },
  { title: "Notifications", url: "Notifications", icon: Bell },
 
];

const clinicAdminNavItems = [
  { title: "Clinic Dashboard", url: "Dashboard", icon: Home },
  { title: "Patients", url: "Patients", icon: Users },
  { title: "Doctors & Staff", url: "Staff", icon: UserCheck },
  { title: "Therapy Scheduling", url: "TherapyScheduling", icon: Calendar },
  { title: "Reports", url: "Reports", icon: FileText },
  { title: "Notifications", url: "Notifications", icon: Bell },
];

const doctorNavItems = [
  { title: "Doctor's Dashboard", url: "DoctorDashboard", icon: Home },
  { title: "Appointments Management", url: "DoctorAppointments", icon: Calendar },
  { title: "Patient Management", url: "Patients", icon: Users },
  { title: "Prescription & Records", url: "PrescriptionRecords", icon: FileText },
  { title: "Reports & Analytics", url: "Reports", icon: BarChart3 },
  { title: "Notifications", url: "Notifications", icon: Bell },
];

const patientNavItems = [
  { title: "My Dashboard", url: "PatientDashboard", icon: Home },
  { title: "My Plan", url: "PatientPlan", icon: FileText },
  { title: "My Schedule", url: "PatientSchedule", icon: Calendar },
  { title: "Prescriptions", url: "PrescriptionRecords", icon: FileText },
  { title: "Analytics & Report", url: "PatientAnalytics", icon: BarChart3 },
  { title: "Notifications", url: "Notifications", icon: Bell },
];

const officeExecutiveNavItems = [
  { title: "Office Executive Dashboard", url: "OfficeExecutiveDashboard", icon: Home },
  { title: "Patient Registration", url: "Patients", icon: Users },
  { title: "Appointments", url: "OfficeAppointments", icon: Calendar },
  { title: "Therapy Scheduling", url: "TherapyScheduling", icon: Calendar },
  { title: "Prescription & Records", url: "PrescriptionRecords", icon: FileText },
  { title: "Settings", url: "Settings", icon: Settings },
];

const navMap = {
  super_admin: superAdminNavItems,
  clinic_admin: clinicAdminNavItems,
  doctor: doctorNavItems,
  patient: patientNavItems,
  office_executive: officeExecutiveNavItems,
};

const LoadingScreen = ({ message = "Loading AyurSutra..." }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-purple-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin"></div>
        <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-green-200 border-r-green-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      </div>
      <div className="text-center">
        <p className="text-gray-700 font-semibold text-lg">{message}</p>
        <div className="flex items-center justify-center gap-1 mt-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  </div>
);

LoadingScreen.propTypes = {
  message: PropTypes.string
};

// --- Enhanced App Shell with Fixed Mobile Menu ---
const AppShell = ({ currentUser, handleLogout, children, navigateToLanding }) => {
  const location = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileMenuOpen && !event.target.closest('.profile-dropdown-container')) {
        setIsProfileMenuOpen(false);
      }
      if (isMobileMenuOpen && !event.target.closest('.mobile-menu-container')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen, isMobileMenuOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-green-50/30">
      <style>{`
        body, html { 
          overflow-x: hidden; 
          width: 100%; 
          box-sizing: border-box; 
        }
        .medical-header { 
          background: linear-gradient(135deg, #1565c0 0%, #1976d2 30%, #2e7d32 70%, #388e3c 100%); 
          box-shadow: 0 8px 32px rgba(21, 101, 192, 0.2); 
          position: relative;
          overflow: hidden;
        }
        .medical-header::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: pulse 4s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        /* Logo Pulse Animation */
        .logo-pulse {
          animation: logo-pulse-animation 3s ease-in-out infinite;
        }
        @keyframes logo-pulse-animation {
          0%, 100% {
            transform: scale(1);
            filter: brightness(1) drop-shadow(0 0 5px rgba(255, 255, 255, 0.3));
          }
          50% {
            transform: scale(1.05);
            filter: brightness(1.2) drop-shadow(0 0 15px rgba(255, 255, 255, 0.7));
          }
        }
        .nav-item { 
          position: relative; 
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
          flex-shrink: 0; 
        }
        .nav-item:hover { 
          transform: translateY(-2px); 
          filter: brightness(1.1);
        }
        .nav-item::after { 
          content: ''; 
          position: absolute; 
          bottom: -6px; 
          left: 50%; 
          transform: translateX(-50%); 
          width: 0; 
          height: 4px; 
          background: linear-gradient(90deg, #66bb6a, #42a5f5, #ab47bc); 
          border-radius: 2px; 
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
        }
        .nav-item:hover::after, .nav-item.active::after { width: 90%; }
        .medical-bg {
          background-image: 
            radial-gradient(circle at 20% 80%, rgba(120, 200, 120, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(70, 130, 180, 0.1) 0%, transparent 50%);
        }
        .floating-element {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(1deg); }
          66% { transform: translateY(5px) rotate(-1deg); }
        }
        
        /* MOBILE MENU FIXES */
        .mobile-menu-toggle {
          position: relative !important;
          z-index: 50 !important;
          pointer-events: auto !important;
        }
        
        .mobile-menu-overlay {
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 100 !important;
        }
        
        .mobile-menu-container {
          z-index: 101 !important;
        }
        
        /* Profile dropdown positioning */
        .profile-dropdown {
          position: fixed !important;
          z-index: 99999 !important;
          top: auto !important;
          right: 1rem !important;
          margin-top: 1rem !important;
        }
        
        /* Enhanced Mobile Responsiveness */
        @media (max-width: 768px) {
          .nav-item { font-size: 0.875rem; padding: 0.5rem 0.75rem; }
          .medical-header { padding: 0.75rem 1rem; }
          .profile-dropdown { 
            position: fixed !important;
            top: 4rem !important;
            right: 0.5rem !important;
            left: 0.5rem !important;
            width: auto !important;
            z-index: 99999 !important;
          }
        }
        
        @media (max-width: 640px) {
          .medical-header { padding: 0.5rem 0.75rem; }
          .profile-dropdown { 
            top: 3.5rem !important;
            right: 0.25rem !important;
            left: 0.25rem !important;
          }
        }
        
        /* Hide scrollbars utility */
        .no-scrollbar {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
        .no-scrollbar::-webkit-scrollbar { /* Chrome, Safari, Opera */
          display: none;
          width: 0;
          height: 0;
          background: transparent;
        }
        
        /* Sidebar styled to match the navbar gradient */
        .medical-sidebar {
          background: linear-gradient(135deg, #1565c0 0%, #1976d2 30%, #2e7d32 70%, #388e3c 100%);
          box-shadow: 0 8px 32px rgba(21, 101, 192, 0.2);
        }
        
        /* PWA Styles */
        @media (display-mode: standalone) {
          .pwa-header { padding-top: env(safe-area-inset-top); }
        }
      `}</style>

      {/* Enhanced Header - Mobile Optimized */}
      <header className="medical-header relative z-40 pwa-header">
        <div className="w-full px-3 md:px-6 py-2 md:py-4">
          <div className="flex items-center justify-between">
            {/* Logo - Clickable to Landing Page */}
            <div 
              onClick={navigateToLanding} 
              className="flex items-center gap-2 md:gap-3 flex-shrink-0 floating-element cursor-pointer hover:scale-105 transition-transform"
            >
              <motion.div 
                className="logo-pulse w-8 h-8 md:w-14 md:h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-lg"
                animate={{ 
                  rotate: [0, 360]
                }}
                transition={{ 
                  rotate: { duration: 12, repeat: Infinity, ease: "linear" }
                }}
              >
                <Stethoscope className="w-4 h-4 md:w-8 md:h-8 text-white" />
              </motion.div>
              <div className="hidden sm:block">
                <h1 className="text-lg md:text-3xl font-bold text-white tracking-tight">AyurSutra</h1>
                <p className="text-blue-100 text-xs md:text-sm font-medium">Healthcare Management System</p>
              </div>
            </div>

            {/* Desktop Navigation - show for all roles */}
            <nav className="hidden lg:flex items-center space-x-1 overflow-x-auto overflow-y-hidden no-scrollbar">
              {(navMap[currentUser?.role] || []).map((item, index) => (
                <Link
                  key={item.title}
                  to={createPageUrl(item.url)}
                  className={`nav-item flex items-center gap-2 px-3 py-2 rounded-xl text-white/90 hover:text-white hover:bg-white/15 transition-all font-medium text-sm whitespace-nowrap backdrop-blur-sm flex-shrink-0 ${
                    location.pathname.includes(createPageUrl(item.url)) ? 'active text-white bg-white/15 shadow-lg' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden xl:inline">{item.title}</span>
                </Link>
              ))}
            </nav>

            {/* Profile Menu & Mobile Menu Trigger */}
            <div className="flex items-center gap-2">
              <div className="relative profile-dropdown-container">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsProfileMenuOpen(!isProfileMenuOpen);
                  }}
                  className="flex items-center gap-1 md:gap-3 bg-white/15 backdrop-blur-sm rounded-2xl px-2 py-2 md:px-4 md:py-3 text-white hover:bg-white/25 transition-all duration-300 border border-white/20 shadow-lg"
                >
                  <div className="w-6 h-6 md:w-10 md:h-10 bg-gradient-to-br from-green-400 to-blue-400 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xs md:text-base">{currentUser?.full_name?.charAt(0) || 'U'}</span>
                  </div>
                  <span className="font-semibold hidden md:block text-sm">{currentUser?.full_name || 'User'}</span>
                  <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />
                </button>

                {/* PROFILE DROPDOWN - Enhanced Mobile */}
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="profile-dropdown bg-white/98 backdrop-blur-xl rounded-2xl p-4 md:p-6 shadow-2xl border border-white/50 mt-2"
                    >
                      <div className="text-center mb-4 md:mb-6 pb-4 md:pb-6 border-b border-gray-200">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-green-400 to-blue-400 rounded-full mx-auto mb-3 md:mb-4 flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-xl md:text-2xl">{currentUser?.full_name?.charAt(0) || 'U'}</span>
                        </div>
                        <h3 className="font-bold text-gray-800 text-base md:text-lg">{currentUser?.full_name || 'User'}</h3>
                        <p className="text-xs md:text-sm text-gray-500">{currentUser?.email}</p>
                        <span className="inline-block mt-2 px-2 md:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
                          {currentUser?.role || 'User'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Link 
                          to={createPageUrl('Settings')} 
                          className="flex items-center gap-3 w-full p-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors text-sm md:text-base" 
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4 md:w-5 md:h-5" /> Settings & Preferences
                        </Link>
                        <button 
                          onClick={() => {
                            handleLogout();
                            setIsProfileMenuOpen(false);
                          }} 
                          className="flex items-center gap-3 w-full p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm md:text-base"
                        >
                          <LogOut className="w-4 h-4 md:w-5 md:h-5" /> Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile Menu Button - FIXED */}
              <button
                className="lg:hidden mobile-menu-toggle p-2 md:p-3 bg-white/15 rounded-2xl text-white hover:bg-white/25 transition-colors z-50"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                }}
                type="button"
                aria-label="Toggle mobile menu"
              >
                <Menu className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar removed – navigation moved to top navbar */}

      {/* Mobile Menu Overlay - FIXED */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 mobile-menu-overlay lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute right-0 top-0 h-full w-4/5 max-w-sm bg-gradient-to-b from-gray-800 to-gray-900 mobile-menu-container shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 md:p-6">
                <div className="flex justify-between items-center mb-6 md:mb-8">
                  <h2 className="text-lg md:text-xl font-bold text-white">Menu</h2>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
                    type="button"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                </div>
                <nav className="flex flex-col space-y-2">
                  {(navMap[currentUser?.role] || []).map((item) => (
                    <Link
                      key={item.title}
                      to={createPageUrl(item.url)}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 md:gap-4 px-3 md:px-4 py-3 rounded-xl font-medium transition-colors text-sm md:text-base ${
                        location.pathname.includes(createPageUrl(item.url)) 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <item.icon className="w-4 h-4 md:w-5 md:h-5" />
                      <span>{item.title}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* MAIN CONTENT - Enhanced Mobile */}
      <main className={`w-full medical-bg`}>
        <div className="w-full px-2 sm:px-4 lg:px-6 py-2 sm:py-4 lg:py-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-3xl shadow-xl border border-white/50 min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-6rem)] lg:min-h-[calc(100vh-12rem)] overflow-hidden">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

AppShell.propTypes = {
  currentUser: PropTypes.object,
  handleLogout: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  navigateToLanding: PropTypes.func.isRequired
};

// --- Main Layout Component ---
export default function Layout({ children }) {
  const [currentUser, setCurrentUser] = useState(undefined); 
  const [showLandingPage, setShowLandingPage] = useState(false);

  const loadUser = async () => {
    try {
      const user = await User.me();
      console.log('Loaded user:', user);
      
      if (user) {
        // Handle super admin role assignment
        if (user.email === SUPER_ADMIN_EMAIL && user.role !== 'super_admin') {
          try {
            const updatedUser = await User.updateMyUserData({ 
              role: 'super_admin', 
              hospital_id: null,
              has_selected_role: true 
            });
            setCurrentUser(updatedUser);
          } catch (error) {
            console.error('Failed to update super admin role:', error);
            setCurrentUser(user); // Fallback to original user if update fails
          }
        } else {
          setCurrentUser(user);
        }

        // Show welcome notification for new logins
        if (user && window.showNotification && !sessionStorage.getItem('welcomeShown')) {
          const roleDisplayNames = {
            'super_admin': 'Super Administrator',
            'clinic_admin': 'Clinic Administrator',
            'doctor': 'Doctor',
            'patient': 'Patient',
            'guardian': 'Guardian',
            'office_executive': 'Office Executive'
          };

          const welcomeMessages = {
            'super_admin': 'You have full system access. Monitor all hospitals and manage the entire platform.',
            'clinic_admin': 'Welcome to your clinic management dashboard. Manage doctors, staff, patients, and daily operations.',
            'doctor': 'Access your patient list, schedule consultations, and manage treatment plans.',
            'patient': 'Track your Panchakarma journey, view appointments, and monitor your progress.',
            'guardian': 'Stay updated on your loved one\'s treatment progress and upcoming sessions.',
            'office_executive': 'Help with patient registration, payments, and administrative work.'
          };

          // Only show notification if user has completed role selection
          if (user.has_selected_role) {
            window.showNotification({
              type: 'success',
              title: `🙏 Namaste, ${user.full_name || 'User'}!`,
              message: `Welcome to AyurSutra as ${roleDisplayNames[user.role] || user.role}. ${welcomeMessages[user.role] || 'Ready to manage Panchakarma treatments with ancient wisdom and modern technology.'}`,
              duration: 8000,
              autoClose: true
            });

            sessionStorage.setItem('welcomeShown', 'true');
          }
        }

        // Role selection flow disabled; proceed to app UI

      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setCurrentUser(null);
    }
  };
  
  useEffect(() => {
    loadUser();
  }, []);

  const handleLogin = async () => {
    try {
      window.location.href = createPageUrl('SignIn');
    } catch (error) {
      console.error('Login navigation failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await User.logout();
      setCurrentUser(null);
      setShowLandingPage(true);
      window.location.href = '/'; 
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navigateToLanding = () => {
    if (currentUser) {
      setShowLandingPage(true);
    } else {
      window.location.href = '/';
    }
  };

  const closeLandingPage = () => {
    setShowLandingPage(false);
  };
  
  // helper removed (unused)

  if (currentUser === undefined) {
    return <LoadingScreen message={"Initializing AyurSutra..."} />;
  }

  // Role selection is disabled; do not present modal

  if (currentUser) {
    // Do not auto-redirect on root; remain on current route

    if (showLandingPage) {
      return (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <div className="absolute top-4 right-4 z-[9999] pointer-events-auto">
            <button
              onClick={closeLandingPage}
              className="bg-white/90 backdrop-blur-sm text-gray-700 px-4 py-2 rounded-xl shadow-lg hover:bg-white transition-colors"
            >
              ← Back to App
            </button>
          </div>
          <LandingPageComponent 
            onLogin={() => {
              setShowLandingPage(false);
            }} 
            onNavigateToApp={() => {
              setShowLandingPage(false);
              window.location.href = createPageUrl('Dashboard');
            }} 
          />
        </div>
      );
    }
    
    return (
      <>
        <AppShell currentUser={currentUser} handleLogout={handleLogout} navigateToLanding={navigateToLanding}>
          {React.cloneElement(children, { currentUser: currentUser })}
        </AppShell>
        <AIAvatarAssistant currentUser={currentUser} />
        <AIDoctorBot currentUser={currentUser} />
        <NotificationSystem />
      </>
    );
  }

  return (
    <div className="w-full overflow-y-auto">
      <LandingPageComponent onLogin={handleLogin} onNavigateToApp={handleLogin} /> 
      <AIAvatarAssistant />
      <AIDoctorBot />
      <NotificationSystem />
    </div>
  );
}

Layout.propTypes = {
  children: PropTypes.element.isRequired
};

