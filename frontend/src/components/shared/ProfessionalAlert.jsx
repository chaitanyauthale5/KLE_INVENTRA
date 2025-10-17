import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';

export default function ProfessionalAlert({ 
  type = 'info', 
  title, 
  message, 
  onClose, 
  actions = [],
  className = '' 
}) {
  const getAlertStyles = () => {
    const baseStyle = "backdrop-blur-xl border-2 rounded-2xl p-6 shadow-2xl";
    switch (type) {
      case 'success':
        return `${baseStyle} bg-green-50/90 border-green-200 text-green-800`;
      case 'error':
        return `${baseStyle} bg-red-50/90 border-red-200 text-red-800`;
      case 'warning':
        return `${baseStyle} bg-amber-50/90 border-amber-200 text-amber-800`;
      default:
        return `${baseStyle} bg-blue-50/90 border-blue-200 text-blue-800`;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle className="w-6 h-6" />;
      case 'error': return <XCircle className="w-6 h-6" />;
      case 'warning': return <AlertTriangle className="w-6 h-6" />;
      default: return <Info className="w-6 h-6" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`${getAlertStyles()} ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-lg font-bold mb-2">{title}</h3>
          )}
          {message && (
            <p className="text-sm leading-relaxed mb-4">{message}</p>
          )}
          
          {actions.length > 0 && (
            <div className="flex gap-3">
              {actions.map((action, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={action.onClick}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    action.variant === 'primary' 
                      ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white hover:shadow-lg' 
                      : 'bg-white/80 hover:bg-white border border-current'
                  }`}
                >
                  {action.label}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-full hover:bg-white/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}