import React from 'react';

const EMOJIS = ['🌳', '🌿', '🍃', '🍂', '🌲', '🌱', '☘️', '🌾', '🪵', '🎋', '🌴', '🍁'];

const FloatingBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#f8fafc]">
      <style>
        {`
          @keyframes diagonal-drift {
            0% {
              transform: translate(-15vw, -15vh) rotate(0deg);
              opacity: 0;
            }
            15% {
              opacity: 0.12;
            }
            85% {
              opacity: 0.12;
            }
            100% {
              transform: translate(115vw, 115vh) rotate(120deg);
              opacity: 0;
            }
          }
          .floating-emoji {
            position: absolute;
            animation: diagonal-drift linear infinite;
            font-family: "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
            will-change: transform;
            user-select: none;
            color: #1e40af; /* Fallback for transparency control */
          }
        `}
      </style>
      {[...Array(24)].map((_, i) => {
        const emoji = EMOJIS[i % EMOJIS.length];
        const size = 20 + Math.random() * 30;
        const duration = 40 + Math.random() * 40;
        const delay = Math.random() * -100;
        const startX = Math.random() * 140 - 40;
        
        return (
          <div
            key={i}
            className="floating-emoji"
            style={{
              fontSize: `${size}px`,
              left: `${startX}%`,
              top: `-15%`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              filter: 'grayscale(40%) blur(0.4px)',
            }}
          >
            {emoji}
          </div>
        );
      })}
    </div>
  );
};

export default FloatingBackground;