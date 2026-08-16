import { BookOpen } from 'lucide-react';
import type { View } from '../../types';

interface AppFooterProps {
  setView?: (view: View) => void;
}

export const AppFooter = ({ setView }: AppFooterProps) => (
  <footer className="app-footer">
    <div className="app-footer-line" />
    <div className="app-footer-content">
      <span className="app-footer-brand">ASCEND</span>
      <span className="app-footer-sep">•</span>
      <span>Built by VINAYAK//SHUBV</span>
      <span className="app-footer-sep">•</span>
      <span>© 2026</span>
    </div>
    {setView && (
      <button className="app-footer-link" onClick={() => setView('logic-engine')}>
        <BookOpen size={11} /> Logic Engine
      </button>
    )}
  </footer>
);
