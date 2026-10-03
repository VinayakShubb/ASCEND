import { useEffect, useId, useMemo, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import './cipherAvatar.css';

export type CipherMood = 'elite' | 'solid' | 'slipping' | 'critical' | 'analyzing' | 'idle';
export type AvatarSize = 'sm' | 'md' | 'lg';

export interface CipherAvatarProps {
  mood?: CipherMood;
  size?: AvatarSize;
  className?: string;
  /* Cycle through every mood on a timer (for demos/marketing surfaces).
     Overrides `mood`; held on `solid` for reduced-motion visitors. */
  cycle?: boolean;
}

const SIZES: Record<AvatarSize, number> = { sm: 40, md: 56, lg: 100 };
const CYCLE: CipherMood[] = ['idle', 'analyzing', 'solid', 'slipping', 'elite', 'critical'];

/* A glass "analyst core": a floating sphere with expressive LED eyes inside a
   HUD instrument — a rotating tick-bezel, targeting brackets, and a data arc
   that fills to the Discipline Index band. Mood drives colour, eyes and the
   arc length via the data-mood attribute (see cipherAvatar.css). */
export const CipherAvatar = ({ mood = 'idle', size = 'md', className = '', cycle = false }: CipherAvatarProps) => {
  const uid = useId().replace(/:/g, '');
  const px = SIZES[size];
  const reduce = useReducedMotion();
  // One blink offset per orb so several on screen don't blink in lockstep.
  const blinkDelay = useMemo(() => `${(Math.random() * 4).toFixed(2)}s`, []);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!cycle || reduce) return;
    const id = window.setInterval(() => setIdx(n => (n + 1) % CYCLE.length), 2200);
    return () => window.clearInterval(id);
  }, [cycle, reduce]);
  const activeMood = cycle && !reduce ? CYCLE[idx] : mood;

  return (
    <div className={`cipher-orb ${className}`} data-mood={activeMood} style={{ width: px, height: px }}>
      <svg className="orb-svg" viewBox="0 0 160 160" role="img" aria-label={`CIPHER ${activeMood}`}>
        <defs>
          <radialGradient id={`sph-${uid}`} cx="40%" cy="34%" r="72%">
            <stop offset="0%" stopColor="#262c34" />
            <stop offset="44%" stopColor="#13161c" />
            <stop offset="100%" stopColor="#06070a" />
          </radialGradient>
          <radialGradient id={`halo-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--m)" stopOpacity="0.45" />
            <stop offset="58%" stopColor="var(--m)" stopOpacity="0.07" />
            <stop offset="100%" stopColor="var(--m)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`wash-${uid}`} cx="50%" cy="82%" r="60%">
            <stop offset="0%" stopColor="var(--m)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--m)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`base-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--m)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--m)" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`eL-${uid}`}><circle cx="68" cy="78" r="12" /></clipPath>
          <clipPath id={`eR-${uid}`}><circle cx="92" cy="78" r="12" /></clipPath>
        </defs>

        <circle className="halo" cx="80" cy="80" r="60" fill={`url(#halo-${uid})`} />
        <ellipse className="baseglow" cx="80" cy="126" rx="38" ry="7" fill={`url(#base-${uid})`} />

        <g className="brackets">
          <path className="bracket" d="M30 46 L30 30 L46 30" />
          <path className="bracket" d="M114 30 L130 30 L130 46" />
          <path className="bracket" d="M130 114 L130 130 L114 130" />
          <path className="bracket" d="M46 130 L30 130 L30 114" />
        </g>

        <g className="bezel">
          <circle className="bezel-ring" cx="80" cy="80" r="67" />
          <circle className="node" cx="80" cy="13" r="3" />
          <circle className="node" cx="138" cy="113" r="2.4" />
          <circle className="node" cx="22" cy="113" r="2.4" />
        </g>

        <circle className="ditrack" cx="80" cy="80" r="52" />
        <g className="diwrap"><circle className="diarc" cx="80" cy="80" r="52" /></g>

        <circle className="sphere" cx="80" cy="80" r="40" fill={`url(#sph-${uid})`} />
        <circle className="sphere" cx="80" cy="80" r="40" fill={`url(#wash-${uid})`} />
        <circle className="sphere-rim" cx="80" cy="80" r="40" />
        <ellipse className="specular" cx="64" cy="58" rx="16" ry="10" />
        <ellipse className="specular2" cx="60" cy="54" rx="4" ry="2.6" />

        <line className="scan" x1="48" y1="80" x2="112" y2="80" />

        <g className="face">
          <ellipse className="cheek" cx="58" cy="90" rx="5.5" ry="3.4" />
          <ellipse className="cheek" cx="102" cy="90" rx="5.5" ry="3.4" />
          <line className="brow brow-l" x1="59" y1="60" x2="77" y2="60" />
          <line className="brow brow-r" x1="83" y1="60" x2="101" y2="60" />
          <g className="eye eye-l" clipPath={`url(#eL-${uid})`} style={{ animationDelay: blinkDelay }}>
            <circle className="socket" cx="68" cy="78" r="12" />
            <circle className="iris" cx="68" cy="78" r="8.6" />
            <circle className="catch" cx="64.5" cy="74.5" r="2.7" />
            <circle className="catch2" cx="71" cy="81" r="1.3" />
            <rect className="lid top" x="52" y="52" width="32" height="24" rx="9" />
            <rect className="lid bot" x="52" y="80" width="32" height="24" rx="9" />
          </g>
          <g className="eye eye-r" clipPath={`url(#eR-${uid})`} style={{ animationDelay: blinkDelay }}>
            <circle className="socket" cx="92" cy="78" r="12" />
            <circle className="iris" cx="92" cy="78" r="8.6" />
            <circle className="catch" cx="88.5" cy="74.5" r="2.7" />
            <circle className="catch2" cx="95" cy="81" r="1.3" />
            <rect className="lid top" x="76" y="52" width="32" height="24" rx="9" />
            <rect className="lid bot" x="76" y="80" width="32" height="24" rx="9" />
          </g>
          <path className="heye heye-l" d="M60 81 Q68 70 76 81" />
          <path className="heye heye-r" d="M84 81 Q92 70 100 81" />
          <path className="mouth" d="M70 100 Q80 107 90 100" />
        </g>

        <g className="sparkles">
          <path className="spark s1" d="M34 48 l2.2 4.6 l4.6 2.2 l-4.6 2.2 l-2.2 4.6 l-2.2 -4.6 l-4.6 -2.2 l4.6 -2.2 z" />
          <path className="spark s2" d="M124 42 l1.7 3.6 l3.6 1.7 l-3.6 1.7 l-1.7 3.6 l-1.7 -3.6 l-3.6 -1.7 l3.6 -1.7 z" />
          <path className="spark s3" d="M120 112 l1.7 3.6 l3.6 1.7 l-3.6 1.7 l-1.7 3.6 l-1.7 -3.6 l-3.6 -1.7 l3.6 -1.7 z" />
        </g>
      </svg>
    </div>
  );
};
