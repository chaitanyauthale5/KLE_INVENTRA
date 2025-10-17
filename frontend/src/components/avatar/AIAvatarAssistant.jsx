import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Bot, 
  User as UserIcon, 
  AlertTriangle,
  Send,
  Minimize2,
  Maximize2,
  X,
  Globe,
  Stethoscope,
  Heart,
  Clock
} from 'lucide-react';
import { InvokeLLM } from '@/services/integrations';
import { User } from '@/services';
import { ConsultationLog } from '@/services';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' }
];

// Rate limiting constants
const RATE_LIMIT_DELAY = 3000; // 3 seconds between requests
const MAX_RETRIES = 2;

const ChatMessage = ({ message, isBot, timestamp, isError = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className={`flex gap-3 mb-3 ${isBot ? '' : 'flex-row-reverse'}`}
  >
    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
      isError ? 'bg-gradient-to-br from-red-500 to-orange-500' :
      isBot 
        ? 'bg-gradient-to-br from-green-500 to-blue-500' 
        : 'bg-gradient-to-br from-purple-500 to-pink-500'
    }`}>
      {isError ? <AlertTriangle className="w-4 h-4 text-white" /> :
       isBot ? <Bot className="w-4 h-4 text-white" /> : <UserIcon className="w-4 h-4 text-white" />}
    </div>
    
    <div className={`max-w-[80%] ${isBot ? '' : 'text-right'}`}>
      <div className={`inline-block p-3 rounded-xl shadow-sm text-sm ${
        isError ? 'bg-red-50 border border-red-200 text-red-800' :
        isBot 
          ? 'bg-white border border-gray-200 text-gray-800' 
          : 'bg-gradient-to-r from-blue-500 to-green-500 text-white'
      }`}>
        <p className="leading-relaxed">{message}</p>
      </div>
      <p className="text-xs text-gray-500 mt-1 px-1">{timestamp}</p>
    </div>
  </motion.div>
);

export default function AIAvatarAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const handleSendMessageRef = useRef();

  const getLanguageCode = useCallback((langCode) => {
    const codes = {
      en: 'en-US', hi: 'hi-IN', mr: 'mr-IN',
      ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN'
    };
    return codes[langCode] || 'en-US';
  }, []);

  const initWelcomeMessage = useCallback((user) => {
    const welcomeMessage = {
      en: `🙏 Namaste, ${user?.full_name || 'Guest'}! I am your personal AyurSutra Health Assistant, specialized in Panchakarma therapy and Ayurvedic wellness. How can I guide you on your healing journey today?`,
      hi: `🙏 नमस्ते, ${user?.full_name || 'अतिथि'}! मैं आपका निजी आयुर्सुत्र स्वास्थ्य सहायक हूँ, जो पंचकर्म चिकित्सा और आयुर्वेदिक कल्याण में विशेषज्ञ हूँ। आज मैं आपकी चिकित्सा यात्रा में कैसे आपका मार्गदर्शन कर सकता हूँ?`,
    };

    setMessages([{
      id: 1,
      message: welcomeMessage[selectedLanguage] || welcomeMessage.en,
      isBot: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  }, [selectedLanguage]);

  const initSpeechAPIs = useCallback(() => {
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = getLanguageCode(selectedLanguage);
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
        // Automatically send after speech detection
        if (handleSendMessageRef.current) {
          handleSendMessageRef.current(transcript);
        }
      };
      
      recognition.onerror = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [getLanguageCode, selectedLanguage]);
  
  useEffect(() => {
    const fetchUserAndInit = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
        initWelcomeMessage(user);
      } catch (error) {
        setCurrentUser(null);
        initWelcomeMessage(null);
      }
    };

    fetchUserAndInit();
    initSpeechAPIs();

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [initWelcomeMessage, initSpeechAPIs]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const startRateLimitCountdown = (seconds) => {
    setIsRateLimited(true);
    setRateLimitCountdown(seconds);
    
    countdownIntervalRef.current = setInterval(() => {
      setRateLimitCountdown(prev => {
        if (prev <= 1) {
          setIsRateLimited(false);
          clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const getRoleSpecificPrompt = (role, query, languageName) => {
    const persona = `You are AyurSutra's specialized AI Health Assistant with deep expertise in Panchakarma therapy and Ayurvedic medicine. Your personality is that of a wise, compassionate Ayurvedic practitioner with decades of experience. You combine ancient wisdom with modern understanding.

**CORE EXPERTISE:**
- All 5 Panchakarma procedures: Vamana, Virechana, Basti, Nasya, Raktamokshana
- Ayurvedic principles: Tridosha (Vata, Pitta, Kapha), Prakriti, Vikriti
- Complementary therapies: Abhyanga, Shirodhara, Swedana, Udvartana
- Ayurvedic diet and lifestyle counseling
- Herbal medicine and Rasayana therapy
- Mind-body wellness and yoga integration

**COMMUNICATION STYLE:**
- Always respond in ${languageName}
- Use appropriate cultural greetings (Namaste, etc.)
- Reference ancient Ayurvedic texts when relevant
- Be empathetic and understanding
- Keep responses conversational yet informative

**SAFETY GUIDELINES:**
1. NEVER diagnose medical conditions
2. ALWAYS recommend consulting qualified Ayurvedic doctors for treatment
3. Provide general wellness guidance and educational information
4. Emphasize the importance of proper Panchakarma supervision
5. Suggest lifestyle and dietary recommendations based on Ayurvedic principles

**PLATFORM INTEGRATION:**
- Promote AyurSutra's comprehensive Panchakarma management system
- Explain how our platform helps track therapy progress
- Highlight the importance of structured treatment protocols
- Mention our multilingual support capabilities

Respond as a knowledgeable, caring Ayurvedic health advisor.`;

    let roleContext = '';
    switch (role) {
        case 'patient': roleContext = `The user is a PATIENT seeking Ayurvedic guidance. Focus on education, comfort, and general wellness advice while encouraging professional consultation.`; break;
        case 'guardian': roleContext = `The user is a GUARDIAN caring for someone undergoing Panchakarma. Provide supportive information about the healing process and what to expect.`; break;
        case 'doctor': roleContext = `The user is a DOCTOR. Engage at a professional level with detailed Ayurvedic concepts, treatment protocols, and clinical insights.`; break;
        case 'therapist': roleContext = `The user is a THERAPIST. Discuss practical aspects of Panchakarma procedures, patient care, and therapy techniques.`; break;
        default: roleContext = `The user is exploring Ayurveda and Panchakarma. Provide educational information about these ancient healing systems and AyurSutra's approach.`;
    }

    return `${persona}\n\n${roleContext}\n\nUser's question: "${query}"`;
  };

  const speakMessage = useCallback((text) => {
    if (synthRef.current && !isMuted) {
      synthRef.current.cancel();
      setIsSpeaking(true);
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getLanguageCode(selectedLanguage);
      utterance.rate = 1;
      utterance.pitch = 1;
      
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      synthRef.current.speak(utterance);
    }
  }, [getLanguageCode, isMuted, selectedLanguage, setIsSpeaking]);

  const handleSendMessage = useCallback(async (messageText) => {
    const query = messageText || inputMessage;
    if (!query.trim() || isTyping || isRateLimited) return;

    const now = Date.now();
    if (now - lastRequestTime < RATE_LIMIT_DELAY) {
      const remainingTime = Math.ceil((RATE_LIMIT_DELAY - (now - lastRequestTime)) / 1000);
      startRateLimitCountdown(remainingTime);
      return;
    }

    const userMessage = {
      id: Date.now(),
      message: query,
      isBot: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    setLastRequestTime(now);

    try {
      const languageName = LANGUAGES.find(l => l.code === selectedLanguage)?.name || 'English';
      const fullPrompt = getRoleSpecificPrompt(currentUser?.role, query, languageName);
      
      const response = await InvokeLLM({ prompt: fullPrompt });

      const botMessage = {
        id: Date.now() + 1,
        message: response,
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, botMessage]);
      speakMessage(response);

      if (currentUser) {
        await ConsultationLog.create({
          user_id: currentUser.id, user_role: currentUser.role || 'guest',
          query, response, language: selectedLanguage
        });
      }

    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      const errorMsg = {
        id: Date.now() + 1,
        message: "I'm experiencing some technical difficulties. Please try again in a moment. Namaste! 🙏",
        isBot: true, isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [inputMessage, isTyping, isRateLimited, lastRequestTime, currentUser, selectedLanguage, speakMessage]);

  handleSendMessageRef.current = handleSendMessage; // Assign the latest memoized function to the ref

  const startListening = () => {
    if (recognitionRef.current && !isRateLimited) {
      synthRef.current?.cancel();
      setIsListening(true);
      recognitionRef.current.lang = getLanguageCode(selectedLanguage);
      recognitionRef.current.start();
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 left-6 w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 text-white rounded-full shadow-2xl z-[1001] flex items-center justify-center hover:shadow-green-500/25 transition-all duration-300"
            aria-label="Open AI Health Assistant"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Stethoscope className="w-8 h-8" />
            </motion.div>
            
            <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-20"></div>
            {isSpeaking && (
              <motion.div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
                <Heart className="w-3 h-3 text-white" />
              </motion.div>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50, x: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50, x: -50 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`fixed z-[1000] bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 flex flex-col ${
              isMinimized 
                ? 'bottom-6 left-6 w-80 h-14' 
                : 'bottom-6 left-6 w-[90vw] md:w-96 h-[70vh] md:h-[650px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-t-3xl cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
                  animate={isSpeaking ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                  transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}
                >
                  <Stethoscope className="w-5 h-5" />
                </motion.div>
                <div>
                  <h3 className="font-bold text-sm">🌿 AyurSutra Assistant</h3>
                  <p className="text-xs opacity-80">
                    {isRateLimited ? `Waiting (${rateLimitCountdown}s)` : (isListening ? "Listening..." : "Panchakarma Specialist")}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); setShowLanguageSelector(!showLanguageSelector); }} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><Globe className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">{isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
                <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">{isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}</button>
                <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
              </div>
            </div>

            {showLanguageSelector && !isMinimized && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 border-b bg-gray-50/50">
                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGES.map((lang) => (
                    <button key={lang.code} onClick={() => { setSelectedLanguage(lang.code); setShowLanguageSelector(false); }}
                      className={`p-2 rounded-lg text-xs transition-colors ${selectedLanguage === lang.code ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-white hover:bg-gray-100 border border-gray-200'}`}>
                      <span className="block">{lang.flag}</span>
                      <span className="block font-medium">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {!isMinimized && (
              <>
                <div className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-blue-50/20 to-green-50/20">
                  {messages.map((msg) => <ChatMessage key={msg.id} {...msg} />)}
                  {isTyping && ( /* Typing indicator */ <div className="flex gap-3"><div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div><div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex gap-1.5 items-center"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div></div></div>)}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t bg-white/70">
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                      <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={isListening ? "Listening for Ayurvedic guidance..." : "Ask about Panchakarma, doshas, or wellness..."}
                        className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={startListening} disabled={isTyping || isRateLimited}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        <Mic className="w-4 h-4" />
                      </motion.button>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleSendMessage()}
                      disabled={!inputMessage.trim() || isTyping || isRateLimited}
                      className="p-2.5 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50">
                      <Send className="w-4 h-4" />
                    </motion.button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">🌿 Specialized in Panchakarma & Ayurvedic wellness guidance</p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}