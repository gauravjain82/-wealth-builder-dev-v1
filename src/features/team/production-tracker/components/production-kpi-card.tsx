import { Tooltip } from '@/shared/components/ui/tooltip';
import { IconInfoCircle } from '@tabler/icons-react';

export function ProductionKpiCard({
  label,
  value,
  grossValue,
  netValue,
  info,
  onClick,
}: {
  label: string;
  // Single-value cards pass `value`. The realised "Points" cards instead pass
  // `grossValue` + `netValue` to show Gross and Net (Net = Gross − chargeback).
  value?: string;
  grossValue?: string;
  netValue?: string;
  info: string;
  onClick?: () => void;
}) {
  const showGrossNet = grossValue !== undefined && netValue !== undefined;

  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 px-3 py-4 text-center shadow-sm dark:border-[#6d5930] dark:bg-[linear-gradient(135deg,rgba(64,49,16,0.9),rgba(43,32,9,0.92))] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] ${
        onClick ? 'cursor-pointer transition-opacity hover:opacity-80' : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-800 dark:text-[#f7f0d3]">
        <span>{label}</span>
        <Tooltip content={info} position="top" target="hover">
          <span aria-label={info} className="cursor-help text-amber-500 dark:text-[#ddc67a]">
            <IconInfoCircle size={12} stroke={2} />
          </span>
        </Tooltip>
      </div>
      {showGrossNet ? (
        <div className="mt-2 flex items-stretch justify-center divide-x divide-amber-200 dark:divide-[#6d5930]">
          <div className="px-3">
            <div className="text-[9px] font-semibold uppercase tracking-wide text-amber-700 dark:text-[#ddc67a]">Gross</div>
            <div className="text-base font-extrabold text-amber-900 dark:text-white">{grossValue}</div>
          </div>
          <div className="px-3">
            <div className="text-[9px] font-semibold uppercase tracking-wide text-amber-700 dark:text-[#ddc67a]">Net</div>
            <div className="text-base font-extrabold text-amber-900 dark:text-white">{netValue}</div>
          </div>
        </div>
      ) : (
        <div className="mt-2 text-lg font-extrabold text-amber-900 dark:text-white">{value}</div>
      )}
    </div>
  );
}
