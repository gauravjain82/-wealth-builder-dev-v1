import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Flame, Target } from 'lucide-react';
import { useParams } from 'react-router-dom';
import {
  fetchAgencyDailySix,
  submitAgencyDailySix,
  type AgencyDailySixContext,
  type BuilderPace,
  type DailySixPayload,
} from '../services/builders-service';

const EMPTY_FORM: DailySixPayload = {
  session: 'PM',
  friends_made: 0,
  calls_made: 0,
  appointments: 0,
  preplan: false,
  business_plan_am: false,
  business_plan_pm: false,
  pages_read: false,
};

type CountField = 'friends_made' | 'calls_made' | 'appointments';
type ToggleField = 'preplan' | 'pages_read' | 'business_plan_am' | 'business_plan_pm';
type DailySixSuccess = {
  score: number;
  streak: number;
  submission: DailySixPayload;
};

function currentSession(): DailySixPayload['session'] {
  return new Date().getHours() < 12 ? 'AM' : 'PM';
}

export default function PublicDailySixPage() {
  const { agencyCode = '' } = useParams<{ agencyCode: string }>();
  const [context, setContext] = useState<AgencyDailySixContext | null>(null);
  const [form, setForm] = useState<DailySixPayload>({ ...EMPTY_FORM, session: currentSession() });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<DailySixSuccess | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      setLoading(true);
      setError(null);
      try {
        const loaded = await fetchAgencyDailySix(agencyCode);
        if (cancelled) return;
        setContext(loaded);

        const session = currentSession();
        const existing = loaded.today_submissions.find((submission) => submission.session === session);
        if (existing) {
          setForm({
            session,
            friends_made: existing.friends_made,
            calls_made: existing.calls_made,
            appointments: existing.appointments,
            preplan: existing.preplan,
            business_plan_am: existing.business_plan_am,
            business_plan_pm: existing.business_plan_pm,
            pages_read: existing.pages_read,
          });
        } else {
          setForm({ ...EMPTY_FORM, session });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load Daily Six.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadContext();

    return () => {
      cancelled = true;
    };
  }, [agencyCode]);

  const headerText = useMemo(() => {
    if (!context) return '';
    return `${context.user_name} - ${context.pace.name} goals`;
  }, [context]);

  const updateCount = (field: CountField, delta: number) => {
    setForm((prev) => ({ ...prev, [field]: Math.max(0, prev[field] + delta) }));
  };

  const setToggle = (field: ToggleField, value: boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleBusinessPlan = (field: 'business_plan_am' | 'business_plan_pm') => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const calculateScore = () => {
    if (!context) return 0;
    const pct = (actual: number, goal: number) => (goal > 0 ? Math.min(1, actual / goal) : 1);
    const scores = [
      pct(form.friends_made, context.pace.target_friends),
      pct(form.calls_made, context.pace.target_calls),
      pct(form.appointments, context.pace.target_appointments),
      form.preplan ? 1 : 0,
      (Number(form.business_plan_am) + Number(form.business_plan_pm)) / 2,
      form.pages_read ? 1 : 0,
    ];

    return Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 100);
  };

  const handleSubmit = async () => {
    if (!agencyCode) return;
    setSaving(true);
    setError(null);
    try {
      const response = await submitAgencyDailySix(agencyCode, form);
      setContext((prev) => (prev ? { ...prev, streak: response.streak } : prev));
      setSuccess({ score: calculateScore(), streak: response.streak, submission: { ...form } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit Daily Six.');
    } finally {
      setSaving(false);
    }
  };

  const handleAnotherSubmission = () => {
    setSuccess(null);
    setError(null);
    setForm((prev) => ({ ...EMPTY_FORM, session: prev.session }));
  };

  return (
    <main className="min-h-screen bg-[#050607] text-white">
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-[760px] px-5">
          <div className={`inline-flex border-b-2 border-[#e7c95f] text-sm font-bold text-[#f4d766] ${
            success ? 'px-3 py-3' : 'px-5 py-5'
          }`}>
            Submit Daily Six
          </div>
        </div>
      </div>

      <div className={`mx-auto max-w-[760px] ${success ? 'px-2 py-2' : 'px-3 py-6 sm:px-5'}`}>
        <section className={`rounded-2xl border border-white/12 bg-[#0b0c10] shadow-[0_20px_70px_rgba(0,0,0,0.35)] ${
          success ? 'p-2' : 'p-2'
        }`}>
          {loading && <div className="py-20 text-center text-sm text-slate-400">Loading Daily Six...</div>}

          {!loading && error && !context && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-5 text-sm text-red-100">
              {error}
            </div>
          )}

          {!loading && context && success && (
            <SuccessCardV2
              userName={context.user_name}
              pace={context.pace}
              submission={success.submission}
              score={success.score}
              streak={success.streak}
              onAnotherSubmission={handleAnotherSubmission}
            />
          )}

          {!loading && context && !success && (
            <>
              <div className="mb-4 rounded-xl border border-[#f4d766]/20 bg-[#f4d766]/10 p-3">
                {/* <h1 className="text-xl font-bold leading-6 text-white">Daily Six</h1> */}
                <p className="mt-1 truncate text-sm font-medium text-slate-300">{headerText}</p>
              </div>

              <div className="grid gap-2">
                <MetricRow
                  label="Friends"
                  goal={context.pace.target_friends}
                  value={form.friends_made}
                  onDecrement={() => updateCount('friends_made', -1)}
                  onIncrement={() => updateCount('friends_made', 1)}
                />
                <MetricRow
                  label="Calls"
                  goal={context.pace.target_calls}
                  value={form.calls_made}
                  onDecrement={() => updateCount('calls_made', -1)}
                  onIncrement={() => updateCount('calls_made', 1)}
                />
                <MetricRow
                  label="Appts"
                  goal={context.pace.target_appointments}
                  value={form.appointments}
                  onDecrement={() => updateCount('appointments', -1)}
                  onIncrement={() => updateCount('appointments', 1)}
                />
                <ToggleRow
                  label="Preplanned tomorrow"
                  helper="Mapped my day"
                  yesActive={form.preplan}
                  noActive={!form.preplan}
                  onYes={() => setToggle('preplan', true)}
                  onNo={() => setToggle('preplan', false)}
                />
                <BusinessPlanRow
                  am={form.business_plan_am}
                  pm={form.business_plan_pm}
                  onAm={() => toggleBusinessPlan('business_plan_am')}
                  onPm={() => toggleBusinessPlan('business_plan_pm')}
                />
                <ToggleRow
                  label="Read 10 pages"
                  helper="Of a book"
                  yesActive={form.pages_read}
                  noActive={!form.pages_read}
                  onYes={() => setToggle('pages_read', true)}
                  onNo={() => setToggle('pages_read', false)}
                />
              </div>

              {error && (
                <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
                  {error}
                </div>
              )}
              <button
                type="button"
                className="mt-4 h-12 w-full rounded-xl bg-[#e7c95f] text-sm font-bold text-black transition hover:bg-[#f2d874] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={saving}
                onClick={handleSubmit}
              >
                {saving ? 'Submitting...' : 'Submit today'}
              </button>
              <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                Morning: log what you'll do. Night: log what you did. Two submissions a day keeps the streak alive.
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function MetricRow({
  label,
  goal,
  value,
  onDecrement,
  onIncrement,
}: {
  label: string;
  goal: number;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#14151a] px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-5 text-white">{label}</div>
        <div className="text-xs leading-4 text-slate-500">Goal {goal}</div>
      </div>
      <div className="flex items-center gap-1">
        <StepButton label="-" onClick={onDecrement} />
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#101116] text-base font-bold">
          {value}
        </div>
        <StepButton label="+" onClick={onIncrement} />
      </div>
    </div>
  );
}

export function SuccessCard({
  score,
  streak,
  onAnotherSubmission,
}: {
  score: number;
  streak: number;
  onAnotherSubmission: () => void;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center px-4 py-8 text-center">
      <div className="text-xs font-black uppercase tracking-widest text-slate-400">
        Logged. You showed up today.
      </div>
      <div className="my-5 flex items-center justify-center gap-6">
        <span className="text-5xl">🔥</span>
        <span className="text-5xl font-black text-[#ffad32]">{streak}</span>
      </div>
      <p className="max-w-md text-sm leading-6 text-slate-300">
        Today's score:{' '}
        <span className="font-black text-[#f4d766]">{score}%</span>. You're on a{' '}
        <span className="font-black text-[#ffad32]">{streak}-day streak</span>. Miss a day
        and it goes back to zero. Don't break the chain.
      </p>
      <button
        type="button"
        className="mt-6 h-10 rounded-xl border border-white/10 bg-[#14151a] px-5 text-sm font-medium text-slate-300 hover:bg-white/5"
        onClick={onAnotherSubmission}
      >
        Log another submission
      </button>
    </div>
  );
}

function SuccessCardV2({
  userName,
  pace,
  submission,
  score,
  streak,
  onAnotherSubmission,
}: {
  userName: string;
  pace: BuilderPace;
  submission: DailySixPayload;
  score: number;
  streak: number;
  onAnotherSubmission: () => void;
}) {
  return (
    <div className="px-0 py-1">
      <div className="mb-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-400 text-black shadow-[0_0_20px_rgba(52,211,153,0.18)]">
            <CheckCircle2 size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold leading-4 text-emerald-200">Submitted</div>
            <h2 className="truncate text-base font-bold leading-5 text-white">{userName}</h2>
          </div>
        </div>
      </div>

      <div className="grid gap-1.5">
        <ResultSection
          eyebrow="Goal"
          title={pace.name}
          icon={<Target size={18} />}
          accent="gold"
        >
          <div className="grid grid-cols-3 gap-1.5">
            <ResultMetric label="Friends" value={pace.target_friends} />
            <ResultMetric label="Calls" value={pace.target_calls} />
            <ResultMetric label="Appts" value={pace.target_appointments} />
          </div>
        </ResultSection>

        <ResultSection
          eyebrow="Submission"
          title={submission.session}
          icon={<CheckCircle2 size={18} />}
          accent="blue"
        >
          <div className="grid grid-cols-3 gap-1.5">
            <ResultMetric label="Friends" value={submission.friends_made} />
            <ResultMetric label="Calls" value={submission.calls_made} />
            <ResultMetric label="Appts" value={submission.appointments} />
          </div>
          <div className="mt-1 grid grid-cols-3 gap-1">
            <StatusPill label="Preplan" active={submission.preplan} />
            <StatusPill label="Plan" active={submission.business_plan_am || submission.business_plan_pm} />
            <StatusPill label="Pages" active={submission.pages_read} />
          </div>
        </ResultSection>

        <ResultSection
          eyebrow="Streak"
          title={`${streak} day${streak === 1 ? '' : 's'}`}
          icon={<Flame size={18} />}
          accent="orange"
        >
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-center">
              <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">Score</div>
              <div className="text-2xl font-black leading-7 text-[#f4d766]">{score}%</div>
            </div>
            <div className="rounded-lg border border-[#ffad32]/25 bg-[#ffad32]/10 p-2 text-center">
              <div className="text-[10px] font-black uppercase tracking-wide text-[#ffd08a]">Streak</div>
              <div className="text-2xl font-black leading-7 text-[#ffad32]"><span className="text-xl">🔥</span><span>{streak} </span></div>
            </div>
            <div className="col-span-2 rounded-lg border border-[#ffad32]/15 bg-[#ffad32]/5 px-2 py-1.5 text-center text-[11px] font-medium leading-4 text-[#ffd08a]">
              Miss a day and it goes back to zero. Don't break the chain.
            </div>
          </div>
        </ResultSection>
      </div>

      <button
        type="button"
        className="mt-2 h-9 w-full rounded-xl border border-white/10 bg-[#14151a] px-4 text-xs font-semibold text-slate-200 transition hover:bg-white/5 sm:w-auto"
        onClick={onAnotherSubmission}
      >
        Log another submission
      </button>
    </div>
  );
}

function ResultSection({
  eyebrow,
  title,
  icon,
  accent,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  accent: 'gold' | 'blue' | 'orange';
  children: ReactNode;
}) {
  const accentClass = {
    gold: 'border-[#f4d766]/25 bg-[#f4d766]/10 text-[#f4d766]',
    blue: 'border-sky-300/25 bg-sky-400/10 text-sky-200',
    orange: 'border-[#ffad32]/25 bg-[#ffad32]/10 text-[#ffad32]',
  }[accent];

  return (
    <section className="rounded-xl border border-white/10 bg-[#101116] p-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold leading-4 text-slate-400">{eyebrow}</div>
          <h3 className="truncate text-sm font-bold leading-5 text-white">{title}</h3>
        </div>
        <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border ${accentClass}`}>
          {icon}
        </div>
      </div>
      {children}
    </section>
  );
}

function ResultMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-1.5 py-1 text-center">
      <div className="text-base font-bold leading-5 text-white">{value}</div>
      <div className="truncate text-[10px] font-medium leading-4 text-slate-400">{label}</div>
    </div>
  );
}

function StatusPill({ label, active }: { label: string; active: boolean }) {
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

function StepButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#101116] text-lg font-bold text-[#f4d766] hover:bg-white/5"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ToggleRow({
  label,
  helper,
  yesActive,
  noActive,
  onYes,
  onNo,
}: {
  label: string;
  helper: string;
  yesActive: boolean;
  noActive: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#14151a] px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-5 text-white">{label}</div>
        <div className="text-xs leading-4 text-slate-500">{helper}</div>
      </div>
      <div className="flex flex-shrink-0 gap-1.5">
        <ToggleButton label="Yes" active={yesActive} onClick={onYes} />
        <ToggleButton label="No" active={noActive} onClick={onNo} />
      </div>
    </div>
  );
}

function BusinessPlanRow({
  am,
  pm,
  onAm,
  onPm,
}: {
  am: boolean;
  pm: boolean;
  onAm: () => void;
  onPm: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#14151a] px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-5 text-white">Business plan</div>
        <div className="text-xs leading-4 text-slate-500">Morning and night</div>
      </div>
      <div className="flex flex-shrink-0 gap-1.5">
        <ToggleButton label="AM" active={am} onClick={onAm} />
        <ToggleButton label="PM" active={pm} onClick={onPm} />
      </div>
    </div>
  );
}

function ToggleButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`h-8 rounded-lg border px-3 text-xs font-semibold transition ${
        active
          ? 'border-[#e7c95f] bg-[#e7c95f]/15 text-[#f4d766]'
          : 'border-white/10 bg-[#101116] text-slate-300 hover:bg-white/5'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
