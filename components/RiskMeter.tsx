
import React, { useEffect, useState } from 'react';

interface RiskMeterProps {
  value: number;
  statusLabel: string;
}

const RiskMeter: React.FC<RiskMeterProps> = ({ value, statusLabel }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 1500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function: easeOutExpo
      const currentVal = progress === 1 ? end : end * (1 - Math.pow(2, -10 * progress));
      
      setDisplayValue(Math.floor(currentVal));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  const getStatusStyle = () => {
    if (value <= 30) return 'bg-emerald-500 text-white border-emerald-600';
    if (value <= 70) return 'bg-amber-400 text-amber-900 border-amber-500';
    return 'bg-red-600 text-white border-red-700';
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[220px]">
      <div className="flex flex-col items-center mb-1 relative z-10">
        <div className={`px-4 py-1 rounded-full border shadow-sm font-black text-[9px] uppercase tracking-[0.1em] mb-4 transition-all duration-700 ${getStatusStyle()}`}>
          {statusLabel}
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-6xl font-black text-[#1a365d] tracking-tighter tabular-nums leading-none">
            {displayValue}
          </span>
          <span className="text-xl font-black text-slate-300">%</span>
        </div>
      </div>

      <div className="relative w-full h-24 flex items-start justify-center overflow-visible">
        <svg viewBox="0 0 200 110" className="w-full">
          <defs>
            <linearGradient id="meterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="30%" stopColor="#10b981" />
              <stop offset="31%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#fbbf24" />
              <stop offset="71%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          
          <path
            d="M30 100 A 70 70 0 0 1 170 100"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="14"
            strokeLinecap="round"
          />
          
          <path
            d="M30 100 A 70 70 0 0 1 170 100"
            fill="none"
            stroke="url(#meterGradient)"
            strokeWidth="14"
            strokeLinecap="round"
          />

          <g style={{ 
            transform: `rotate(${-90 + (displayValue / 100) * 180}deg)`, 
            transformOrigin: '100px 100px',
            transition: 'transform 0.1s linear'
          }}>
            <path d="M100 100 L100 45" stroke="#1a365d" strokeWidth="5" strokeLinecap="round" />
            <circle cx="100" cy="100" r="8" fill="#1a365d" />
            <circle cx="100" cy="100" r="3" fill="white" />
          </g>
        </svg>
      </div>
    </div>
  );
};

export default RiskMeter;
