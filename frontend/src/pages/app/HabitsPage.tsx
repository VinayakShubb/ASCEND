import { useMemo, useState } from 'react';
import { Archive, ArrowCounterClockwise, CaretDown, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '../../components/ui/Button';
import { EmptyState, InlineError } from '../../components/ui/Feedback';
import { PageHeader } from '../../components/ui/PageHeader';
import { useData } from '../../context/DataContext';
import { duration, ease } from '../../design/motion';
import { useStreaks } from '../../hooks/useStats';
import { cn } from '../../lib/cn';
import type { Habit } from '../../types';
import { DeleteHabitDialog } from './habits/DeleteHabitDialog';
import { HabitDialog } from './habits/HabitDialog';
import { HabitRow, HabitRowsSkeleton, RowAction } from './habits/HabitRow';

const byCreation = (a: Habit, b: Habit) => a.created_at.localeCompare(b.created_at);

/* Habits: add, edit, archive, restore and delete. Archived habits stop
   counting toward the score but keep their history until deleted. */
export function HabitsPage() {
  const { habits, loading, loadError, reload, updateHabit } = useData();
  const streaks = useStreaks();
  const [dialog, setDialog] = useState<{ open: boolean; habit: Habit | null }>({ open: false, habit: null });
  const [toDelete, setToDelete] = useState<Habit | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(() => habits.filter(h => !h.archived).sort(byCreation), [habits]);
  const archived = useMemo(() => habits.filter(h => h.archived).sort(byCreation), [habits]);

  const openAdd = () => setDialog({ open: true, habit: null });
  const openEdit = (habit: Habit) => setDialog({ open: true, habit });

  const setArchived = async (habit: Habit, value: boolean) => {
    setBusy(habit.id);
    setError(null);
    try {
      await updateHabit(habit.id, { archived: value });
    } catch {
      setError(`Could not ${value ? 'archive' : 'restore'} "${habit.name}". Check your connection and try again.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Habits"
        description="Everything you track each day. A habit's difficulty sets how much it counts toward your daily score."
        actions={
          <Button icon={<Plus weight="bold" className="size-4" />} onClick={openAdd}>
            Add habit
          </Button>
        }
      />

      {error && (
        <div className="mb-6">
          <InlineError
            message={error}
            action={
              <Button variant="secondary" size="sm" onClick={() => setError(null)}>
                Dismiss
              </Button>
            }
          />
        </div>
      )}

      {loading ? (
        <HabitRowsSkeleton />
      ) : loadError ? (
        <InlineError message={loadError} action={<Button variant="secondary" size="sm" onClick={reload}>Try again</Button>} />
      ) : active.length === 0 ? (
        <EmptyState
          title={archived.length > 0 ? 'No active habits' : 'No habits yet'}
          body={
            archived.length > 0
              ? 'Add a new habit, or restore one from the archive below to start tracking it again.'
              : 'Add the habits you want to do every day. Each one gets a difficulty that sets how much it counts.'
          }
          action={
            <Button icon={<Plus weight="bold" className="size-4" />} onClick={openAdd}>
              {archived.length > 0 ? 'Add habit' : 'Add your first habit'}
            </Button>
          }
        />
      ) : (
        <section aria-labelledby="active-heading">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 id="active-heading" className="font-display text-[26px] uppercase">
              Active
            </h2>
            <p className="tabular text-[13px] text-lane-mute">
              {active.length} {active.length === 1 ? 'habit' : 'habits'}, in lane order
            </p>
          </div>
          <ul className="border-t border-lane-line-strong">
            {active.map((habit, i) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                lane={i + 1}
                streak={streaks[habit.id] ?? 0}
                actions={
                  <>
                    <RowAction
                      text="Edit"
                      label={`Edit ${habit.name}`}
                      icon={<PencilSimple className="size-5" />}
                      onClick={() => openEdit(habit)}
                    />
                    <RowAction
                      text="Archive"
                      label={`Archive ${habit.name}`}
                      icon={<Archive className="size-5" />}
                      onClick={() => setArchived(habit, true)}
                      disabled={busy === habit.id}
                    />
                  </>
                }
              />
            ))}
          </ul>
        </section>
      )}

      {!loading && archived.length > 0 && (
        <section className="mt-12">
          <h2>
            <button
              type="button"
              aria-expanded={showArchived}
              aria-controls="archived-list"
              onClick={() => setShowArchived(v => !v)}
              className="group flex min-h-11 w-full items-center justify-between gap-4 border-b border-lane-line-strong text-left"
            >
              <span className="font-display text-[26px] uppercase text-lane-dim transition-colors group-hover:text-lane">
                Archived <span className="tabular text-lane-mute">({archived.length})</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-lane-dim">
                {showArchived ? 'Hide' : 'Show'}
                <CaretDown className={cn('size-4 transition-transform duration-300', showArchived && 'rotate-180')} aria-hidden />
              </span>
            </button>
          </h2>
          <p className="mt-3 text-[13px] text-lane-mute">Archived habits don't count toward your score. Their history is kept until you delete them.</p>
          <AnimatePresence initial={false}>
            {showArchived && (
              <motion.ul
                id="archived-list"
                className="mt-3 border-t border-lane-line"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.out } }}
                exit={{ opacity: 0, transition: { duration: duration.instant } }}
              >
                {archived.map(habit => (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    actions={
                      <>
                        <RowAction
                          text="Restore"
                          label={`Restore ${habit.name}`}
                          icon={<ArrowCounterClockwise className="size-5" />}
                          onClick={() => setArchived(habit, false)}
                          disabled={busy === habit.id}
                        />
                        <RowAction
                          text="Delete"
                          label={`Delete ${habit.name}`}
                          icon={<Trash className="size-5" />}
                          tone="danger"
                          onClick={() => setToDelete(habit)}
                        />
                      </>
                    }
                  />
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </section>
      )}

      <HabitDialog open={dialog.open} habit={dialog.habit} onOpenChange={open => setDialog(d => ({ ...d, open }))} />
      <DeleteHabitDialog habit={toDelete} onClose={() => setToDelete(null)} />
    </div>
  );
}
