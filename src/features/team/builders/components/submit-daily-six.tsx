import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { Button, Input, Select, UserAutocompleteDropdown, type UserAutocompleteOption } from '@/shared/components';
import { useToastStore } from '@/store';
import { fetchAssociates, type AssociateTrackerRecord } from '@/features/team/associate-tracker/services/associate-tracker-service';
import {
  submitDailySix,
  submitAgencyDailySix,
  updateBuilderEnrollment,
  type BuilderEnrollment,
  type BuilderPace,
  type DailySixPayload,
  type DailySixSubmission,
} from '../services/builders-service';

const EMPTY_DAILY_SIX: DailySixPayload = {
  session: 'PM',
  friends_made: 0,
  calls_made: 0,
  appointments: 0,
  preplan: false,
  business_plan_am: false,
  business_plan_pm: false,
  pages_read: false,
};
const CUSTOM_PACE_VALUE = 'custom';
const FRONTEND_BASE_URL = (import.meta.env.VITE_FRONTEND_BASE_URL || window.location.origin).replace(/\/$/, '');

interface SubmitDailySixProps {
  paces: BuilderPace[];
  enrollment: BuilderEnrollment | null;
  todaySubmissions: DailySixSubmission[];
  onSubmitted: () => void;
}

type CountField = 'friends_made' | 'calls_made' | 'appointments';
type ToggleField = 'preplan' | 'pages_read' | 'business_plan_am' | 'business_plan_pm';
type DailySixStep = 'setup' | 'entry' | 'success';

function mapAssociateToOption(row: AssociateTrackerRecord): UserAutocompleteOption {
  return {
    id: row.user_id,
    label: row.user_name || row.user_email || `User #${row.user_id}`,
    agencyCode: row.agency_code || '',
    meta: [row.user_email, row.agency_code, row.recruiter_name ? `Recruiter: ${row.recruiter_name}` : '']
      .filter(Boolean)
      .join(' | '),
  };
}

function paceSortWeight(pace: BuilderPace): number {
  const name = pace.name.toLowerCase();
  if (name.includes('full')) return 0;
  if (name.includes('part')) return 1;
  return 2;
}

function formatPaceOption(pace: BuilderPace): string {
  return `${pace.name} - ${pace.target_friends} friends, ${pace.target_calls} calls, ${pace.target_appointments} appointments`;
}

function customTargetsToPace(customTargets: { name: string; friends: number; calls: number; appts: number }): BuilderPace {
  return {
    id: -1,
    name: customTargets.name.trim() || 'Custom',
    target_friends: customTargets.friends,
    target_calls: customTargets.calls,
    target_appointments: customTargets.appts,
    is_public: false,
  };
}

