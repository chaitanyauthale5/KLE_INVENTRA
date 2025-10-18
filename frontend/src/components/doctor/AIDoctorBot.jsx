import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  X, 
  Minimize2, 
  Maximize2,
  Brain,
  Heart,
  Activity,
  Globe
} from 'lucide-react';
import { InvokeLLM } from '@/services/integrations';
import { User } from '@/services';
import { ConsultationLog } from '@/services';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', voice: 'en-US', greeting: 'Namaste! I am Dr. Ayur, your AI Panchakarma specialist and Ayurvedic physician.' },
  { code: 'hi', name: 'हिंदी', voice: 'hi-IN', greeting: 'नमस्ते! मैं डॉ. आयुर हूँ, आपका AI पंचकर्म विशेषज्ञ और आयुर्वेदिक चिकित्सक।' },
  { code: 'mr', name: 'मराठी', voice: 'mr-IN', greeting: 'नमस्कार! मी डॉ. आयुर आहे, तुमचा AI पंचकर्म तज्ञ आणि आयुर्वेदिक वैद्य।' },
  { code: 'ta', name: 'தமிழ்', voice: 'ta-IN', greeting: 'வணக்கம்! நான் டாக்டர் ஆயுர், உங்கள் AI பஞ்சகர்மா நிபுணர் மற்றும் ஆயுர்வேத மருத்துவர்.' },
  { code: 'te', name: 'తెలుగు', voice: 'te-IN', greeting: 'నమస్కారం! నేను డాక్టర్ ఆయుర్, మీ AI పంచకర్మ నిపుణుడు మరియు ఆయుర్వేద వైద్యుడు.' },
  { code: 'bn', name: 'বাংলা', voice: 'bn-IN', greeting: 'নমস্কার! আমি ডা. আয়ুর, আপনার AI পঞ্চকর্ম বিশেষজ্ঞ এবং আয়ুর্বেদিক চিকিৎসক।' }
];

