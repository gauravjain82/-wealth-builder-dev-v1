import type { PromotionStatus } from "../types";
const labels: Record<PromotionStatus, string> = {
  ready: "Ready to Promote!",
  close: "Almost There",
  not_ready: "Keep Going",
};
export function ProgressSummary({
  percent,
  status,
}: {
  percent: number;
  status: PromotionStatus;
}) {
  return (
    <div className="promo-progress">
      <strong>{percent}%</strong>
      <span className={status.replace("_", "-")}>{labels[status]}</span>
      <div className="promo-bar">
        <i style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