export function SubmitDailySix({
  paces,
  enrollment,
  todaySubmissions,
  onSubmitted,
}: SubmitDailySixProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [step, setStep] = useState<DailySixStep>('setup');
  const [selectedPaceId, setSelectedPaceId] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customTargets, setCustomTargets] = useState({ name: 'My Custom Pace', friends: 2, calls: 20, appts: 3 });
  const [savingEnrollment, setSavingEnrollment] = useState(false);
  const [form, setForm] = useState<DailySixPayload>(EMPTY_DAILY_SIX);
  const [savingSubmission, setSavingSubmission] = useState(false);
  const [success, setSuccess] = useState<{ score: number; streak: number } | null>(null);
  const [activeEnrollment, setActiveEnrollment] = useState<BuilderEnrollment | null>(enrollment);
  const [selectedBuilder, setSelectedBuilder] = useState<UserAutocompleteOption | null>(null);
  const [showSubmissionLink, setShowSubmissionLink] = useState(false);

  useEffect(() => {
    setActiveEnrollment(enrollment);
  }, [enrollment]);

  const loadBuilderOptions = useCallback(async (search: string): Promise<UserAutocompleteOption[]> => {
    const data = await fetchAssociates({
      page: 1,
      pageSize: 20,
      filters: {
        key_player: 'true',
        name: search,
      },
    });

    return data.results
      .filter((row) => Boolean(row.agency_code))
      .map(mapAssociateToOption);
  }, []);

  useEffect(() => {
    if (enrollment?.pace) {
      setSelectedPaceId(String(enrollment.pace.id));
      if (!enrollment.pace.is_public) {
        setCustomMode(true);
        setCustomTargets({
          name: enrollment.pace.name || 'My Custom Pace',
          friends: enrollment.pace.target_friends,
          calls: enrollment.pace.target_calls,
          appts: enrollment.pace.target_appointments,
        });
      }
      return;
    }

    if (paces[0] && !selectedPaceId) {
      setSelectedPaceId(String(paces[0].id));
    }
  }, [enrollment, paces, selectedPaceId]);

  const paceOptions = useMemo(() => {
    const optionMap = new Map<number, BuilderPace>();
    paces.forEach((pace) => optionMap.set(pace.id, pace));

    const selectedEnrollmentPace = activeEnrollment?.pace;
    if (selectedEnrollmentPace && !selectedEnrollmentPace.is_public) {
      optionMap.set(selectedEnrollmentPace.id, selectedEnrollmentPace);
    }

    return [...optionMap.values()].sort((a, b) => {
      const weightDiff = paceSortWeight(a) - paceSortWeight(b);
      if (weightDiff !== 0) return weightDiff;
      return a.name.localeCompare(b.name);
    });
  }, [activeEnrollment?.pace, paces]);

  const selectedPace = useMemo(
    () => paceOptions.find((pace) => String(pace.id) === selectedPaceId) ?? null,
    [paceOptions, selectedPaceId]
  );
  const activePace = customMode
    ? customTargetsToPace(customTargets)
    : selectedPace ?? activeEnrollment?.pace;
  const activeUserName = activeEnrollment?.user_name ?? selectedBuilder?.label ?? '';
  const activeSubmissionLink = selectedBuilder?.agencyCode
    ? `${FRONTEND_BASE_URL}/team/builders/daily-six/${encodeURIComponent(selectedBuilder.agencyCode)}`
    : activeEnrollment?.submission_link;
  const visibleTodaySubmissions = todaySubmissions;
  const existingForSession = visibleTodaySubmissions.find((submission) => submission.session === form.session);

  useEffect(() => {
    if (!existingForSession) {
      setForm((prev) => ({ ...EMPTY_DAILY_SIX, session: prev.session }));
      return;
    }

    setForm({
      session: existingForSession.session,
      friends_made: existingForSession.friends_made,
      calls_made: existingForSession.calls_made,
      appointments: existingForSession.appointments,
      preplan: existingForSession.preplan,
      business_plan_am: existingForSession.business_plan_am,
      business_plan_pm: existingForSession.business_plan_pm,
      pages_read: existingForSession.pages_read,
    });
  }, [existingForSession]);

  const setupSummary = useMemo(() => {
    if (!activePace) return 'Pick your name and your pace. This sets your daily goals for the whole month.';
    return `${activePace.name} goals: ${activePace.target_friends} friends, ${activePace.target_calls} calls, ${activePace.target_appointments} appointments`;
  }, [activePace]);

  const handleCopyLink = async () => {
    if (!activeSubmissionLink) return;

    try {
      await navigator.clipboard.writeText(activeSubmissionLink);
      addToast({ type: 'success', message: 'Daily Six link copied.' });
    } catch {
      addToast({ type: 'error', message: 'Unable to copy link.' });
    }
  };

  const handleBuilderSelect = (option: UserAutocompleteOption) => {
    setSelectedBuilder(option);
    setShowSubmissionLink(false);
  };

  const handleGenerateLink = async () => {
    if (!selectedBuilder) return;

    setSavingEnrollment(true);
    try {
      const updated = customMode
        ? await updateBuilderEnrollment({
            user_id: selectedBuilder.id,
            is_custom: true,
            name: customTargets.name.trim() || 'My Custom Pace',
            target_friends: customTargets.friends,
            target_calls: customTargets.calls,
            target_appointments: customTargets.appts,
          })
        : await updateBuilderEnrollment({
            user_id: selectedBuilder.id,
            pace_id: Number(selectedPaceId),
          });

      setActiveEnrollment(updated);
      setSuccess(null);
      setShowSubmissionLink(true);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to generate Daily Six link.' });
    } finally {
      setSavingEnrollment(false);
    }
  };

  const updateCount = (field: CountField, delta: number) => {
    setForm((prev) => ({ ...prev, [field]: Math.max(0, prev[field] + delta) }));
  };

  const toggleField = (field: ToggleField) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const calculateScore = () => {
    const pace = activePace;
    const pct = (actual: number, goal: number | undefined) => (goal && goal > 0 ? Math.min(1, actual / goal) : 1);
    const scores = [
      pct(form.friends_made, pace?.target_friends),
      pct(form.calls_made, pace?.target_calls),
      pct(form.appointments, pace?.target_appointments),
      form.preplan ? 1 : 0,
      (Number(form.business_plan_am) + Number(form.business_plan_pm)) / 2,
      form.pages_read ? 1 : 0,
    ];

    return Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 100);
  };

  const handleSubmit = async () => {
    setSavingSubmission(true);
    try {
      const response = selectedBuilder?.agencyCode
        ? await submitAgencyDailySix(selectedBuilder.agencyCode, form)
        : await submitDailySix(form);
      setSuccess({ score: calculateScore(), streak: response.streak });
      addToast({ type: 'success', message: 'Daily Six submitted.' });
      if (!selectedBuilder?.agencyCode) {
        onSubmitted();
      }
      setStep('success');
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to submit Daily Six.' });
    } finally {
      setSavingSubmission(false);
    }
  };

  const handleAnotherSubmission = () => {
    setSuccess(null);
    setForm((prev) => ({ ...EMPTY_DAILY_SIX, session: prev.session }));
    setStep('entry');
  };

  return (
    <div className="mx-auto w-full max-w-[580px]">
      {step === 'setup' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          <h2 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">Set up once</h2>
          <p className="mb-5 text-sm leading-6 text-slate-500 dark:text-white/60">{setupSummary}</p>

          <FormLabel>Your name</FormLabel>
          <div className="mb-4">
            <UserAutocompleteDropdown
              selectedId={selectedBuilder?.id ?? null}
              selectedLabel={activeUserName}
              placeholder="Select key player"
              fetchOptions={loadBuilderOptions}
              onSelect={(option) => {
                handleBuilderSelect(option);
              }}
            />
          </div>

          <FormLabel>Your pace</FormLabel>
          <Select
            className="mb-4 h-12"
            value={customMode ? CUSTOM_PACE_VALUE : selectedPaceId}
            onChange={(event) => {
              const nextValue = event.target.value;
              setShowSubmissionLink(false);
              setCustomMode(nextValue === CUSTOM_PACE_VALUE);
              if (nextValue !== CUSTOM_PACE_VALUE) setSelectedPaceId(nextValue);
            }}
          >
            {paceOptions.map((pace) => (
              <option key={pace.id} value={pace.id}>
                {formatPaceOption(pace)}
              </option>
            ))}
            <option value={CUSTOM_PACE_VALUE}>Custom - set your own numbers</option>
          </Select>

          {customMode && (
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              <NumberField
                label="Friends / day"
                value={customTargets.friends}
                onChange={(value) => {
                  setShowSubmissionLink(false);
                  setCustomTargets((prev) => ({ ...prev, friends: value }));
                }}
              />
              <NumberField
                label="Calls / day"
                value={customTargets.calls}
                onChange={(value) => {
                  setShowSubmissionLink(false);
                  setCustomTargets((prev) => ({ ...prev, calls: value }));
                }}
              />
              <NumberField
                label="Appts / day"
                value={customTargets.appts}
                onChange={(value) => {
                  setShowSubmissionLink(false);
                  setCustomTargets((prev) => ({ ...prev, appts: value }));
                }}
              />
            </div>
          )}

          <Button
            type="button"
            className="h-12 w-full"
            onClick={handleGenerateLink}
            disabled={savingEnrollment || !selectedBuilder || (!customMode && !selectedPaceId)}
          >
            {savingEnrollment ? 'Loading...' : 'Submit'}
          </Button>

          {showSubmissionLink && activeSubmissionLink && (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 pl-3 dark:border-white/10 dark:bg-black/20">
              <input
                className="min-w-0 flex-1 bg-transparent text-xs text-slate-600 outline-none dark:text-white/60"
                readOnly
                value={activeSubmissionLink}
              />
              <Button
                type="button"
                disabled={!activeSubmissionLink}
                onClick={handleCopyLink}
              >
                <Copy size={14} />
                Copy link
              </Button>
            </div>
          )}

          <p className="mt-4 text-center text-xs leading-5 text-slate-500 dark:text-white/50">
            Bookmark this page on your phone. You'll come back to it every morning and night.
          </p>
        </div>
      )}

      {step === 'entry' && activeEnrollment && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">Daily Six</h2>
              <p className="text-sm text-slate-500 dark:text-white/60">
                {activeUserName ? `${activeUserName} - ` : ''}{activePace?.name || 'Builder'} goals
                {existingForSession ? ' - this session will be updated' : ''}
              </p>
            </div>
            <div className="flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-white/10">
              {(['AM', 'PM'] as const).map((session) => (
                <button
                  key={session}
                  type="button"
                  className={`h-8 rounded-md px-3 text-xs font-semibold ${
                    form.session === session
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10'
                  }`}
                  onClick={() => setForm((prev) => ({ ...prev, session }))}
                >
                  {session}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <MetricStepper
              label="Friends made"
              goal={activePace?.target_friends ?? 0}
              value={form.friends_made}
              onDecrement={() => updateCount('friends_made', -1)}
              onIncrement={() => updateCount('friends_made', 1)}
            />
            <MetricStepper
              label="Calls made"
              goal={activePace?.target_calls ?? 0}
              value={form.calls_made}
              onDecrement={() => updateCount('calls_made', -1)}
              onIncrement={() => updateCount('calls_made', 1)}
            />
            <MetricStepper
              label="Appointments"
              goal={activePace?.target_appointments ?? 0}
              value={form.appointments}
              onDecrement={() => updateCount('appointments', -1)}
              onIncrement={() => updateCount('appointments', 1)}
            />
            <ToggleRow
              label="Preplanned tomorrow"
              helper="Mapped my day"
              active={form.preplan}
              onChange={(value) => setForm((prev) => ({ ...prev, preplan: value }))}
            />
            <BusinessPlanRow
              am={form.business_plan_am}
              pm={form.business_plan_pm}
              onToggleAm={() => toggleField('business_plan_am')}
              onTogglePm={() => toggleField('business_plan_pm')}
            />
            <ToggleRow
              label="Read 10 pages"
              helper="Of a book"
              active={form.pages_read}
              onChange={(value) => setForm((prev) => ({ ...prev, pages_read: value }))}
            />
          </div>

          <Button type="button" className="mt-5 h-12 w-full" onClick={handleSubmit} disabled={savingSubmission}>
            {savingSubmission ? 'Submitting...' : 'Submit today'}
          </Button>
          <p className="mt-4 text-center text-xs leading-5 text-slate-500 dark:text-white/50">
            Morning: log what you'll do. Night: log what you did. Two submissions a day keeps the streak alive.
          </p>
        </div>
      )}

      {step === 'success' && success && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-white/10 dark:bg-white/5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/60">
            Logged. You showed up today.
          </div>
          <div className="my-4 text-5xl font-extrabold text-amber-500">{success.streak}</div>
          <p className="mx-auto max-w-sm text-sm leading-6 text-slate-500 dark:text-white/60">
            Today's score: <span className="font-bold text-amber-500">{success.score}%</span>. You're on a{' '}
            <span className="font-bold text-amber-500">{success.streak}-day streak</span>.
          </p>
          <Button type="button" variant="outline" className="mt-5" onClick={handleAnotherSubmission}>
            Log another submission
          </Button>
        </div>
      )}
    </div>
  );
}

