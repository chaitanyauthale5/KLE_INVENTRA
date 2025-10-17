import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart,
  Bell,
  Calendar,
  HeartPulse,
  MessageSquare,
  Play,
  Star,
  Stethoscope
} from 'lucide-react';
import { useState } from 'react';

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, delay }}
    viewport={{ once: true }}
    className="bg-white/70 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-xl text-center hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
  >
    <motion.div
      className="w-20 h-20 bg-gradient-to-br from-blue-500 to-green-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg"
      whileHover={{ scale: 1.1, rotate: 5 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Icon className="w-10 h-10 text-white" />
    </motion.div>
    <h3 className="text-2xl font-bold text-gray-800 mb-4">{title}</h3>
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </motion.div>
);

const StepCard = ({ number, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, x: -100 }}
    whileInView={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.8, delay }}
    viewport={{ once: true }}
    className="flex items-start gap-6 p-6 bg-white/60 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
  >
    <motion.div
      className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center font-bold text-2xl text-white shadow-lg"
      whileHover={{ scale: 1.1 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      {number}
    </motion.div>
    <div>
      <h4 className="text-xl font-bold text-gray-800 mb-2">{title}</h4>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

const StatCard = ({ number, label, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.5 }}
    whileInView={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.8, delay }}
    viewport={{ once: true }}
    className="text-center"
  >
    <motion.div
      className="text-4xl font-bold text-blue-600 mb-2"
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
    >
      {number}
    </motion.div>
    <p className="text-gray-600 font-medium">{label}</p>
  </motion.div>
);

