
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@/services';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Stethoscope, Play, ArrowRight, Calendar, MessageSquare, Shield,
  Bell, BarChart3, Heart, Star, Sparkles, X, CheckCircle, Award, Users, Globe
} from 'lucide-react';
import AIAvatarAssistant from '../avatar/AIAvatarAssistant';
import AIDoctorBot from '../doctor/AIDoctorBot';

// Enhanced floating particles with Ayurvedic elements
const FloatingParticles = () => {
  const particles = Array.from({ length: 20 }, (_, i) => i);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle}
          className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-green-400 rounded-full"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
            opacity: 0
          }}
          animate={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            delay: particle * 0.5
          }}
        />
      ))}
    </div>
  );
};

const Stat = ({ value, label, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.5 }}
    whileInView={{ opacity: 1, y: 0, scale: 1 }}
    whileHover={{ scale: 1.1, rotateY: 5 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8, delay, type: "spring" }}
    className="text-center group cursor-pointer"
  >
    <motion.div
      animate={{ rotate: [0, 360] }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all"
    >
      <Sparkles className="w-8 h-8 text-white" />
    </motion.div>
    <motion.p
      className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent mb-1"
      whileHover={{ scale: 1.1 }}
    >
      {value}
    </motion.p>
    <p className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">{label}</p>
  </motion.div>
);

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, rotateX: -30 }}
    whileInView={{ opacity: 1, scale: 1, rotateX: 0 }}
    viewport={{ once: true }}
    whileHover={{
      y: -10,
      scale: 1.02,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      rotateY: 5
    }}
    transition={{ duration: 0.6, delay, type: "spring" }}
    className="bg-white/70 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-gray-200 group overflow-hidden relative"
  >
    <motion.div
      className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
      initial={false}
      animate={{ rotate: [0, 360] }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    />
    <motion.div
      className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl flex items-center justify-center mb-4 relative z-10"
      whileHover={{ rotate: 360, scale: 1.1 }}
      transition={{ duration: 0.5 }}
    >
      <Icon className="w-6 h-6 text-white" />
    </motion.div>
    <h3 className="text-lg font-bold text-gray-800 mb-2 relative z-10">{title}</h3>
    <p className="text-gray-600 text-sm leading-relaxed relative z-10">{description}</p>
  </motion.div>
);

// New Panchakarma Therapy Card Component
const TherapyCard = ({ therapy, sanskrit, description, benefits, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8, delay }}
    className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all group"
  >
    <div className="flex items-center gap-4 mb-4">
      <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center text-2xl">
        🔥
      </div>
      <div>
        <h3 className="text-xl font-bold text-gray-800">{therapy}</h3>
        <p className="text-sm text-gray-500 italic">({sanskrit})</p>
      </div>
    </div>
    <p className="text-gray-600 mb-4 leading-relaxed">{description}</p>
    <div className="space-y-2">
      {benefits.map((benefit, idx) => (
        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span>{benefit}</span>
        </div>
      ))}
    </div>
  </motion.div>
);

