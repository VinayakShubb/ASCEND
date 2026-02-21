import { useEffect, useState, useMemo } from 'react';
import './cipherAvatar.css';

export type CipherMood = 'elite' | 'solid' | 'slipping' | 'critical' | 'analyzing' | 'idle';
export type AvatarSize = 'sm' | 'md' | 'lg';

export interface CipherAvatarProps {
  mood?: CipherMood;
  size?: AvatarSize;
  className?: string;
}

export const CipherAvatar = ({ mood = 'idle', size = 'md', className = '' }: CipherAvatarProps) => {
  const [blink, setBlink] = useState(false);
  const uniqueId = useMemo(() => Math.random().toString(36).substring(2, 9), []);

  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 64
  };

  const actualSize = sizeMap[size];

  // Random blink logic
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      const waitTime = Math.random() * 3000 + 2000; // 2-5 seconds
      timeoutId = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 150); // Blink duration
        scheduleBlink();
      }, waitTime);
    };

    scheduleBlink();
    return () => clearTimeout(timeoutId);
  }, []);

  const colorMap: Record<CipherMood, string> = {
    elite: '#00ff88',
    solid: '#00cc66',
    slipping: '#ffaa00',
    critical: '#ff4444',
    analyzing: 'var(--accent-primary)',
    idle: 'var(--text-muted)'
  };

  const eyeColor = colorMap[mood];

  // Eyebrow paths — angular, mood-adaptive
  let eyebrowLeftPath = "M 32 33 L 42 33";
  let eyebrowRightPath = "M 58 33 L 68 33";
  
  if (mood === 'elite') {
    // Elite: horizontal eyebrows (happy/relaxed)
    eyebrowLeftPath = "M 32 33 L 42 33";
    eyebrowRightPath = "M 58 33 L 68 33";
  } else if (mood === 'slipping') {
    eyebrowLeftPath = "M 32 31 L 42 34";
    eyebrowRightPath = "M 58 34 L 68 31";
  } else if (mood === 'critical') {
    eyebrowLeftPath = "M 32 31 L 42 34";
    eyebrowRightPath = "M 58 34 L 68 31";
  }

  // Animation classes
  let animationClass = '';
  if (mood === 'critical') animationClass = 'animate-cipher-rage';
  else if (mood === 'slipping') animationClass = 'animate-cipher-twitch';
  else if (mood === 'analyzing') animationClass = 'animate-cipher-pulse';
  else if (mood === 'elite') animationClass = 'animate-cipher-elite';

  return (
    <div 
      className={`inline-block ${animationClass} ${className}`} 
      style={{ width: actualSize, height: actualSize }}
    >
      <svg 
        viewBox="0 0 100 100" 
        width="100%" 
        height="100%" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id={`cipher-glow-${uniqueId}`}>
            <feGaussianBlur stdDeviation={mood === 'idle' ? "0" : "2.5"} result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Antenna */}
        <line x1="50" y1="16" x2="50" y2="6" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round"/>
        <circle 
            cx="50" cy="4" r="3" 
            fill={eyeColor} 
            filter={mood !== 'idle' ? `url(#cipher-glow-${uniqueId})` : undefined}
        />

        {/* Head — boxy rectangle */}
        <rect x="22" y="18" width="56" height="40" rx="5" fill="#0a0a0a" stroke="#2a2a2a" strokeWidth="2.5"/>

        {/* Eyebrows — angular lines */}
        <path 
            className="transition-all duration-300"
            d={eyebrowLeftPath} 
            stroke={eyeColor} strokeWidth="2" strokeLinecap="round" fill="none"
        />
        <path 
            className="transition-all duration-300"
            d={eyebrowRightPath} 
            stroke={eyeColor} strokeWidth="2" strokeLinecap="round" fill="none"
        />

        {/* Eyes — rectangular LED blocks */}
        <g style={{ 
            transformOrigin: '50% 42px', 
            transform: blink ? 'scaleY(0.08)' : 'scaleY(1)',
            transition: 'transform 50ms'
        }}>
            <rect 
                x="33" y="37" width="9" height="7" rx="1"
                fill={eyeColor} 
                filter={mood !== 'idle' ? `url(#cipher-glow-${uniqueId})` : undefined}
            />
            <rect 
                x="58" y="37" width="9" height="7" rx="1"
                fill={eyeColor} 
                filter={mood !== 'idle' ? `url(#cipher-glow-${uniqueId})` : undefined}
            />
        </g>

        {/* Mouth — only elite gets a small happy smile */}
        {mood === 'elite' && (
          <path
            d="M 43 51 Q 50 55 57 51"
            stroke={eyeColor} strokeWidth="1.8" strokeLinecap="round" fill="none"
            filter={`url(#cipher-glow-${uniqueId})`}
          />
        )}

        {/* Body */}
        <rect x="30" y="63" width="40" height="26" rx="4" fill="none" stroke="#2a2a2a" strokeWidth="2"/>
        {/* Body detail lines */}
        <line x1="35" y1="73" x2="41" y2="73" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="59" y1="73" x2="65" y2="73" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="35" y1="79" x2="41" y2="79" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="59" y1="79" x2="65" y2="79" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </div>
  );
};

