import React from 'react';
import './cipher.css';

export type CipherMood = 'elite' | 'solid' | 'slipping' | 'critical' | 'idle' | 'analyzing';

interface CipherProps {
  mood: CipherMood;
  size?: number;
  className?: string;
}

export const Cipher: React.FC<CipherProps> = ({ mood, size = 48, className = '' }) => {
  return (
    <div className={`cipher-container ${className}`} style={{ width: size, height: size, display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg className={`cipher-robot ${mood}`} viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        {/* Antenna */}
        <line className="cipher-antenna" x1="50" y1="15" x2="50" y2="8" />
        <circle className="cipher-antenna-tip" cx="50" cy="6" r="2" />
        
        {/* Head */}
        <rect className="cipher-body" x="30" y="20" width="40" height="35" rx="4" />
        
        {/* Eyebrows */}
        <path className="cipher-eyebrow eyebrow-left" />
        <path className="cipher-eyebrow eyebrow-right" />
        
        {/* Eyes (size handled by CSS via --eye-size if we wanted to map it, but kept static 4px radius with glow varying intensity) */}
        <circle className="cipher-eye" cx="37" cy="35" r="4" />
        <circle className="cipher-eye" cx="63" cy="35" r="4" />
        
        {/* Body */}
        <rect className="cipher-body" x="35" y="60" width="30" height="25" rx="3" />
        
        {/* Details */}
        <line className="cipher-antenna" x1="35" y1="70" x2="40" y2="70" />
        <line className="cipher-antenna" x1="60" y1="70" x2="65" y2="70" />
      </svg>
    </div>
  );
};
