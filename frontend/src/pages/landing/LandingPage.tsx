import { useCallback, useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { Hero } from './Hero';
import { ScoreStory } from './ScoreStory';
import { TryItSection } from './TryItSection';
import { ScoringSection } from './ScoringSection';
import { CipherSection } from './CipherSection';
import { CloseSection } from './CloseSection';
import { PublicFooter } from './PublicChrome';

gsap.registerPlugin(ScrollTrigger);

/* The public landing page (Persuade): a night track meet. Lenis smooth
   scrolling lives on this page only and drives ScrollTrigger from GSAP's
   ticker so the race and the scroll never disagree. */
export function LandingPage() {
  const reduce = useReducedMotion();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const previous = document.title;
    document.title = 'ASCEND: discipline, scored';
    return () => {
      document.title = previous;
    };
  }, []);

  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ autoRaf: false });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduce]);

  const scrollToRace = useCallback(() => {
    const target = document.getElementById('race');
    if (!target) return;
    if (lenisRef.current) lenisRef.current.scrollTo(target, { duration: 1.4 });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }, [reduce]);

  return (
    <div className="relative overflow-x-clip">
      <div className="stadium-ground" aria-hidden />
      <div className="relative">
        <Hero onSeeScoring={scrollToRace} />
        <main>
          <ScoreStory />
          <TryItSection />
          <ScoringSection />
          <CipherSection />
          <CloseSection />
        </main>
        <PublicFooter />
      </div>
    </div>
  );
}
