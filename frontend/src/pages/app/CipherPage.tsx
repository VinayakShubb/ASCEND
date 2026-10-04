import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowClockwise, Info, Play, Plus } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/Feedback';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { aiApi, type CipherAnalysis } from '../../lib/api';
import { cn } from '../../lib/cn';
import { CipherSkeleton } from './cipher/CipherSkeleton';
import { reportGroup, reportItem, timeAgo } from './cipher/format';
import { CipherFace } from './cipher/parts';
import { RhythmSection } from './cipher/RhythmChart';
import { ScoreSection } from './cipher/ScoreSection';
import { Breakdown, ChangesStrip, Drivers, ExecutionType, MetricsTable, TodayPlan, WeekFocus } from './cipher/Sections';

/* CIPHER. Every number on this page comes from the backend
   (backend/services/cipher_metrics.py); CIPHER's AI only writes the notes.
   Reading order: the score on the results board, what changed, key numbers,
   today's plan, this week's focus, drivers, breakdown, rhythm, execution type. */
export function CipherPage() {
  const { user } = useAuth();
  const { habits, loading: habitsLoading } = useData();
  const reduce = useReducedMotion();

  const [analysis, setAnalysis] = useState<CipherAnalysis | null>(null);
  const [latest, setLatest] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  const hasHabits = habits.some(h => !h.archived);
  const username = user?.username;

  // Show the last stored analysis immediately; running a new one is explicit.
  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    aiApi
      .cipherLatest()
      .then(result => {
        if (cancelled) return;
        setAnalysis(result);
        setLatest('ready');
      })
      .catch(() => {
        if (!cancelled) setLatest('error');
      });
    return () => {
      cancelled = true;
    };
  }, [username, reloadKey]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const retryLatest = () => {
    setLatest('loading');
    setReloadKey(k => k + 1);
  };

  const runAnalysis = useCallback(async () => {
    setRunning(true);
    setError(null);
    const previousAt = analysis?.analyzedAt;
    try {
      const result = await aiApi.cipher();
      if (!result) {
        setError('Add at least one active habit to get an analysis.');
        return;
      }
      setAnalysis(result);
      setLatest('ready');
      // The server returns the previous analysis when nothing changed or the
      // daily limit is used up. Say so, instead of pretending it's new.
      const message =
        result.analyzedAt === previousAt
          ? 'Nothing new to analyse yet. Showing your latest analysis.'
          : !result.narrative
            ? "CIPHER's notes are unavailable right now. Your numbers are up to date."
            : null;
      setFlash(message);
      window.clearTimeout(flashTimer.current);
      if (message) flashTimer.current = window.setTimeout(() => setFlash(null), 5000);
    } catch {
      setError('Could not reach CIPHER. Check your connection and try again.');
    } finally {
      setRunning(false);
    }
  }, [analysis?.analyzedAt]);

  if (!user) return null;

  const loading = latest === 'loading' || habitsLoading;
  // The first days get the welcoming face rather than a verdict face.
  const mood = running ? 'analyzing' : analysis ? (analysis.isNewUser ? 'welcome' : analysis.status) : 'idle';

  let body: ReactNode;
  if (loading) {
    body = <CipherSkeleton />;
  } else if (!hasHabits) {
    body = (
      <FirstRun
        title="Nothing to analyse yet"
        text="Add a habit, check it off for a few days, and CIPHER will start reading your patterns."
        action={
          <Link
            to="/app/habits"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-lane px-5 text-[14px] font-semibold text-night-950 transition-colors hover:bg-white"
          >
            <Plus weight="bold" className="size-4" aria-hidden /> Add habit
          </Link>
        }
      />
    );
  } else if (!analysis && running) {
    body = <CipherSkeleton />;
  } else if (!analysis && latest === 'error') {
    body = (
      <div className="flex flex-col gap-6">
        <InlineError
          message="Could not load your latest analysis. Check your connection and try again."
          action={
            <Button size="sm" variant="secondary" onClick={retryLatest}>
              Try again
            </Button>
          }
        />
        <FirstRun
          title="Your first analysis"
          text="CIPHER reads your last 60 days: your score, what is driving it, your weekly rhythm and the best moves for today."
          action={
            <Button icon={<Play weight="fill" className="size-4" aria-hidden />} onClick={runAnalysis}>
              Run analysis
            </Button>
          }
        />
      </div>
    );
  } else if (!analysis) {
    body = (
      <FirstRun
        title="Your first analysis"
        text="CIPHER reads your last 60 days: your score, what is driving it, your weekly rhythm and the best moves for today."
        action={
          <Button icon={<Play weight="fill" className="size-4" aria-hidden />} onClick={runAnalysis}>
            Run analysis
          </Button>
        }
      />
    );
  } else {
    body = (
      <div aria-busy={running} className={cn('flex flex-col gap-10 transition-opacity duration-300', running && 'opacity-55')}>
        {analysis.isNewUser && (
          <p className="flex items-start gap-2.5 border-y border-lane-line py-3.5 text-[14px] text-lane">
            <Info weight="bold" className="mt-0.5 size-4 shrink-0 text-lane-dim" aria-hidden />
            <span>
              Day <span className="tabular">{analysis.daysTracked}</span>. We're still getting to know each other — I'll start reading
              your patterns properly on day 4.
            </span>
          </p>
        )}

        {/* The board stays mounted across re-runs, so its digits flip to the new score. */}
        <motion.div variants={reportItem} initial={reduce ? false : 'hidden'} animate="show">
          <ScoreSection analysis={analysis} />
        </motion.div>

        {/* Each new analysis posts down the board, section by section. */}
        <motion.div
          key={analysis.analyzedAt}
          variants={reportGroup(0.3)}
          initial={reduce ? false : 'hidden'}
          animate="show"
          className="flex flex-col gap-10"
        >
          {analysis.changes.length > 0 && (
            <motion.div variants={reportItem}>
              <ChangesStrip analysis={analysis} />
            </motion.div>
          )}
          <motion.div variants={reportItem}>
            <MetricsTable analysis={analysis} />
          </motion.div>
          <motion.div variants={reportItem}>
            <TodayPlan analysis={analysis} />
          </motion.div>
          {analysis.focus && (
            <motion.div variants={reportItem}>
              <WeekFocus analysis={analysis} />
            </motion.div>
          )}
          {(analysis.working.length > 0 || analysis.holdingBack.length > 0) && (
            <motion.div variants={reportItem}>
              <Drivers analysis={analysis} />
            </motion.div>
          )}
          <motion.div variants={reportItem}>
            <Breakdown analysis={analysis} />
          </motion.div>
          <motion.div variants={reportItem}>
            <RhythmSection analysis={analysis} />
          </motion.div>
          <motion.div variants={reportItem}>
            <ExecutionType analysis={analysis} />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-5 sm:mb-10">
        <div className="flex min-w-0 items-center gap-4">
          <CipherFace mood={mood} size="lg" />
          <div className="min-w-0">
            <h1 className="font-display text-[44px] uppercase sm:text-[56px]">CIPHER</h1>
            <p className="mt-2 text-[15px] text-lane-dim">
              Performance analysis for <strong className="font-semibold text-lane">{user.username}</strong>
              {analysis && <span className="text-lane-mute"> · updated {timeAgo(analysis.analyzedAt)}</span>}
            </p>
          </div>
        </div>
        {hasHabits && (analysis || running) && (
          <Button
            variant="secondary"
            onClick={runAnalysis}
            disabled={loading}
            loading={running}
            icon={analysis ? <ArrowClockwise weight="bold" className="size-4" aria-hidden /> : <Play weight="fill" className="size-4" aria-hidden />}
          >
            {running ? 'Analysing' : analysis ? 'Re-run analysis' : 'Run analysis'}
          </Button>
        )}
      </header>

      <div aria-live="polite">
        {flash && (
          <p role="status" className="mb-6 border-y border-lane-line-strong py-3 text-[14px] text-lane">
            {flash}
          </p>
        )}
      </div>
      {error && (
        <div className="mb-6">
          <InlineError
            message={error}
            action={
              <Button size="sm" variant="secondary" onClick={runAnalysis} disabled={running}>
                Try again
              </Button>
            }
          />
        </div>
      )}

      {body}
    </div>
  );
}

function FirstRun({ title, text, action }: { title: string; text: string; action: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 border-y border-lane-line py-12">
      <CipherFace mood="idle" size="lg" />
      <h2 className="font-display text-[34px] uppercase sm:text-[40px]">{title}</h2>
      <p className="max-w-[56ch] text-[15px] text-lane-dim">{text}</p>
      <div className="mt-2">{action}</div>
    </div>
  );
}
