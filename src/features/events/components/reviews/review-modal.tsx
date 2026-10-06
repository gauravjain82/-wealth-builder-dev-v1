import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button, Label, Modal, Textarea } from '@shared/components';
import { StarRatingInput } from './star-rating';
import type { MyReview, ReviewInput } from '../../types/attendee';

interface ReviewModalProps {
  open: boolean;
  /** What is being reviewed, e.g. "Session 1" or the event name. */
  targetName: string;
  /** Your existing review, to edit. */
  existing: MyReview | null;
  onClose: () => void;
  onSubmit: (input: ReviewInput) => Promise<void>;
}

const MAX_COMMENT = 2000;

/** Rate (1–5) and optionally comment on the event or one session. */
export function ReviewModal({ open, targetName, existing, onClose, onSubmit }: ReviewModalProps) {
  const id = useId();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRating(existing?.rating ?? 0);
    setComment(existing?.comment ?? '');
    setError(null);
  }, [open, existing]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!rating) {
      setError('Pick a star rating first.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ rating, comment: comment.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your review.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Edit your review' : 'Leave a review'}
      subtitle={targetName}
      className="max-w-lg"
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-5" noValidate>
        <div className="pt-1">
          <StarRatingInput value={rating} onChange={setRating} label={`Rate ${targetName}`} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-comment`}>
            What stood out? <span className="font-normal text-slate-500">(optional)</span>
          </Label>
          <Textarea
            id={`${id}-comment`}
            rows={4}
            maxLength={MAX_COMMENT}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What you took away, what could be better…"
            aria-describedby={`${id}-count`}
          />
          <p id={`${id}-count`} className="text-right text-xs text-slate-500 dark:text-white/50">
            {comment.length}/{MAX_COMMENT}
          </p>
        </div>
        <p className="text-xs text-slate-500 dark:text-white/50">
          The organisers see your name with your review.
        </p>
        {error ? (
          <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Submit review'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