export default function AIDoctorBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState(0);
  const [conversationHistory, setConversationHistory] = useState([]);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const animationFrameRef = useRef(null);
  const handleVoiceInputRef = useRef();

  // Helper functions for animations
  const startPulseAnimation = useCallback(() => {
    const animate = () => {
      setPulseIntensity(prev => (prev + 0.1) % (Math.PI * 2));
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
  }, []);

  const stopPulseAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setPulseIntensity(0);
  }, []);

  // Function to handle speech synthesis - NOW WRAPPED IN useCallback
  const speak = useCallback((text, language = selectedLanguage) => {
    if (!synthRef.current || isMuted) return;
    
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === language);
    utterance.lang = lang?.voice || 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      startPulseAnimation();
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      stopPulseAnimation();
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
      stopPulseAnimation();
    };
    
    synthRef.current.speak(utterance);
  }, [isMuted, selectedLanguage, startPulseAnimation, stopPulseAnimation]);

  // Function to generate the LLM prompt
  const getAdvancedMedicalPrompt = useCallback((query, userRole, language) => {
    const languageInfo = SUPPORTED_LANGUAGES.find(l => l.code === language);
    const languageName = languageInfo?.name || 'English';
    
    return `You are Dr. Ayur, the most advanced AI Panchakarma physician and Ayurvedic specialist with centuries of combined wisdom from:

**DEEP EXPERTISE IN:**
- All 5 Classical Panchakarma Procedures: Vamana (therapeutic emesis), Virechana (purgation), Basti (medicated enemas), Nasya (nasal therapies), Raktamokshana (blood purification)
- Tridosha Theory: Vata, Pitta, Kapha imbalances and harmonization
- Constitutional Analysis: Prakriti (birth constitution) and Vikriti (current imbalance)
- Ayurvedic Pharmacology: Rasayana (rejuvenatives), Pachana (digestives), Medhya Rasayanas (brain tonics)
- Complementary Therapies: Abhyanga, Shirodhara, Swedana, Udvartana, Pinda Sweda
- Ayurvedic Psychology: Satva, Rajas, Tamas and mental health
- Seasonal Regimens: Ritucharya and daily routines (Dinacharya)

**PERSONALITY & APPROACH:**
- Extremely compassionate and wise like the greatest Ayurvedic Acharyas
- Speak with the authority of ancient texts (Charaka Samhita, Sushruta Samhita, Ashtanga Hridaya)
- Always begin with appropriate cultural greetings in ${languageName}
- Show deep understanding of mind-body-spirit connection
- Be encouraging about the healing journey
- Reference seasonal changes, constitutional factors, and lifestyle

**COMMUNICATION STYLE:**
- Keep responses conversational and under 3 sentences for voice interaction
- Always respond in ${languageName}
- Use simple, understandable Ayurvedic terminology with brief explanations
- Include appropriate Sanskrit terms with pronunciations when helpful
- Never diagnose specific diseases or prescribe medicines - recommend consulting qualified Ayurvedic physicians
- Focus on lifestyle, diet, and general wellness based on Ayurvedic principles

**SAFETY & ETHICS:**
- Always recommend consulting qualified Ayurvedic doctors for Panchakarma procedures
- Emphasize the importance of proper supervision for detoxification therapies
- Provide general wellness guidance based on Ayurvedic principles
- Promote AyurSutra's comprehensive treatment tracking and professional care

**CONTEXT:** The user is a ${userRole || 'seeker of Ayurvedic wisdom'} asking about: "${query}"

**CULTURAL SENSITIVITY:** Adapt your communication style to show respect for the user's cultural background and health beliefs.

Respond as Dr. Ayur with deep Ayurvedic wisdom, practical guidance, and compassionate care in ${languageName}.`;
  }, []);

  // Memoized callback for handling voice input
  const handleVoiceInput = useCallback(async (voiceText) => {
    if (!voiceText.trim()) return;
    
    setIsProcessing(true);
    setTranscript(voiceText);
    
    try {
      const prompt = getAdvancedMedicalPrompt(voiceText, currentUser?.role, selectedLanguage);
      const response = await InvokeLLM({ prompt });
      
      setLastResponse(response);
      speak(response);
      
      // Add to conversation history
      setConversationHistory(prev => [...prev, 
        { type: 'user', message: voiceText, timestamp: new Date() },
        { type: 'ai', message: response, timestamp: new Date() }
      ]);
      
      // Log consultation
      if (currentUser) {
        await ConsultationLog.create({
          user_id: currentUser.id,
          user_role: currentUser.role || 'guest',
          query: voiceText,
          response: response,
          language: selectedLanguage
        });
      }
      
    } catch (error) {
      console.error('AI Doctor error:', error);
      const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage);
      const errorMessage = selectedLanguage === 'hi' 
        ? 'क्षमा करें, मुझे कुछ तकनीकी समस्या हो रही है। कृपया दोबारा कोशिश करें। आयुर्वेद की शक्ति अटूट है।'
        : selectedLanguage === 'mr'
        ? 'माफ करा, मला काही तांत्रिक समस्या येत आहे. कृपया पुन्हा प्रयत्न करा. आयुर्वेदाची शक्ती अतूट आहे.'
        : selectedLanguage === 'ta'
        ? 'மன்னிக்கவும், எனக்கு சில தொழில்நுட்ப பிரச்சினைகள் உள்ளன. தயவுசெய்து மீண்டும் முயற்சிக்கவும். ஆயுர்வேதத்தின் சக்தி அளவற்றது.'
        : selectedLanguage === 'te'
        ? 'క్షమించండి, నాకు కొన్ని సాంకేతిక సమస్యలు ఉన్నాయి. దయచేసి మళ్లీ ప్రయత్నించండి. ఆయుర్వేదం యొక్క శక్తి అనంతం.'
        : selectedLanguage === 'bn'
        ? 'দুঃখিত, আমার কিছু প্রযুক্তিগত সমস্যা হচ্ছে। অনুগ্রহ করে আবার চেষ্টা করুন। আয়ুর্বেদের শক্তি অসীম।'
        : 'I apologize, I\'m experiencing some technical difficulties. Please try again. The wisdom of Ayurveda endures forever.';
      speak(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser, selectedLanguage, speak, getAdvancedMedicalPrompt]);

  handleVoiceInputRef.current = handleVoiceInput;

  useEffect(() => {
    // Initialize user
    User.me().then(setCurrentUser).catch(() => setCurrentUser(null));
    
    // Initialize Speech Synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.voice || 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
        startPulseAnimation();
      };
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
        }
      };
      
      recognition.onend = () => {
        setIsListening(false);
        stopPulseAnimation();
        // We use a functional state update to get the latest transcript
        setTranscript(currentTranscript => {
          if (currentTranscript) {
            handleVoiceInputRef.current(currentTranscript);
          }
          return ''; // Clear transcript after processing
        });
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        stopPulseAnimation();
        const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage);
        const errorMessage = selectedLanguage === 'hi' 
          ? 'माफ़ करना, आवाज़ पहचान में दिक्कत हुई। कृपया दोबारा बोलें।'
          : 'Sorry, I had trouble recognizing your voice. Please speak again.';
        speak(errorMessage);
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (synthRef.current) synthRef.current.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [selectedLanguage, speak, startPulseAnimation, stopPulseAnimation]);

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isSpeaking) {
      const lang = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage);
      recognitionRef.current.lang = lang?.voice || 'en-US';
      recognitionRef.current.start();
    }
  };

  const stopCurrent = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (isSpeaking && synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      stopPulseAnimation();
    }
  };

  const DoctorAvatar = () => (
    <motion.div
      className="relative w-16 h-16 bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-2xl"
      animate={{
        scale: isListening || isSpeaking ? [1, 1.1, 1] : 1,
        rotate: isProcessing ? [0, 360] : 0,
        boxShadow: isListening 
          ? `0 0 ${20 + Math.sin(pulseIntensity) * 10}px rgba(16, 185, 129, 0.6)`
          : isSpeaking 
          ? `0 0 ${20 + Math.sin(pulseIntensity) * 15}px rgba(59, 130, 246, 0.6)`
          : '0 10px 25px rgba(0, 0, 0, 0.2)'
      }}
      transition={{ 
        scale: { duration: 0.6, repeat: (isListening || isSpeaking) ? Infinity : 0 },
        rotate: { duration: 2, repeat: isProcessing ? Infinity : 0, ease: 'linear' },
        boxShadow: { duration: 0.1 }
      }}
    >
      <Brain className="w-8 h-8 text-white" />
      
      {/* Pulse rings */}
      <AnimatePresence>
        {(isListening || isSpeaking) && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-emerald-400"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ scale: 1, opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-blue-400"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2.5, opacity: 0 }}
              exit={{ scale: 1, opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
            />
          </>
        )}
      </AnimatePresence>
      
      {/* Status indicators */}
      <div className="absolute -top-2 -right-2">
        {isListening && (
          <motion.div 
            className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <Mic className="w-3 h-3 text-white" />
          </motion.div>
        )}
        {isSpeaking && (
          <motion.div 
            className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <Volume2 className="w-3 h-3 text-white" />
          </motion.div>
        )}
        {isProcessing && (
          <motion.div 
            className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Brain className="w-3 h-3 text-white" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );

  return (
    <>
      {/* Main Avatar Button - BOTTOM RIGHT */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0, x: 100 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 0, opacity: 0, x: 100 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-[1001]"
            aria-label="Open AI Panchakarma Doctor"
          >
            <DoctorAvatar />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 100, y: 100 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 100, y: 100 }}
            className={`fixed z-[1000] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 ${
              isMinimized 
                ? 'bottom-6 right-6 w-80 h-16' 
                : 'bottom-6 right-6 w-[90vw] md:w-96 h-[80vh] md:h-[500px]'
            }`}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 text-white rounded-t-3xl cursor-pointer"
              onClick={() => !isMinimized && setIsMinimized(!isMinimized)}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
                  animate={isSpeaking ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}
                >
                  <Brain className="w-5 h-5" />
                </motion.div>
                <div>
                  <h3 className="font-bold text-sm">🧠 Dr. Ayur - Panchakarma AI</h3>
                  <p className="text-xs opacity-80">
                    {isListening ? 'Listening to your health concerns...' : 
                     isSpeaking ? 'Providing Ayurvedic guidance...' : 
                     isProcessing ? 'Analyzing with ancient wisdom...' : 'Ayurvedic Consultation Ready'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowLanguageSelector(!showLanguageSelector); }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <Globe className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Language Selector */}
            {showLanguageSelector && !isMinimized && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="p-3 border-b bg-gray-50"
              >
                <div className="grid grid-cols-2 gap-2">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setSelectedLanguage(lang.code);
                        setShowLanguageSelector(false);
                        speak(lang.greeting, lang.code);
                      }}
                      className={`p-2 rounded-lg text-xs transition-colors ${
                        selectedLanguage === lang.code 
                          ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                          : 'bg-white hover:bg-gray-100'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {!isMinimized && (
              <>
                {/* Main Interface */}
                <div className="flex-1 p-6 flex flex-col items-center justify-center">
                  <motion.button
                    onClick={isListening || isSpeaking ? stopCurrent : startListening}
                    className="mb-6"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <DoctorAvatar />
                  </motion.button>
                  
                  <div className="text-center mb-4">
                    <motion.h2 
                      className="text-xl font-bold text-gray-800 mb-2"
                      animate={isProcessing ? { opacity: [1, 0.5, 1] } : {}}
                      transition={{ duration: 1, repeat: isProcessing ? Infinity : 0 }}
                    >
                      {isListening ? 'Listening to your health concerns...' :
                       isSpeaking ? 'Sharing Ayurvedic wisdom...' :
                       isProcessing ? 'Consulting ancient medical texts...' : 
                       'Tap to consult with Dr. Ayur'}
                    </motion.h2>
                    
                    {transcript && (
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg"
                      >
                        "{transcript}"
                      </motion.p>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-center text-xs text-gray-500">
                    <span className="px-2 py-1 bg-green-100 rounded-full">🌿 Panchakarma Expert</span>
                    <span className="px-2 py-1 bg-blue-100 rounded-full">🧘 Ayurvedic Physician</span>
                    <span className="px-2 py-1 bg-purple-100 rounded-full">🧠 AI Powered</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-3 border-t bg-gray-50/50 rounded-b-3xl">
                  <p className="text-xs text-center text-gray-500">
                    🌿 Ancient Ayurvedic wisdom • AI-powered guidance • Always consult qualified doctors for treatment
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}