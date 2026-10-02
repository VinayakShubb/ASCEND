import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { InlineError } from '../../../components/ui/Feedback';
import { useData } from '../../../context/DataContext';
import type { Habit } from '../../../types';

/* Permanent delete, behind a confirmation that says exactly what goes. */
export function DeleteHabitDialog({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(habit)} onOpenChange={open => !open && onClose()} title="Delete habit?">
      {habit && <DeleteBody key={habit.id} habit={habit} onClose={onClose} />}
    </Dialog>
  );
}

function DeleteBody({ habit, onClose }: { habit: Habit; onClose: () => void }) {
  const { deleteHabit } = useData();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteHabit(habit.id);
      onClose();
    } catch (err) {
      const detail = err instanceof Error ? ` ${err.message}` : '';
      setError(`The habit was not deleted.${detail} Try again.`);
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[15px] leading-relaxed text-lane-dim">
        This removes <span className="font-semibold text-lane">{habit.name}</span> and all of its history: every day it was
        checked off and its streak. This cannot be undone.
      </p>
      {error && <InlineError message={error} />}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose} disabled={deleting}>
          Keep habit
        </Button>
        <Button variant="danger" onClick={handleDelete} loading={deleting}>
          Delete habit
        </Button>
      </div>
    </div>
  );
}
