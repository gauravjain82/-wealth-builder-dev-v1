import { useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDailySixDay } from '../daily-six-dates';
import type { DailySixHistoryMonth, DailySixSubmission } from '../services/builders-service';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const SESSIONS = ['AM', 'PM'] as const;

interface DailySixCalendarProps {
  /** `YYYY-MM` being shown. */
  month: string;
  /** `YYYY-MM` of the backend's today; the grid does not go past it. */
  currentMonth: string;
  data: DailySixHistoryMonth | null;
  loading: boolean;
  error: string | null;
  onMonthChange: (month: string) => void;
}

// Dates stay `YYYY-MM-DD` strings and are only ever built in UTC, so the grid
// cannot slip a day in a timezone behind the server.
function shiftMonth(month: string, delta: number): string {
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthIndex - 1 + delta, 1)).toISOString().slice(0, 7);
}

function formatMonth(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Read-only month view of a person's Daily Six. Tapping a day shows what was
 * submitted; nothing is edited here.
 */
export function DailySixCalendar({ month, currentMonth, data, loading, error, onMonthChange }: DailySixCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, DailySixSubmission[]>();
    // The previous month's response stays in `data` while the next one loads.
    if (data?.month !== month) return map;
    data.submissions.forEach((submission) => {
      map.set(submission.submission_date, [...(map.get(submission.submission_date) ?? []), submission]);
    });
    return map;
  }, [data, month]);

  const cells = useMemo(() => {
    const [year, monthIndex] = month.split('-').map(Number);
    const leading = new Date(Date.UTC(year, monthIndex - 1, 1)).getUTCDay();
    const dayCount = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
    return [
      ...Array.from({ length: leading }, () => null),
      ...Array.from({ length: dayCount }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`),
    ];
  }, [month]);

  const today = data?.today ?? null;
  const selected = selectedDate?.startsWith(month) ? selectedDate : null;
  const selectedSubmissions = selected ? byDate.get(selected) ?? [] : [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <NavButton label="Previous month" onClick={() => onMonthChange(shiftMonth(month, -1))}>
          <ChevronLeft size={20} />
        </NavButton>
        <div className="text-sm font-bold text-white">{formatMonth(month)}</div>
        <NavButton
          label="Next month"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          disabled={month >= currentMonth}
        >
          <ChevronRight size={20} />
        </NavButton>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((weekday, index) => (
          <div key={index} className="pb-1 text-[10px] font-bold uppercase text-slate-500">
            {weekday}
          </div>
        ))}
        {cells.map((isoDate, index) => {
          if (!isoDate) return <div key={`blank-${index}`} />;
          const submissions = byDate.get(isoDate) ?? [];
          const isSelected = isoDate === selected;

          return (
            <button
              key={isoDate}
              type="button"
              disabled={Boolean(today && isoDate > today)}
              aria-pressed={isSelected}
              className={`flex h-12 flex-col items-center justify-center gap-1 rounded-lg border text-sm font-semibold transition ${
                isSelected
                  ? 'border-[#e7c95f] bg-[#e7c95f]/15 text-[#f4d766]'
                  : submissions.length
                    ? 'border-emerald-400/25 bg-emerald-400/10 text-white'
                    : 'border-white/10 bg-[#14151a] text-slate-400'
              } ${isoDate === today && !isSelected ? 'ring-1 ring-[#e7c95f]/60' : ''} disabled:opacity-30`}
              onClick={() => setSelectedDate(isSelected ? null : isoDate)}
            >
              <span className="leading-4">{Number(isoDate.slice(8))}</span>
              <span className="flex h-1.5 gap-1">
                {SESSIONS.map((session) => (
                  <span
                    key={session}
                    className={`h-1.5 w-1.5 rounded-full ${
                      submissions.some((submission) => submission.session === session)
                        ? 'bg-emerald-400'
                        : 'bg-white/10'
                    }`}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        AM · PM submitted. Tap a day to see it.
      </div>

      {loading && <div className="py-4 text-center text-sm text-slate-400">Loading...</div>}

      {!loading && error && (
        <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div>
      )}

      {!loading && !error && selected && (
        <div className="mt-3 rounded-xl border border-white/10 bg-[#101116] p-3">
          <h3 className="mb-2 text-sm font-bold text-white">{formatDailySixDay(selected)}</h3>
          {selectedSubmissions.length === 0 && (
            <p className="text-sm text-slate-500">Nothing submitted on this day.</p>
          )}
          <div className="grid gap-2">
            {selectedSubmissions.map((submission) => (
              <div key={submission.id} className="rounded-lg border border-white/10 bg-black/20 p-2">
                <div className="mb-1.5 text-xs font-bold text-sky-200">{submission.session}</div>
                <div className="grid grid-cols-3 gap-1.5">
                  <DayMetric label="Friends" value={submission.friends_made} />
                  <DayMetric label="Calls" value={submission.calls_made} />
                  <DayMetric label="Appts" value={submission.appointments} />
                </div>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  <DayPill label="Preplan" active={submission.preplan} />
                  <DayPill label="Plan" active={submission.business_plan_am || submission.business_plan_pm} />
                  <DayPill label="Pages" active={submission.pages_read} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-[#101116] text-[#f4d766] hover:bg-white/5 disabled:opacity-30"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function DayMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-1.5 py-1 text-center">
      <div className="text-base font-bold leading-5 text-white">{value}</div>
      <div className="truncate text-[10px] font-medium leading-4 text-slate-400">{label}</div>
    </div>
  );
}

function DayPill({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={`rounded-md border px-1 py-0.5 text-center text-[10px] font-medium leading-4 ${
        active
          ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
          : 'border-white/10 bg-black/20 text-slate-500'
      }`}
    >
      {label}: {active ? 'Yes' : 'No'}
    </div>
  );
}
