import { useEffect, useState, useRef } from 'react';

interface CipherRingProps {
  percentage: number;
  color: string;
  size: number;
  label?: string;
}

export const CipherRing = ({ percentage, color, size, label }: CipherRingProps) => {
  const [offset, setOffset] = useState(0);
  const [displayPct, setDisplayPct] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  const radius = 40;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius; // ~251.2
  const center = 50; // Viewbox is 100x100
  
  // Calculate final offset
  const finalOffset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    // Initial mount offset is full circumference
    if (!hasAnimated) setOffset(circumference);
    
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !hasAnimated) {
        setHasAnimated(true);
        // Start stroke animation
        setTimeout(() => setOffset(finalOffset), 50);

        // Start number count-up animation
        let frame = 0;
        const totalFrames = 40;
        const animateText = () => {
          frame++;
          const easeOut = 1 - Math.pow(1 - frame / totalFrames, 3);
          setDisplayPct(Math.round(percentage * easeOut));
          if (frame < totalFrames) requestAnimationFrame(animateText);
        };
        requestAnimationFrame(animateText);
      }
    }, { threshold: 0.2 });

    observer.observe(node);
    return () => observer.disconnect();
  }, [percentage, circumference, finalOffset, hasAnimated]);

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'relative', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        width: size, 
        height: size,
        opacity: hasAnimated ? 1 : 0,
        transform: hasAnimated ? 'scale(1)' : 'scale(0.8)',
        transition: 'opacity 600ms ease-out, transform 600ms cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}
    >
      <svg 
        viewBox="0 0 100 100" 
        width="100%" 
        height="100%" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background track */}
        <circle 
          cx={center} 
          cy={center} 
          r={radius} 
          fill="none" 
          stroke="var(--bg-tertiary)" 
          strokeWidth={strokeWidth} 
        />
        
        {/* Animated progress ring */}
        <circle 
          cx={center} 
          cy={center} 
          r={radius} 
          fill="none" 
          stroke={color} 
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
        />
      </svg>
      
      {/* Centered Text Elements */}
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontFamily: "'JetBrains Mono', monospace" 
      }}>
        <span 
          style={{ 
            color, 
            fontSize: size * 0.22,
            fontWeight: 700,
            lineHeight: 1
          }}
        >
          {displayPct}%
        </span>
        {label && (
          <span 
            style={{ 
              color: 'var(--text-muted)', 
              letterSpacing: '0.05em', 
              marginTop: 4, 
              fontSize: size * 0.1 
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
};
