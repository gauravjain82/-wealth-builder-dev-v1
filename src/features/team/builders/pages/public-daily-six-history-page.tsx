import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Pencil } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { DailySixCalendar } from '../components/daily-six-calendar';
import { DailySixFields } from '../components/daily-six-fields';
import { formatDailySixDay } from '../daily-six-dates';
import { useDailySixHistory } from '../hooks/use-daily-six-history';
import {
  fetchAgencyDailySix,
  submitAgencyDailySix,
  type AgencyDailySixContext,
  type DailySixPayload,
  type DailySixSubmission,
} from '../services/builders-service';

const SESSIONS = ['AM', 'PM'] as const;

function formFromSubmission(submission: DailySixSubmission): DailySixPayload {
  return {
    session: submission.session,
    friends_made: submission.friends_made,
    calls_made: submission.calls_made,
    appointments: submission.appointments,
    preplan: submission.preplan,
    business_plan_am: submission.business_plan_am,
    business_plan_pm: submission.business_plan_pm,
    pages_read: submission.pages_read,
  };
}

/** `today` back to `editableFrom`, newest first. Both are the backend's dates. */
function editableDates(today: string, editableFrom: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${today}T00:00:00Z`);
  // Bounded so a misconfigured window cannot render an endless list.
  while (dates.length < 31) {
    const isoDate = cursor.toISOString().slice(0, 10);
    if (isoDate < editableFrom) break;
    dates.push(isoDate);
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return dates;
}

function count(value: number, noun: string): string {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

function dayLabel(index: number, isoDate: string): string {
  const day = formatDailySixDay(isoDate);
  if (index === 0) return `Today · ${day}`;
  if (index === 1) return `Yesterday · ${day}`;
  return day;
}

/**
 * Public history for one agency code: the counts, the days still open for
 * correction, and a read-only calendar. Built for a phone first — one column,
 * full-width targets, and the edit form takes over the page rather than opening
 * over it.
 */
export default function PublicDailySixHistoryPage() {
  const { agencyCode = '' } = useParams<{ agencyCode: string }>();
  const [context, setContext] = useState<AgencyDailySixContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<DailySixSubmission | null>(null);
  const [form, setForm] = useState<DailySixPayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContextLoading(true);
    setContextError(null);

    fetchAgencyDailySix(agencyCode)
      .then((loaded) => {
        if (!cancelled) setContext(loaded);
      })
      .catch((err) => {
        if (!cancelled) setContextError(err instanceof Error ? err.message : 'Unable to load Daily Six.');
      })
      .finally(() => {
        if (!cancelled) setContextLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [agencyCode]);

  const currentMonth = (context?.today ?? new Date().toISOString()).slice(0, 7);
  const shownMonth = month ?? currentMonth;
  const history = useDailySixHistory(agencyCode, shownMonth, reloadKey);

  const recentDays = useMemo(() => {
    if (!history.data) return [];
    const { today, editable_from: editableFrom, editable_submissions: editable } = history.data;
    return editableDates(today, editableFrom).map((isoDate) => ({
      isoDate,
      submissions: editable.filter((submission) => submission.submission_date === isoDate),
    }));
  }, [history.data]);

  const submitUrl = `/team/builders/daily-six/${encodeURIComponent(agencyCode)}`;
  const stats = context?.stats;

  const handleEdit = (submission: DailySixSubmission) => {
    setEditing(submission);
    setForm(formFromSubmission(submission));
    setSaveError(null);
    setSavedNotice(null);
    window.scrollTo({ top: 0 });
  };

  const handleCancel = () => {
    setEditing(null);
    setForm(null);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!editing || !form) return;
    setSaving(true);
    setSaveError(null);
    try {
      const response = await submitAgencyDailySix(agencyCode, { ...form, submission_date: editing.submission_date });
      setContext((prev) =>
        prev ? { ...prev, streak: response.streak, stats: response.stats ?? prev.stats } : prev
      );
      setSavedNotice(`Saved ${formatDailySixDay(editing.submission_date)} · ${editing.session}.`);
      setEditing(null);
      setForm(null);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050607] text-white">
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-[760px] items-center gap-1 px-2">
          <Link
            to={submitUrl}
            aria-label="Back to Submit Daily Six"
            className="flex h-12 w-11 flex-shrink-0 items-center justify-center text-[#f4d766]"
          >
            <ChevronLeft size={22} />
          </Link>
          <div className="min-w-0">
            <div className="text-sm font-bold text-[#f4d766]">Daily Six History</div>
            {context && <div className="truncate text-xs text-slate-400">{context.user_name}</div>}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[760px] px-3 py-3 sm:px-5">
        {contextLoading && <div className="py-20 text-center text-sm text-slate-400">Loading history...</div>}

        {!contextLoading && contextError && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{contextError}</div>
        )}

        {!contextLoading && context && editing && form && (
          <section className="rounded-2xl border border-white/12 bg-[#0b0c10] p-2">
            <div className="mb-3 rounded-xl border border-sky-300/25 bg-sky-400/10 p-3">
              <div className="text-[11px] font-semibold text-sky-200">Editing</div>
              <div className="text-base font-bold text-white">
                {formatDailySixDay(editing.submission_date)} · {editing.session}
              </div>
            </div>

            <DailySixFields pace={context.pace} form={form} onChange={setForm} />

            {saveError && (
              <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
                {saveError}
              </div>
            )}
            <button
              type="button"
              className="mt-4 h-12 w-full rounded-xl bg-[#e7c95f] text-sm font-bold text-black transition hover:bg-[#f2d874] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <button
              type="button"
              className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#14151a] text-sm font-semibold text-slate-200 hover:bg-white/5"
              disabled={saving}
              onClick={handleCancel}
            >
              Cancel
            </button>
          </section>
        )}

        {!contextLoading && context && !editing && (
          <div className="grid gap-3">
            {stats && stats.total_days > 0 && (
              <section className="rounded-2xl border border-[#ffad32]/20 bg-[#ffad32]/5 p-2">
                <div className="grid grid-cols-3 gap-1.5">
                  <ProgressTile label="Day streak" value={`🔥 ${context.streak}`} tone="text-[#ffad32]" />
                  <ProgressTile label="This month" value={stats.days_this_month} tone="text-[#f4d766]" />
                  <ProgressTile label="Days logged" value={stats.total_days} tone="text-emerald-300" />
                </div>
                <p className="mt-1.5 text-center text-xs font-medium leading-5 text-[#ffd08a]">
                  You've shown up {stats.total_days} day{stats.total_days === 1 ? '' : 's'}.{' '}
                  {context.streak > 0 ? 'Keep the chain going.' : 'Log today to start a new streak.'}
                </p>
              </section>
            )}

            {savedNotice && (
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-200">
                {savedNotice}
              </div>
            )}

            {recentDays.length > 0 && history.data && (
              <section className="rounded-2xl border border-white/12 bg-[#0b0c10] p-2">
                <div className="mb-2 px-1">
                  <h2 className="text-sm font-bold text-white">Recent days</h2>
                  <p className="text-xs text-slate-500">
                    {history.data.edit_window_days > 0
                      ? `You can fix what you submitted for ${history.data.edit_window_days} day${
                          history.data.edit_window_days === 1 ? '' : 's'
                        }. After that it locks.`
                      : 'Only today can be changed.'}
                  </p>
                </div>
                <div className="grid gap-2">
                  {recentDays.map(({ isoDate, submissions }, index) => (
                    <div key={isoDate} className="rounded-xl border border-white/10 bg-[#101116] p-2">
                      <div className="mb-1.5 px-1 text-xs font-bold text-slate-300">{dayLabel(index, isoDate)}</div>
                      <div className="grid gap-1.5">
                        {SESSIONS.map((session) => {
                          const submission = submissions.find((row) => row.session === session);
                          return (
                            <RecentSessionRow
                              key={session}
                              session={session}
                              submission={submission}
                              onEdit={handleEdit}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-white/12 bg-[#0b0c10] p-2">
              <DailySixCalendar
                month={shownMonth}
                currentMonth={currentMonth}
                data={history.data}
                loading={history.loading}
                error={history.error}
                onMonthChange={setMonth}
              />
            </section>

            <Link
              to={submitUrl}
              className="flex h-12 items-center justify-center rounded-xl border border-white/10 bg-[#14151a] text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              Back to Submit Daily Six
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function RecentSessionRow({
  session,
  submission,
  onEdit,
}: {
  session: DailySixPayload['session'];
  submission: DailySixSubmission | undefined;
  onEdit: (submission: DailySixSubmission) => void;
}) {
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`w-7 flex-shrink-0 text-xs font-bold ${submission ? 'text-sky-200' : 'text-slate-600'}`}>
          {session}
        </span>
        {submission ? (
          <span className="truncate text-sm text-slate-200">
            {count(submission.friends_made, 'friend')} · {count(submission.calls_made, 'call')} ·{' '}
            {count(submission.appointments, 'appt')}
          </span>
        ) : (
          <span className="text-sm text-slate-600">Not submitted</span>
        )}
      </div>
      {submission && (
        <button
          type="button"
          className="flex h-10 flex-shrink-0 items-center gap-1.5 rounded-lg border border-[#e7c95f]/40 bg-[#e7c95f]/10 px-3 text-sm font-semibold text-[#f4d766] hover:bg-[#e7c95f]/20"
          onClick={() => onEdit(submission)}
        >
          <Pencil size={14} />
          Edit
        </button>
      )}
    </div>
  );
}

function ProgressTile({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-1.5 py-2 text-center">
      <div className={`text-xl font-black leading-6 ${tone}`}>{value}</div>
      <div className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}
