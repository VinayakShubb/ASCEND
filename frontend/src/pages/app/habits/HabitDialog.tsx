import { useState, type FormEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { InlineError } from '../../../components/ui/Feedback';
import { Field } from '../../../components/ui/Field';
import { Segmented } from '../../../components/ui/Segmented';
import { useData } from '../../../context/DataContext';
import { DIFFICULTY_OPTIONS } from '../../../design/habits';
import { cn } from '../../../lib/cn';
import type { Difficulty, Habit } from '../../../types';

const NAME_MAX = 60;
const CATEGORY_MAX = 40;
const QUICK_CATEGORIES = ['Health', 'Mind', 'Career', 'Fitness', 'Learning'];

interface HabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /* Edit this habit; leave out to add a new one. */
  habit?: Habit | null;
}

/* Add or edit a habit. Every habit is daily: weekly habits aren't scored yet,
   so there is no frequency choice. */
export function HabitDialog({ open, onOpenChange, habit }: HabitDialogProps) {
  const editing = Boolean(habit);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Edit habit' : 'Add habit'}
      description={
        editing
          ? 'Harder habits count for more of your daily score.'
          : 'Something you want to do every day. Harder habits count for more of your daily score.'
      }
    >
      {/* Mounted only while open, so each opening starts from fresh values. */}
      {open && <HabitForm habit={habit ?? null} onDone={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function HabitForm({ habit, onDone }: { habit: Habit | null; onDone: () => void }) {
  const { addHabit, updateHabit } = useData();
  const [name, setName] = useState(habit?.name ?? '');
  const [category, setCategory] = useState(habit && habit.category !== 'General' ? habit.category : '');
  const [difficulty, setDifficulty] = useState<Difficulty>(habit?.difficulty ?? 'medium');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const nameError = !trimmedName
    ? 'Give the habit a name.'
    : trimmedName.length > NAME_MAX
      ? `Keep the name to ${NAME_MAX} characters or fewer.`
      : null;
  const categoryError = category.trim().length > CATEGORY_MAX ? `Keep the category to ${CATEGORY_MAX} characters or fewer.` : null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (nameError || categoryError) return;
    setSaving(true);
    setSaveError(null);
    const data = { name: trimmedName, category: category.trim() || 'General', difficulty };
    try {
      if (habit) await updateHabit(habit.id, data);
      else await addHabit({ ...data, frequency: 'daily' });
      onDone();
    } catch (err) {
      const detail = err instanceof Error ? ` ${err.message}` : '';
      setSaveError(`The habit was not saved.${detail} Check your connection and try again.`);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <Field
        label="Name"
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder="e.g. Read 20 pages"
        maxLength={NAME_MAX}
        autoFocus
        autoComplete="off"
        error={touched ? nameError : null}
        hint={`${trimmedName.length} of ${NAME_MAX} characters`}
      />

      <div className="flex flex-col gap-3">
        <Field
          label="Category"
          value={category}
          onChange={e => setCategory(e.target.value)}
          placeholder="Optional"
          maxLength={CATEGORY_MAX}
          autoComplete="off"
          error={categoryError}
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Quick categories">
          {QUICK_CATEGORIES.map(option => {
            const selected = category.trim().toLowerCase() === option.toLowerCase();
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => setCategory(selected ? '' : option)}
                className={cn(
                  'min-h-9 rounded-full border px-3.5 text-[13px] font-medium transition-colors duration-200',
                  selected
                    ? 'border-lane bg-lane text-night-950'
                    : 'border-lane-line-strong text-lane-dim hover:border-lane-dim hover:text-lane',
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <Segmented label="Difficulty" value={difficulty} options={DIFFICULTY_OPTIONS} onChange={setDifficulty} />

      {saveError && <InlineError message={saveError} />}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onDone} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {habit ? 'Save changes' : 'Add habit'}
        </Button>
      </div>
    </form>
  );
}
