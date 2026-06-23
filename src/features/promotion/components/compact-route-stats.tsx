import type { PromotionRoute, RouteItem } from "../types";

const formatNumber = (value: number | null) =>
  new Intl.NumberFormat().format(value ?? 0);

function compactChecklistLabel(label: string) {
  return label
    .replace(/^Finish\s+/i, "")
    .replace(/^Apply\s+/i, "")
    .replace(/^Register for\s+/i, "");
}

function itemLabel(item: RouteItem) {
  if (/recruit/i.test(item.label)) return "Recruits";
  if (/point/i.test(item.label)) return "Pts";
  if (/ring/i.test(item.label)) return "Rings";
  if (/license/i.test(item.label)) return "License";
  return item.unit || item.label;
}

function ChecklistStats({ items }: { items: RouteItem[] }) {
  return (
    <>
      {items.map((item) => (
        <div
          className={`promo-compact-chip ${item.is_done ? "confirmed" : "waiting"}`}
          key={item.id}
        >
          <div className={`promo-compact-icon ${item.is_done ? "yes" : "no"}`}>
            {item.is_done ? "✓" : "—"}
          </div>
          <div className="promo-compact-label">
            {compactChecklistLabel(item.label)}
          </div>
        </div>
      ))}
    </>
  );
}

function RollingStats({ items }: { items: RouteItem[] }) {
  return (
    <>
      <div className="promo-compact-chip confirmed">
        <div className="promo-compact-top-label">Current</div>
        {items.map((item) => (
          <div className="promo-compact-line" key={item.id}>
            {formatNumber(item.numeric_value)} {itemLabel(item)}
          </div>
        ))}
      </div>
      <div className="promo-compact-chip remaining">
        <div className="promo-compact-top-label">Left</div>
        {items.map((item) => (
          <div className="promo-compact-line" key={item.id}>
            {formatNumber(
              Math.max((item.target_value ?? 0) - (item.numeric_value ?? 0), 0),
            )}{" "}
            {itemLabel(item)}
          </div>
        ))}
      </div>
    </>
  );
}

function MixedStats({ items }: { items: RouteItem[] }) {
  return (
    <>
      {items.map((item) => (
        <div
          className={`promo-compact-chip ${item.is_done ? "confirmed" : "waiting"}`}
          key={item.id}
        >
          <div className="promo-compact-value">
            {item.item_type === "numeric"
              ? `${formatNumber(item.numeric_value)} / ${formatNumber(item.target_value)}`
              : item.is_done
                ? "Complete"
                : "Pending"}
          </div>
          <div className="promo-compact-label">{itemLabel(item)}</div>
        </div>
      ))}
    </>
  );
}

export function CompactRouteStats({ route }: { route: PromotionRoute }) {
  const ungroupedItems = route.items.filter((item) => !item.leg_group);
  const items = ungroupedItems.length ? ungroupedItems : route.items;
  const allChecks = items.every((item) => item.item_type === "check");
  const allNumeric = items.every((item) => item.item_type === "numeric");
  const isRollingRoute =
    allNumeric &&
    items.some((item) => /recruit/i.test(item.label)) &&
    items.some((item) => /point/i.test(item.label));

  return (
    <div className="promo-compact-stats">
      {allChecks ? (
        <ChecklistStats items={items} />
      ) : isRollingRoute ? (
        <RollingStats items={items} />
      ) : (
        <MixedStats items={items} />
      )}
    </div>
  );
}
