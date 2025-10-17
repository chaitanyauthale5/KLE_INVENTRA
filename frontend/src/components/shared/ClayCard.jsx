import React from 'react';

export default function ClayCard({ 
  children, 
  className = "", 
  variant = "default",
  onClick,
  hoverable = false 
}) {
  const variants = {
    default: "bg-gradient-to-br from-white to-purple-50",
    primary: "bg-gradient-to-br from-purple-100 to-blue-100",
    success: "bg-gradient-to-br from-green-100 to-mint-100",
    warning: "bg-gradient-to-br from-yellow-100 to-orange-100",
    info: "bg-gradient-to-br from-blue-100 to-cyan-100"
  };

  return (
    <div
      className={`
        ${variants[variant]}
        rounded-2xl p-6
        shadow-lg
        border border-white/50
        backdrop-blur-sm
        transition-all duration-300
        ${hoverable ? 'hover:shadow-xl hover:-translate-y-1' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      style={{
        boxShadow: `
          12px 12px 24px rgba(139, 69, 193, 0.1),
          -12px -12px 24px rgba(255, 255, 255, 0.8),
          inset -2px -2px 8px rgba(139, 69, 193, 0.05),
          inset 2px 2px 8px rgba(255, 255, 255, 0.8)
        `
      }}
    >
      {children}
    </div>
  );
}