export default function LandingPage({ onLogin }) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-purple-50 text-gray-800 overflow-x-hidden">
      <style>{`
        .floating-animation {
          animation: float 6s ease-in-out infinite;
        }
        .floating-animation-delayed {
          animation: float 6s ease-in-out infinite;
          animation-delay: -3s;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.33); opacity: 1; }
          80%, 100% { transform: scale(2.33); opacity: 0; }
        }
        .gradient-text {
          background: linear-gradient(135deg, #1565c0, #2e7d32, #1976d2);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradient-shift 3s ease infinite;
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute top-0 left-0 right-0 z-10 p-6 flex justify-between items-center"
      >
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.05 }}
        >
          <motion.div
            className="relative"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Stethoscope className="w-10 h-10 text-blue-600" />
            <div className="absolute inset-0 w-10 h-10 rounded-full bg-blue-500 opacity-20 pulse-ring"></div>
          </motion.div>
          <span className="text-3xl font-bold gradient-text">AyurSutra</span>
        </motion.div>
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-white/80 backdrop-blur-sm text-blue-600 rounded-full font-semibold hover:bg-white transition-all duration-300 shadow-lg"
          >
            Request Demo
          </motion.button>
          <motion.button
            onClick={onLogin}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-full font-semibold hover:shadow-xl transition-all duration-300 shadow-lg flex items-center gap-2"
          >
            Sign In
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center text-center p-6 pt-24">
        {/* Floating Medical Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-10 w-16 h-16 bg-blue-400 rounded-full opacity-20 floating-animation"
            animate={{ x: [0, 100, 0] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-40 right-20 w-8 h-8 bg-green-400 rounded-full opacity-30 floating-animation-delayed"
            animate={{ x: [0, -150, 0] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-40 left-1/4 w-12 h-12 bg-purple-400 rounded-full opacity-25"
            animate={{ y: [0, -200, 0], rotate: [0, 360] }}
            transition={{ duration: 12, repeat: Infinity }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-1 max-w-5xl mx-auto"
        >
          <motion.h1
            className="text-6xl md:text-8xl font-extrabold gradient-text mb-8"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
          AyurSutra Panchakarma
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="max-w-4xl mx-auto text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed"
          >
            Revolutionary healthcare platform combining ancient Ayurvedic wisdom with cutting-edge technology for 
            automated therapy scheduling, AI-powered consultations, and real-time progress tracking
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16"
          >
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-blue-600 via-green-600 to-purple-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:shadow-2xl transition-all duration-300 flex items-center gap-3"
            >
              <Play className="w-6 h-6" />
              Watch Live Demo
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white/80 backdrop-blur-sm border-2 border-blue-200 text-gray-700 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-white hover:shadow-lg transition-all duration-300"
            >
              For Healthcare Centers
            </motion.button>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto"
          >
            <StatCard number="90%" label="Scheduling Efficiency" delay={0} />
            <StatCard number="75%" label="Patient Satisfaction" delay={0.2} />
            <StatCard number="60%" label="Cost Reduction" delay={0.4} />
            <StatCard number="24/7" label="AI Support" delay={0.6} />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold gradient-text mb-6">
              Comprehensive Healthcare Management
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transform your Ayurvedic practice with intelligent automation, seamless patient care, 
              and data-driven insights
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Calendar} 
              title="Support for Android" 
              description="Seamless support and compatibility designed for Android devices, ensuring smooth performance and user-friendly experience."
              delay={0}
            />
            <FeatureCard 
              icon={MessageSquare} 
              title="AI Medical Chatbot" 
              description="24/7 intelligent consultation assistant powered by medical AI to provide instant patient support and preliminary assessments."
              delay={0.2}
            />
            <FeatureCard 
              icon={Bell} 
              title="Multi-Channel Notifications" 
              description="Automated pre/post-therapy alerts via SMS, Email, and In-App with personalized timing and content."
              delay={0.6}
            />
            <FeatureCard 
              icon={BarChart} 
              title="Advanced Analytics" 
              description="Visualize patient progress, center efficiency, and treatment outcomes with powerful AI-driven insights."
              delay={0.8}
            />
            <FeatureCard 
              icon={HeartPulse} 
              title="Integrated Health Records" 
              description="Secure, comprehensive digital health records with automated backup, compliance, and instant access."
              delay={1.0}
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 bg-white/60 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold gradient-text mb-6">
              Seamless Healthcare Journey
            </h2>
            <p className="text-xl text-gray-600">
              Experience the future of Panchakarma management with our intelligent workflow
            </p>
          </motion.div>
          
          <div className="space-y-8">
            <StepCard 
              number="1" 
              title="Smart Patient Registration" 
              description="AI-powered onboarding with automated health assessments, risk analysis, and personalized treatment recommendations."
              delay={0}
            />
            <StepCard 
              number="2" 
              title="Intelligent Therapy Planning" 
              description="Machine learning algorithms generate optimal, conflict-free therapy schedules based on patient needs, staff availability, and resource optimization."
              delay={0.2}
            />
            <StepCard 
              number="3" 
              title="Automated Communication Hub" 
              description="Multi-channel notification system with personalized reminders, care instructions, and real-time updates for patients and guardians."
              delay={0.4}
            />
            <StepCard 
              number="4" 
              title="AI-Powered Progress Monitoring" 
              description="Continuous health monitoring with predictive analytics, automated progress tracking, and intelligent guardian portal updates."
              delay={0.6}
            />
            <StepCard 
              number="5" 
              title="Intelligent Reporting Engine" 
              description="Automated generation of comprehensive medical reports with AI insights, predictive health analytics, and compliance documentation."
              delay={0.8}
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold gradient-text mb-6">
              Trusted by Healthcare Professionals
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of practitioners revolutionizing Ayurvedic care
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Dr. Priya Sharma",
                role: "Chief Ayurvedic Physician",
                image: "👩‍⚕️",
                review: "AyurSutra transformed our practice efficiency by 90%. The AI scheduling is phenomenal!"
              },
              {
                name: "Rajesh Kumar",
                role: "Healthcare Administrator",
                image: "👨‍💼",
                review: "Patient satisfaction increased dramatically with the automated notifications and guardian portal."
              },
              {
                name: "Dr. Anita Patel",
                role: "Panchakarma Specialist",
                image: "👩‍⚕️",
                review: "The AI chatbot handles patient queries 24/7, giving us more time for actual patient care."
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="bg-white/70 backdrop-blur-xl p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.review}"</p>
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{testimonial.image}</div>
                  <div>
                    <h4 className="font-bold text-gray-800">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-green-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl font-bold mb-6">
              Ready to Transform Your Practice?
            </h2>
            <p className="text-xl mb-10 opacity-90">
              Join the healthcare revolution with AI-powered Panchakarma management
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onLogin}
                className="bg-white text-blue-600 px-10 py-5 rounded-2xl font-bold text-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-3"
              >
                Get Started Free
                <ArrowRight className="w-6 h-6" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-transparent border-2 border-white text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-white hover:text-blue-600 transition-all duration-300"
              >
                Schedule Demo
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Stethoscope className="w-8 h-8 text-blue-400" />
                <span className="text-2xl font-bold">AyurSutra</span>
              </div>
              <p className="text-gray-400">
                Revolutionizing Panchakarma management with AI-powered healthcare technology.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Features</li>
                <li>Pricing</li>
                <li>API</li>
                <li>Documentation</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>About</li>
                <li>Careers</li>
                <li>Press</li>
                <li>Contact</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>Community</li>
                <li>Status</li>
                <li>Security</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} AyurSutra. All rights reserved. | Built for SIH 2025</p>
            <p className="mt-2">🏆 Innovating Ayurvedic healthcare for a healthier tomorrow</p>
          </div>
        </div>
      </footer>
    </div>
  );
}