function FormLabel({ children }: { children: string }) {
  return (
    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/60">
      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-semibold text-slate-500 dark:text-white/60">{label}</span>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
      />
    </label>
  );
}

function MetricStepper({
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
      <div>
        <div className="font-semibold text-slate-900 dark:text-white">{label}</div>
        <div className="mt-1 text-xs text-slate-500 dark:text-white/50">Goal: {goal} today</div>
      </div>
      <div className="flex items-center gap-1">
        <Button type="button" variant="outline" size="icon" onClick={onDecrement}>
          -
        </Button>
        <div className="w-12 text-center text-lg font-extrabold text-slate-900 dark:text-white">{value}</div>
        <Button type="button" variant="outline" size="icon" onClick={onIncrement}>
          +
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  helper,
  active,
  onChange,
}: {
  label: string;
  helper: string;
  active: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
      <div>
        <div className="font-semibold text-slate-900 dark:text-white">{label}</div>
        <div className="mt-1 text-xs text-slate-500 dark:text-white/50">{helper}</div>
      </div>
      <div className="flex gap-2">
        <ToggleButton label="Yes" active={active} onClick={() => onChange(true)} />
        <ToggleButton label="No" active={!active} negative onClick={() => onChange(false)} />
      </div>
    </div>
  );
}

function BusinessPlanRow({
  am,
  pm,
  onToggleAm,
  onTogglePm,
}: {
  am: boolean;
  pm: boolean;
  onToggleAm: () => void;
  onTogglePm: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
      <div>
        <div className="font-semibold text-slate-900 dark:text-white">Read business plan</div>
        <div className="mt-1 text-xs text-slate-500 dark:text-white/50">Morning and night</div>
      </div>
      <div className="flex gap-2">
        <ToggleButton label="AM" active={am} onClick={onToggleAm} />
        <ToggleButton label="PM" active={pm} onClick={onTogglePm} />
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  label,
  negative = false,
  onClick,
}: {
  active: boolean;
  label: string;
  negative?: boolean;
  onClick: () => void;
}) {
  const activeClass = negative
    ? 'border-red-400 bg-red-400/10 text-red-500'
    : 'border-emerald-400 bg-emerald-400/15 text-emerald-500';

  return (
    <button
      type="button"
      className={`h-9 rounded-lg border px-4 text-sm font-semibold ${
        active ? activeClass : 'border-slate-300 text-slate-500 dark:border-white/20 dark:text-white/60'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
