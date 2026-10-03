import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { duration, ease } from '../../design/motion';

/* Scroll-in reveal for the public pages: content rises and fades as it enters,
   once. Reduced-motion visitors get it in place. Keep it subtle — the landing
   should breathe on scroll, not perform. */
export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
  as = 'div',
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'li';
}) {
  const reduce = useReducedMotion();
  const Tag = as === 'li' ? motion.li : motion.div;
  if (reduce) {
    const Plain = as === 'li' ? 'li' : 'div';
    return <Plain className={className}>{children}</Plain>;
  }
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: duration.slow, ease: ease.out, delay }}
    >
      {children}
    </Tag>
  );
}
