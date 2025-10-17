import React from 'react';
import ClayCard from './ClayCard';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function ProgressCard({ 
  title, 
  value, 
  previousValue, 
  icon: Icon, 
  color = "purple",
  suffix = "",
  className = ""
}) {
  const getProgressIcon = () => {
    if (previousValue === undefined) return <Minus className="w-4 h-4" />;
    if (value > previousValue) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (value < previousValue) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getProgressColor = () => {
    if (previousValue === undefined) return "text-gray-500";
    if (value > previousValue) return "text-green-500";
    if (value < previousValue) return "text-red-500";
    return "text-gray-500";
  };

  const colorVariants = {
    purple: "from-purple-400 to-blue-400",
    green: "from-green-400 to-emerald-400",
    blue: "from-blue-400 to-cyan-400",
    orange: "from-orange-400 to-red-400",
    pink: "from-pink-400 to-rose-400"
  };

  return (
    <ClayCard hoverable className={className}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium mb-2">{title}</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-gray-800">
              {value}{suffix}
            </span>
            {previousValue !== undefined && (
              <div className={`flex items-center gap-1 ${getProgressColor()}`}>
                {getProgressIcon()}
                <span className="text-sm font-medium">
                  {Math.abs(value - previousValue)}{suffix}
                </span>
              </div>
            )}
          </div>
        </div>
        <div 
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colorVariants[color]} flex items-center justify-center shadow-lg`}
          style={{
            boxShadow: `
              6px 6px 12px rgba(139, 69, 193, 0.15),
              -6px -6px 12px rgba(255, 255, 255, 0.8)
            `
          }}
        >
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </ClayCard>
  );
}