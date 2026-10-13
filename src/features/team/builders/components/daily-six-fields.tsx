import type { BuilderPace, DailySixPayload } from '../services/builders-service';

type CountField = 'friends_made' | 'calls_made' | 'appointments';

interface DailySixFieldsProps {
  pace: BuilderPace;
  form: DailySixPayload;
  onChange: (next: DailySixPayload) => void;
}

/**
 * The six Daily Six inputs, in the dark phone layout of the public pages.
 * Shared by the submit page and the history page's edit form.
 */
export function DailySixFields({ pace, form, onChange }: DailySixFieldsProps) {
  const updateCount = (field: CountField, delta: number) =>
    onChange({ ...form, [field]: Math.max(0, form[field] + delta) });

  return (
    <div className="grid gap-2">
      <MetricRow
        label="Friends"
        goal={pace.target_friends}
        value={form.friends_made}
        onDecrement={() => updateCount('friends_made', -1)}
        onIncrement={() => updateCount('friends_made', 1)}
      />
      <MetricRow
        label="Calls"
        goal={pace.target_calls}
        value={form.calls_made}
        onDecrement={() => updateCount('calls_made', -1)}
        onIncrement={() => updateCount('calls_made', 1)}
      />
      <MetricRow
        label="Appts"
        goal={pace.target_appointments}
        value={form.appointments}
        onDecrement={() => updateCount('appointments', -1)}
        onIncrement={() => updateCount('appointments', 1)}
      />
      <ToggleRow
        label="Preplanned tomorrow"
        helper="Mapped my day"
        yesActive={form.preplan}
        noActive={!form.preplan}
        onYes={() => onChange({ ...form, preplan: true })}
        onNo={() => onChange({ ...form, preplan: false })}
      />
      <BusinessPlanRow
        am={form.business_plan_am}
        pm={form.business_plan_pm}
        onAm={() => onChange({ ...form, business_plan_am: !form.business_plan_am })}
        onPm={() => onChange({ ...form, business_plan_pm: !form.business_plan_pm })}
      />
      <ToggleRow
        label="Read 10 pages"
        helper="Of a book"
        yesActive={form.pages_read}
        noActive={!form.pages_read}
        onYes={() => onChange({ ...form, pages_read: true })}
        onNo={() => onChange({ ...form, pages_read: false })}
      />
    </div>
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
