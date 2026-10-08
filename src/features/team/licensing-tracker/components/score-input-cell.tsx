import { useEffect, useState } from 'react';
import type { LicensingTrackerRecord } from '../services/licensing-tracker-service';
import { formatScore } from '../score-format';

export type ScoreField = 'xcel_completion_percent' | 'xcel_final_score';

const SCORE_LABELS: Record<ScoreField, string> = {
  xcel_completion_percent: 'Completion %',
  xcel_final_score: 'Final Score',
};

interface ScoreInputCellProps {
  row: LicensingTrackerRecord;
  field: ScoreField;
  saving: boolean;
  onPatch: (userId: number, field: ScoreField, value: string | null) => void;
}

/** Inline 0-100 numeric editor that saves on blur/Enter and reverts invalid input. */
export function ScoreInputCell({ row, field, saving, onPatch }: ScoreInputCellProps) {
  const persisted = formatScore(row[field]);
  const [draft, setDraft] = useState(persisted);

  useEffect(() => {
    setDraft(persisted);
  }, [persisted]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === persisted) return;
    if (trimmed === '') {
      onPatch(row.user_id, field, null);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      setDraft(persisted);
      return;
    }
    onPatch(row.user_id, field, String(Math.round(parsed * 100) / 100));
  };

  return (
    <div className="flex h-8 items-center justify-center" onClick={(e) => e.stopPropagation()}>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={100}
        step="0.01"
        value={draft}
        disabled={saving}
        placeholder="-"
        aria-label={SCORE_LABELS[field]}
        className={`h-8 w-20 rounded border border-white/15 bg-white/5 px-2 text-center text-xs text-white outline-none focus:border-amber-300/50 ${saving ? 'cursor-wait opacity-75' : ''}`}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setDraft(persisted);
            e.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}
