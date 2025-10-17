import React from 'react';

export default function ClayButton({ 
  children, 
  className = "", 
  variant = "default",
  size = "md",
  onClick,
  disabled = false,
  type = "button",
  ...props 
}) {
  const variants = {
    default: "bg-gradient-to-br from-white to-purple-50 text-gray-700 hover:text-purple-700",
    primary: "bg-gradient-to-br from-purple-200 to-blue-200 text-purple-800 hover:text-purple-900",
    success: "bg-gradient-to-br from-green-200 to-mint-200 text-green-800 hover:text-green-900",
    warning: "bg-gradient-to-br from-yellow-200 to-orange-200 text-orange-800 hover:text-orange-900",
    danger: "bg-gradient-to-br from-red-200 to-pink-200 text-red-800 hover:text-red-900"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        rounded-2xl font-semibold
        border border-white/50
        transition-all duration-300
        hover:shadow-lg hover:-translate-y-0.5
        active:translate-y-0
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      style={{
        boxShadow: `
          8px 8px 16px rgba(139, 69, 193, 0.1),
          -8px -8px 16px rgba(255, 255, 255, 0.8),
          inset -1px -1px 3px rgba(139, 69, 193, 0.05),
          inset 1px 1px 3px rgba(255, 255, 255, 0.8)
        `
      }}
      {...props}
    >
      {children}
    </button>
  );
}