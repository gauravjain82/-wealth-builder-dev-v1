import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '@/features/auth';
import { Button, Textarea } from '@/shared/components';
import { useToastStore } from '@/store';
import {
  fetchAssociateTracker,
  updateAssociateTracker,
} from '../services/associate-tracker-service';

function resolveCurrentUserId(authUserId?: string | null): number | null {
  const raw = authUserId || localStorage.getItem('wb.userId') || '';
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function AddGoalsPage() {
  const { user } = useAuth();
  const addToast = useToastStore((state) => state.addToast);
  const userId = useMemo(() => resolveCurrentUserId(user?.id), [user?.id]);

  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      setError('Unable to identify your account. Please sign in again.');
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError('');

    void fetchAssociateTracker(userId)
      .then((tracker) => {
        if (!active) return;
        setGoal(tracker.goal || '');
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load your goals.');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId || saving) return;

    try {
      setSaving(true);
      setError('');
      const updated = await updateAssociateTracker(userId, {
        goal: goal.trim(),
      });
      setGoal(updated.goal || '');
      addToast({ type: 'success', message: 'Your goals have been saved.' });
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save your goals.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#10141d] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-2xl">
        <section className="overflow-hidden rounded-2xl border border-amber-300/25 bg-[#171d29] shadow-2xl shadow-black/30">
          <div className="border-b border-white/10 bg-[#111722] px-6 py-6 sm:px-8">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
              Wealth Builders
            </div>
            <h1 className="mt-2 text-2xl font-semibold">Set Your Goal</h1>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Add the goal you are working toward.
            </p>
          </div>

          <div className="space-y-6 px-6 py-6 sm:px-8">
            {loading ? (
              <div className="py-10 text-center text-sm text-white/65">Loading your goals...</div>
            ) : (
              <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
                {error && (
                  <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-white/85">Your Goal</span>
                  <Textarea
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    placeholder="What goal are you working toward?"
                    rows={5}
                    disabled={saving}
                  />
                </label>

                <Button type="submit" className="w-full sm:w-auto" disabled={saving || !userId}>
                  {saving ? 'Saving...' : 'Save Goals'}
                </Button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
