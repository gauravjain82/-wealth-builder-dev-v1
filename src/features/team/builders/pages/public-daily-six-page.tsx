import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchAgencyDailySix,
  submitAgencyDailySix,
  type AgencyDailySixContext,
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
  const [success, setSuccess] = useState<{ score: number; streak: number } | null>(null);

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
      setSuccess({ score: calculateScore(), streak: response.streak });
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
          <div className="inline-flex border-b-2 border-[#e7c95f] px-5 py-5 text-sm font-extrabold text-[#f4d766]">
            Submit Daily Six
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[760px] px-5 py-6">
        <section className="rounded-2xl border border-white/12 bg-[#0b0c10] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)] sm:p-8">
          {loading && <div className="py-20 text-center text-sm text-slate-400">Loading Daily Six...</div>}

          {!loading && error && !context && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-5 text-sm text-red-100">
              {error}
            </div>
          )}

          {!loading && context && success && (
            <SuccessCard
              score={success.score}
              streak={success.streak}
              onAnotherSubmission={handleAnotherSubmission}
            />
          )}

          {!loading && context && !success && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-black text-white">Daily Six</h1>
                <p className="mt-1 text-sm text-slate-400">{headerText}</p>
              </div>

              <div className="grid gap-3">
                <MetricRow
                  label="Friends made"
                  goal={context.pace.target_friends}
                  value={form.friends_made}
                  onDecrement={() => updateCount('friends_made', -1)}
                  onIncrement={() => updateCount('friends_made', 1)}
                />
                <MetricRow
                  label="Calls made"
                  goal={context.pace.target_calls}
                  value={form.calls_made}
                  onDecrement={() => updateCount('calls_made', -1)}
                  onIncrement={() => updateCount('calls_made', 1)}
                />
                <MetricRow
                  label="Appointments"
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
                <div className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
                  {error}
                </div>
              )}
              <button
                type="button"
                className="mt-6 h-14 w-full rounded-xl bg-[#e7c95f] text-base font-black text-black transition hover:bg-[#f2d874] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={saving}
                onClick={handleSubmit}
              >
                {saving ? 'Submitting...' : 'Submit today'}
              </button>
              <p className="mt-5 text-center text-xs leading-5 text-slate-500">
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#14151a] px-4 py-4">
      <div>
        <div className="font-bold text-white">{label}</div>
        <div className="mt-1 text-xs text-slate-500">Goal: {goal} today</div>
      </div>
      <div className="flex items-center gap-1">
        <StepButton label="-" onClick={onDecrement} />
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[#101116] text-lg font-black">
          {value}
        </div>
        <StepButton label="+" onClick={onIncrement} />
      </div>
    </div>
  );
}

function SuccessCard({
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

function StepButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#101116] text-xl font-black text-[#f4d766] hover:bg-white/5"
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#14151a] px-4 py-4">
      <div>
        <div className="font-bold text-white">{label}</div>
        <div className="mt-1 text-xs text-slate-500">{helper}</div>
      </div>
      <div className="flex gap-2">
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#14151a] px-4 py-4">
      <div>
        <div className="font-bold text-white">Read business plan</div>
        <div className="mt-1 text-xs text-slate-500">Morning and night</div>
      </div>
      <div className="flex gap-2">
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
      className={`h-9 rounded-xl border px-4 text-sm font-semibold transition ${
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