// Dosha Card Component
const DoshaCard = ({ dosha, element, characteristics, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8, delay }}
    className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all`}
  >
    <h3 className="text-2xl font-bold mb-2">{dosha}</h3>
    <p className="text-white/90 mb-4 text-sm">{element}</p>
    <div className="space-y-2">
      {characteristics.map((char, idx) => (
        <div key={idx} className="flex items-center gap-2 text-sm">
          <div className="w-1.5 h-1.5 bg-white/70 rounded-full"></div>
          <span>{char}</span>
        </div>
      ))}
    </div>
  </motion.div>
);

const WorkflowStep = ({ number, title, description, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, x: -100, rotateY: -30 }}
    whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8, delay, type: "spring" }}
    className="flex items-start gap-4 p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200 shadow-md group hover:shadow-xl transition-all"
  >
    <motion.div
      className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 text-white font-bold text-lg rounded-full flex items-center justify-center"
      whileHover={{ scale: 1.2, rotate: 360 }}
      transition={{ duration: 0.5 }}
    >
      {number}
    </motion.div>
    <div>
      <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  </motion.div>
);

const TestimonialCard = ({ quote, author, role, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, rotateX: -20 }}
    whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
    viewport={{ once: true }}
    whileHover={{ y: -5, rotateY: 5 }}
    transition={{ duration: 0.8, delay, type: "spring" }}
    className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200 group overflow-hidden relative"
  >
    <motion.div
      className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-green-500"
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1, delay: delay + 0.2 }}
    />
    <div className="flex mb-3">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: delay + i * 0.1 }}
        >
          <Star className="w-5 h-5 text-yellow-400 fill-current" />
        </motion.div>
      ))}
    </div>
    <p className="text-gray-600 italic mb-4 group-hover:text-gray-700 transition-colors">"{quote}"</p>
    <div>
      <p className="font-semibold text-gray-800">{author}</p>
      <p className="text-sm text-gray-500">{role}</p>
    </div>
  </motion.div>
);

export default function LandingPageComponent({ onLogin, onNavigateToApp }) {
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [showDemoVideo, setShowDemoVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState(null);
  const [demoImageUrl] = useState("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDgwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSI0NTAiIGZpbGw9IiM2MEE1RkMiLz4KICA8dGV4dCB4PSIzMjAiIHk9IjIzNSIgZm9udC1mYW1pbHk9ImludGVyc3RhdGUiIGZvbnQtd2VpZ2h0PSI3MDAiIGZvbnQtc2l6ZT0iNDgiIGZpbGw9IiNGRkZGRkYiPkRlbW8gVmlkZW88L3RleHQ+CiAgPHBhdGggZD0iTTM3NSAyMjVMNDI1IDI1MEwzNzUgMjc1VjIyNSIgZmlsbD0id2hpdGUiLz4KPC9zdmc+");
  const [showWelcomeNotification, setShowWelcomeNotification] = useState(false);
  const [authMode, setAuthMode] = useState(null); // 'signin' | 'signup' | null
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: 'patient'
  });
  // Track current user to hide auth buttons when logged in
  const [currentUser, setCurrentUser] = useState(null);

  const handleRequestDemo = async () => {
    setIsGeneratingDemo(true);
    try {
      const videoUrl = "https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4"; // Example video URL

      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay

      setGeneratedVideoUrl(videoUrl);
      setShowDemoVideo(true);
    } catch (error) {
      console.error("Failed to generate demo video:", error);
      setGeneratedVideoUrl(null);
      setShowDemoVideo(true); // Still show modal, but with placeholder
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setShowWelcomeNotification(true);
    }, 1000); // Show after 1 second

    const timer2 = setTimeout(() => {
      setShowWelcomeNotification(false);
    }, 9000); // Hide after 9 seconds (1s delay + 8s display)

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Load current user to determine auth state
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await User.me();
        if (mounted) setCurrentUser(me);
      } catch (e) {
        if (mounted) setCurrentUser(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-blue-50 via-green-50 to-purple-50 relative">
      <style>{`
        /* Production-ready styles without CDN dependency */
        .gradient-bg {
          background: linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 33%, #faf5ff 66%, #f0f9ff 100%);
        }

        .glass-effect {
          backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.85);
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        .gradient-animation {
          background: linear-gradient(-45deg, #1565c0, #2e7d32, #6a1b9a, #1565c0);
          background-size: 400% 400%;
          animation: gradient 15s ease infinite;
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* Fix mobile button overlap */
        @media (max-width: 640px) {
          .mobile-header-fix {
            padding: 1rem 0.75rem;
            gap: 0.5rem;
          }

          .mobile-header-fix .logo-section {
            flex: 1;
            min-width: 0;
          }

          .mobile-header-fix .auth-buttons {
            flex-shrink: 0;
            display: flex;
            gap: 0.5rem;
          }

          .mobile-header-fix .back-button {
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            min-width: auto;
          }

          .mobile-header-fix .sign-in-button {
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            min-width: auto;
          }

          .mobile-title {
            font-size: 2.5rem;
            line-height: 1.1;
          }

          .mobile-subtitle {
            font-size: 1.125rem;
            line-height: 1.4;
          }
        }

        @media (max-width: 480px) {
          .mobile-title {
            font-size: 2rem;
          }

          .mobile-subtitle {
            font-size: 1rem;
          }
        }
      `}</style>

      <FloatingParticles />

      {/* Welcome Notification */}
      <AnimatePresence>
        {showWelcomeNotification && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="fixed top-6 right-6 z-50 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl shadow-lg p-4 flex items-center gap-3 max-w-sm pointer-events-auto"
          >
            <Sparkles className="w-6 h-6 text-yellow-300" />
            <div className="flex-grow">
              <h3 className="font-bold text-lg mb-1">Welcome to AyurSutra!</h3>
              <p className="text-sm">Explore authentic Ayurvedic healthcare.</p>
            </div>
            <button
              onClick={() => setShowWelcomeNotification(false)}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed Mobile Header */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-4 gap-4">
        <motion.div
          className="logo-section flex items-center gap-2 sm:gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.6 }}
          >
            <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </motion.div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
              AyurSutra
            </h1>
            <p className="text-gray-500 text-sm leading-tight hidden sm:block">Healthcare Platform</p>
          </div>
        </motion.div>

        {!currentUser && (
          <div className="auth-buttons flex-shrink-0 flex items-center gap-2">
            <Link to={createPageUrl('SignUp')} className="relative z-10 bg-white text-gray-700 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-300 hover:text-gray-900 transition-colors text-sm font-medium shadow-none">
              Sign Up
            </Link>
            <Link to={createPageUrl('SignIn')} className="sign-in-button relative z-10 bg-gradient-to-r from-blue-600 to-green-600 text-white px-4 py-2 rounded-xl shadow-none transition-colors text-sm font-medium flex items-center gap-2">
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </header>

      <main className="relative z-10">
        {/* Hero Section - Mobile Optimized */}
        <section className="relative z-10 pt-8 pb-16 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="mb-8"
              >
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl animate-float overflow-hidden">
                  <img
                    src="/images/ayurveda-symbol.svg"
                    alt="Ayurveda Symbol"
                    className="w-20 h-20 object-contain"
                    loading="eager"
                  />
                </div>

                <h1 className="mobile-title text-5xl md:text-7xl font-bold mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent block">
                    AyurSutra
                  </span>
                  <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent block">
                    Panchakarma
                  </span>
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block">
                    Healthcare Revolution
                  </span>
                </h1>

                <p className="mobile-subtitle text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
                  Revolutionary healthcare platform combining ancient Ayurvedic wisdom with cutting-edge technology.
                  Personalized therapy scheduling, AI-powered consultations, and authentic Panchakarma treatments.
                </p>
              </motion.div>

              {/* Enhanced CTA Buttons - Mobile Friendly */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center mb-12"
              >
                <motion.button
                  onClick={handleRequestDemo}
                  disabled={isGeneratingDemo}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-green-600 text-white px-8 py-4 rounded-2xl text-lg font-bold shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Play className="w-6 h-6" />
                  {isGeneratingDemo ? 'Preparing Demo...' : 'Watch Live Demo'}
                </motion.button>

                {currentUser ? (
                  <motion.button
                    onClick={onNavigateToApp}
                    className="w-full sm:w-auto bg-white text-gray-700 px-8 py-4 rounded-2xl text-lg font-bold shadow-xl hover:shadow-2xl border-2 border-gray-200 hover:border-blue-300 transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Stethoscope className="w-6 h-6" />
                    Go to App
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={() => { window.location.href = createPageUrl('SignUp'); }}
                    className="w-full sm:w-auto bg-white text-gray-700 px-8 py-4 rounded-2xl text-lg font-bold shadow-xl hover:shadow-2xl border-2 border-gray-200 hover:border-blue-300 transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Stethoscope className="w-6 h-6" />
                    Start Your Journey
                  </motion.button>
                )}
              </motion.div>

              {/* Stats Section removed per request */}
            </div>
          </div>
        </section>

        {/* Authentic Panchakarma Introduction */}
        <section className="py-24 px-6 bg-gradient-to-r from-orange-50 to-yellow-50">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-6">
                Understanding Panchakarma
              </h2>
              <p className="text-xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
                Panchakarma (पञ्चकर्म) - meaning "five actions" - is a cleansing and rejuvenating program for the body, mind, and consciousness based on ancient Ayurvedic principles.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Ancient Wisdom, Modern Technology</h3>
                <div className="space-y-4 text-gray-600 leading-relaxed">
                  <p>
                    Panchakarma is based on the understanding that every human is a unique phenomenon manifested through the five basic elements: <strong>Ether, Air, Fire, Water, and Earth</strong>.
                  </p>
                  <p>
                    These elements combine to form the three doshas (Tridosha): <strong>Vata, Pitta, and Kapha</strong>. When this doshic balance is disturbed, it creates disorder resulting in disease.
                  </p>
                  <p>
                    AyurSutra ensures each Panchakarma treatment is done individually, with specific constitution and disorder considerations, requiring close observation and supervision by qualified practitioners.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="bg-white/90 rounded-3xl p-8 shadow-xl border border-orange-200"
              >
                <h4 className="text-xl font-bold text-gray-800 mb-4 text-center">Treatment Process</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                    <div>
                      <p className="font-semibold text-gray-800">Purvakarma</p>
                      <p className="text-sm text-gray-600">Pre-purification: Snehan (oil massage) & Swedana (steam therapy)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                    <div>
                      <p className="font-semibold text-gray-800">Panchakarma</p>
                      <p className="text-sm text-gray-600">Five main cleansing procedures (Shodanas)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                    <div>
                      <p className="font-semibold text-gray-800">Paschatkarma</p>
                      <p className="text-sm text-gray-600">Post-therapy care and dietary guidelines</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Tridosha System */}
        <section className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-6">
                Ayurvedic Tridosha System
              </h2>
              <p className="text-xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
                Understanding the imbalance of your unique body constitution is the basis for personalized treatment.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <DoshaCard
                dosha="VATA"
                element="Ether & Air"
                characteristics={[
                  "Controls movement and circulation",
                  "Governs nervous system",
                  "Manages breathing and heartbeat",
                  "Balances: creativity, flexibility, agility",
                  "Imbalanced: anxiety, insomnia, constipation"
                ]}
                color="from-blue-500 to-cyan-500"
                delay={0}
              />
              <DoshaCard
                dosha="PITTA"
                element="Fire & Water"
                characteristics={[
                  "Controls digestion and metabolism",
                  "Governs body temperature",
                  "Manages hormonal functions",
                  "Balances: intelligence, courage, focus",
                  "Imbalanced: inflammation, anger, acidity"
                ]}
                color="from-red-500 to-orange-500"
                delay={0.1}
              />
              <DoshaCard
                dosha="KAPHA"
                element="Water & Earth"
                characteristics={[
                  "Controls structure and stability",
                  "Governs immunity and strength",
                  "Manages joint lubrication",
                  "Balances: compassion, patience, stamina",
                  "Imbalanced: congestion, weight gain, lethargy"
                ]}
                color="from-green-500 to-emerald-500"
                delay={0.2}
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-gradient-to-r from-blue-50 to-green-50 rounded-3xl p-8 text-center"
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Personalized Constitution Analysis</h3>
              <p className="text-gray-600 leading-relaxed max-w-3xl mx-auto">
                Every individual's constitution has its own unique balance of Vata, Pitta, and Kapha according to their nature.
                AyurSutra's AI-powered system helps practitioners understand each patient's Prakriti (birth constitution) and
                Vikriti (current imbalance) to provide truly personalized Panchakarma treatments.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Five Panchakarma Therapies */}
        <section className="py-24 px-6 bg-white/50 backdrop-blur-lg">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-6">
                Five Sacred Shodanas
              </h2>
              <p className="text-xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
                The five primary cleansing methods of Panchakarma, each targeting specific imbalances and promoting holistic healing.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <TherapyCard
                therapy="Vamana"
                sanskrit="वमन - Emesis Therapy"
                description="Therapeutic vomiting to eliminate excess Kapha dosha causing respiratory and digestive congestion. Ideal for conditions like asthma, bronchitis, and chronic colds."
                benefits={[
                  "Clears respiratory congestion",
                  "Eliminates excess mucus",
                  "Treats chronic asthma and allergies",
                  "Improves digestive fire (Agni)",
                  "Releases emotional blockages"
                ]}
                delay={0}
              />

              <TherapyCard
                therapy="Virechana"
                sanskrit="विरेचन - Purgation Therapy"
                description="Controlled purgation to eliminate excess Pitta dosha from the liver, gallbladder, and small intestine. Effective for inflammatory conditions and skin disorders."
                benefits={[
                  "Cleanses liver and digestive system",
                  "Treats skin conditions and acne",
                  "Reduces inflammation",
                  "Balances hormonal disorders",
                  "Improves metabolism"
                ]}
                delay={0.1}
              />

              <TherapyCard
                therapy="Basti"
                sanskrit="बस्ति - Medicated Enema"
                description="Medicated enemas using herbal decoctions and oils to eliminate Vata dosha. Considered the most important and versatile Panchakarma therapy."
                benefits={[
                  "Treats neurological disorders",
                  "Relieves chronic constipation",
                  "Strengthens reproductive system",
                  "Improves joint mobility",
                  "Nourishes and detoxifies colon"
                ]}
                delay={0.2}
              />

              <TherapyCard
                therapy="Nasya"
                sanskrit="नस्य - Nasal Therapy"
                description="Administration of medicated oils, powders, or herbal juices through the nasal passages to clear toxins from the head and neck region."
                benefits={[
                  "Clears sinuses and nasal passages",
                  "Improves mental clarity",
                  "Treats headaches and migraines",
                  "Enhances sense organs",
                  "Balances hormones"
                ]}
                delay={0.3}
              />

              <div className="lg:col-span-2">
                <TherapyCard
                  therapy="Raktamokshana"
                  sanskrit="रक्तमोक्षण - Bloodletting Therapy"
                  description="Controlled blood purification therapy to remove toxins from the blood and lymphatic system. Used for specific conditions under expert supervision."
                  benefits={[
                    "Purifies blood and lymph",
                    "Treats skin disorders",
                    "Reduces local inflammation",
                    "Improves circulation",
                    "Treats localized infections"
                  ]}
                  delay={0.4}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 px-6">
          <motion.div
            className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            transition={{ staggerChildren: 0.2 }}
          >
            <Stat value="5000+" label="Years of Wisdom" />
            <Stat value="95%" label="Treatment Success" />
            <Stat value="100%" label="Natural & Safe" />
            <Stat value="24/7" label="Expert Support" />
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="py-24 px-6 bg-white/50 backdrop-blur-lg">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">Comprehensive Healthcare Management</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">Transform your Ayurvedic practice with intelligent automation, seamless patient care, and data-driven insights.</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard icon={Calendar} title="AI-Powered Scheduling" description="Intelligent therapy scheduling that eliminates conflicts and optimizes resource utilization with machine learning algorithms." />
              <FeatureCard icon={MessageSquare} title="AI Medical Chatbot" description="24/7 intelligent consultation assistant powered by medical AI to provide instant patient support and preliminary assessments." delay={0.1} />
              <FeatureCard icon={Shield} title="Smart Guardian Tracking" description="Real-time family involvement with automated updates, progress dashboards, and intelligent notification systems." delay={0.2} />
              <FeatureCard icon={Bell} title="Multi-Channel Notifications" description="Automated pre/post-therapy alerts via SMS, Email, and In-App with personalized timing and content." delay={0.3} />
              <FeatureCard icon={BarChart3} title="Advanced Analytics" description="Visualize patient progress, center efficiency, and therapy effectiveness with our comprehensive analytics suite." delay={0.4} />
              <FeatureCard icon={Heart} title="Integrated Health Records" description="Secure, comprehensive digital health records accessible to patients, doctors, and guardians with role-based permissions." delay={0.5} />
            </div>
          </div>
        </section>

        {/* Safety and Trust Section */}
        <section className="py-24 px-6 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-6">
                Safety & Authenticity First
              </h2>
              <p className="text-xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
                Panchakarma requires close observation and supervision by qualified practitioners. AyurSutra ensures safety through technology.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0 }}
                className="text-center bg-white/70 rounded-2xl p-6 shadow-lg"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Certified Practitioners</h3>
                <p className="text-sm text-gray-600">Only qualified Ayurvedic doctors and certified therapists in our network</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-center bg-white/70 rounded-2xl p-6 shadow-lg"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Authentic Methods</h3>
                <p className="text-sm text-gray-600">Traditional Panchakarma protocols based on classical Ayurvedic texts</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-center bg-white/70 rounded-2xl p-6 shadow-lg"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Close Supervision</h3>
                <p className="text-sm text-gray-600">Real-time monitoring and guidance throughout the treatment process</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-center bg-white/70 rounded-2xl p-6 shadow-lg"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Global Standards</h3>
                <p className="text-sm text-gray-600">Adheres to international healthcare and safety regulations</p>
              </motion.div>
            </div>

            {/* Important Notice */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-12 bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-orange-600" />
                <h3 className="text-xl font-bold text-orange-800">Important Safety Notice</h3>
              </div>
              <p className="text-orange-700 leading-relaxed max-w-4xl mx-auto">
                We strongly recommend that Panchakarma should never be performed at home without guidance from trained and licensed practitioners.
                Each therapy requires specific techniques, proper dosing, and continuous monitoring. AyurSutra connects you with qualified
                Ayurvedic doctors who ensure safe and effective treatments based on your individual constitution and health conditions.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Workflow Section */}
        <section className="py-24 px-6">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">Seamless Healthcare Journey</h2>
              <p className="text-lg text-gray-600">Experience the future of Panchakarma management with our intelligent workflow.</p>
            </motion.div>
            <div className="space-y-6">
              <WorkflowStep number="1" title="Constitutional Analysis" description="AI-powered assessment of your Prakriti (birth constitution) and Vikriti (current imbalance) by qualified Ayurvedic practitioners." />
              <WorkflowStep number="2" title="Personalized Treatment Plan" description="Custom Panchakarma protocol designed specifically for your dosha balance, health conditions, and therapeutic goals." delay={0.1} />
              <WorkflowStep number="3" title="Pre-purification Phase" description="Systematic Purvakarma including Snehan (oleation) and Swedana (sudation) to prepare your body for main treatments." delay={0.2} />
              <WorkflowStep number="4" title="Main Panchakarma Therapies" description="Administration of the five Shodanas under expert supervision with real-time monitoring and progress tracking." delay={0.3} />
              <WorkflowStep number="5" title="Post-therapy Care" description="Comprehensive Paschatkarma including dietary guidelines, lifestyle recommendations, and follow-up consultations." delay={0.4} />
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-24 px-6 bg-white/50 backdrop-blur-lg">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">Trusted by Healthcare Professionals</h2>
              <p className="text-lg text-gray-600">Join thousands of practitioners revolutionizing Ayurvedic care.</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <TestimonialCard
                quote="AyurSutra has revolutionized how we deliver authentic Panchakarma treatments. The AI scheduling ensures perfect timing for each therapy phase, and the patient monitoring is exceptional."
                author="Dr. Ramesh Verma"
                role="Senior Ayurvedic Physician, Mumbai"
              />
              <TestimonialCard
                quote="The platform's understanding of traditional Panchakarma protocols combined with modern technology makes it invaluable for our practice. Patient outcomes have improved significantly."
                author="Dr. Priya Sharma"
                role="Panchakarma Specialist, Delhi"
                delay={0.1}
              />
              <TestimonialCard
                quote="As a hospital administrator, I appreciate how AyurSutra maintains the authenticity of Ayurvedic treatments while providing the efficiency of modern healthcare management."
                author="Sunita Patel"
                role="Hospital Administrator, Bangalore"
                delay={0.2}
              />
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="relative">
          <div className="max-w-7xl mx-auto py-20 px-6 my-16 gradient-animation rounded-3xl text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Ready to Transform Your Ayurvedic Practice?</h2>
              <p className="text-lg opacity-90 mb-8">Join the healthcare revolution with authentic Panchakarma management powered by AI.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.button
                  onClick={handleRequestDemo}
                  className="px-8 py-4 bg-black/20 text-white font-bold rounded-xl hover:bg-black/30 transition"
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Watch Demo Video
                </motion.button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Auth Modal */}
      <AnimatePresence>
        {authMode && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAuthMode(null)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">{authMode === 'signin' ? 'Sign In' : 'Create Account'}</h3>
                <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setAuthMode(null)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Arjun Sharma"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="you@example.com"
                  />
                </div>
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Role</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="patient">Patient</option>
                      <option value="guardian">Guardian</option>
                      <option value="doctor">Doctor</option>
                      <option value="therapist">Therapist</option>
                      <option value="clinic_admin">Clinic Admin</option>
                      <option value="support">Support</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                )}
                {authError && (
                  <div className="text-sm text-red-600">{authError}</div>
                )}
                <button
                  disabled={authLoading}
                  onClick={async () => {
                    setAuthError('');
                    setAuthLoading(true);
                    try {
                      if (!form.email) throw new Error('Email is required');
                      if (authMode === 'signin') {
                        // Find existing by email
                        const users = await User.filter({ email: form.email });
                        if (!users || users.length === 0) throw new Error('No account found for this email');
                        const me = users[0];
                        try { localStorage.setItem('ayursutra_current_user_id', me.id); } catch {}
                      } else {
                        if (!form.full_name) throw new Error('Full name is required');
                        const created = await User.create({ full_name: form.full_name, email: form.email, role: form.role, has_selected_role: true });
                        try { localStorage.setItem('ayursutra_current_user_id', created.id); } catch {}
                      }
                      setAuthMode(null);
                      // Close landing and go to app
                      onNavigateToApp?.();
                    } catch (e) {
                      setAuthError(e.message || 'Something went wrong');
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {authLoading ? 'Please wait...' : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="relative bg-[#1a2e35] text-white">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold">AyurSutra</h1>
            </div>
            <p className="text-gray-400 text-sm mb-4">Revolutionizing Panchakarma management with authentic Ayurvedic wisdom and modern technology.</p>
            <p className="text-xs text-gray-500">Based on 5000+ years of traditional Ayurvedic knowledge</p>
          </div>

          {[
            { title: "Product", links: ["Features", "Pricing", "API", "Documentation"] },
            { title: "Company", links: ["About", "Careers", "Press", "Contact"] },
            { title: "Support", links: ["Help Center", "Community", "Status", "Safety Guidelines"] }
          ].map((column) => (
            <div key={column.title}>
              <h3 className="font-bold mb-4">{column.title}</h3>
              <ul className="space-y-2 text-gray-400">
                {column.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="hover:text-white transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-700 py-6">
          <p className="text-center text-sm text-gray-500">© 2025 AyurSutra. All rights reserved. | Authentic Ayurvedic Healthcare Platform</p>
        </div>
      </footer>

      {/* Demo Video Modal - Enhanced */}
      <AnimatePresence>
        {showDemoVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowDemoVideo(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-4xl w-full relative overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowDemoVideo(false)}
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">AyurSutra Platform Demo</h3>
                <p className="text-gray-600">Experience the future of Panchakarma healthcare management</p>
              </div>

              {generatedVideoUrl ? (
                <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden">
                  <video
                    src={generatedVideoUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-cover"
                    poster={demoImageUrl}
                  >
                    <source src={generatedVideoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-green-100 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-800 mb-2">Interactive Demo</h4>
                    <p className="text-gray-600 max-w-md">
                      Explore AyurSutra's powerful features including patient management,
                      therapy scheduling, progress tracking, and AI-assisted consultations.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-center mt-6">
                <button
                  onClick={onLogin}
                  className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                >
                  <Stethoscope className="w-5 h-5" />
                  Get Started Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Assistants */}
      <AIAvatarAssistant />
      <AIDoctorBot />
    </div>
  );
}
