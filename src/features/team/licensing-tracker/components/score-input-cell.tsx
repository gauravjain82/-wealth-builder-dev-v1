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
  /** 'progress' shows a bar until clicked, then the same numeric editor. */
  display?: 'input' | 'progress';
}

/** Inline 0-100 numeric editor that saves on blur/Enter and reverts invalid input. */
export function ScoreInputCell({ row, field, saving, onPatch, display = 'input' }: ScoreInputCellProps) {
  const persisted = formatScore(row[field]);
  const [draft, setDraft] = useState(persisted);
  const [editing, setEditing] = useState(false);

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

  if (display === 'progress' && !editing) {
    return (
      <div className="flex h-8 items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          disabled={saving}
          aria-label={`${SCORE_LABELS[field]}: ${persisted === '' ? 'not set' : `${persisted}%`}. Click to edit`}
          title="Click to edit"
          className={`group flex h-8 w-full items-center gap-2 rounded px-2 hover:bg-white/5 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/50 ${saving ? 'cursor-wait opacity-75' : ''}`}
          onClick={() => setEditing(true)}
        >
          <ProgressBar value={persisted === '' ? null : Number(persisted)} />
        </button>
      </div>
    );
  }

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
        autoFocus={display === 'progress'}
        className={`h-8 w-20 rounded border border-white/15 bg-white/5 px-2 text-center text-xs text-white outline-none focus:border-amber-300/50 ${saving ? 'cursor-wait opacity-75' : ''}`}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          commit();
          setEditing(false);
        }}
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

function fillClass(value: number): string {
  if (value >= 100) return 'from-emerald-400 to-teal-300';
  if (value >= 75) return 'from-emerald-500 to-emerald-300';
  if (value >= 40) return 'from-amber-500 to-amber-300';
  return 'from-rose-500 to-rose-400';
}

/** Track plus gradient fill that grows from 0 on mount and eases between values. */
function ProgressBar({ value }: { value: number | null }) {
  const target = value === null ? 0 : Math.min(100, Math.max(0, value));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(target));
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    <>
      <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        {value !== null && (
          <span
            className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r shadow-[0_0_6px_rgba(255,255,255,0.15)] transition-[width] duration-700 ease-out ${fillClass(target)}`}
            style={{ width: `${width}%` }}
          />
        )}
      </span>
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-white/80 group-hover:text-white">
        {value === null ? '-' : `${formatScore(String(value))}%`}
      </span>
    </>
  );
}
