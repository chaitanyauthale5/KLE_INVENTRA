import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export default function NotificationSystem() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Global notification function
    window.showNotification = (notification) => {
      const id = Date.now() + Math.random();
      const newNotification = {
        id,
        type: notification.type || 'info',
        title: notification.title || 'AyurSutra',
        message: notification.message || '',
        autoClose: notification.autoClose !== false,
        duration: notification.duration || 5000
      };

      setNotifications(prev => [...prev, newNotification]);

      if (newNotification.autoClose) {
        setTimeout(() => {
          removeNotification(id);
        }, newNotification.duration);
      }
    };

    return () => {
      window.showNotification = null;
    };
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      default:
        return <Info className="w-6 h-6 text-blue-600" />;
    }
  };

  const getColors = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[99999] space-y-3 max-w-sm w-full">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.3 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className={`p-4 rounded-2xl border shadow-lg backdrop-blur-sm ${getColors(notification.type)}`}
          >
            <div className="flex items-start gap-3">
              {getIcon(notification.type)}
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">{notification.title}</h4>
                <p className="text-sm opacity-90">{notification.message}</p>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="p-1 hover:bg-black/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}