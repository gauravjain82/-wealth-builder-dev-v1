import type { PromotionRoute, RouteItem } from "../types";
import { CompactRouteStats } from "./compact-route-stats";
const fmt = (n: number | null) => new Intl.NumberFormat().format(n ?? 0);
function RouteItemRow({
  item,
  onUpdate,
}: {
  item: RouteItem;
  onUpdate: (id: number, value?: number) => void;
}) {
  if (item.item_type === "check")
    return (
      <button className="promo-route-row" onClick={() => onUpdate(item.id)}>
        <i className={item.is_done ? "on" : ""} />
        <span className={item.is_done ? "done" : ""}>{item.label}</span>
      </button>
    );
  return (
    <div className="promo-route-row numeric">
      <button
        type="button"
        className="promo-numeric-check"
        onClick={() =>
          onUpdate(item.id, item.is_done ? 0 : (item.target_value ?? 0))
        }
        aria-label={`${item.is_done ? "Uncheck" : "Check"} ${item.label}`}
      >
        <i className={item.is_done ? "on" : ""} aria-hidden="true" />
      </button>
      <span className={item.is_done ? "done" : ""}>{item.label}</span>
      <strong>
        {fmt(item.numeric_value)} / {fmt(item.target_value)}{" "}
        {item.is_done && "✓"}
      </strong>
      {!item.data_source && (
        <input
          type="number"
          aria-label={`Update ${item.label}`}
          defaultValue={item.numeric_value ?? 0}
          onBlur={(e) => onUpdate(item.id, Number(e.target.value))}
        />
      )}
    </div>
  );
}
export function RouteCard({
  route,
  onSelect,
  onUpdate,
}: {
  route: PromotionRoute;
  onSelect: (id: number) => void;
  onUpdate: (id: number, value?: number) => void;
}) {
  const groups = route.items.reduce<Record<string, RouteItem[]>>((a, i) => {
    (a[i.leg_group || ""] ??= []).push(i);
    return a;
  }, {});
  return (
    <article
      className={`promo-route-card ${route.is_selected ? "selected" : ""} ${!route.is_eligible ? "expired" : ""}`}
    >
      <header>
        <div>
          <h3>{route.name}</h3>
          <p className={route.is_urgent ? "urgent" : ""}>{route.time_label}</p>
        </div>
        <CompactRouteStats route={route} />
        <button
          onClick={() => onSelect(route.id)}
          disabled={!route.is_eligible}
        >
          {route.is_selected ? "✓ Selected" : "Select Route"}
        </button>
      </header>
      {Object.keys(groups).some(Boolean) ? (
        <div className="promo-legs">
          {Object.entries(groups)
            .filter(([g]) => g)
            .map(([g, items]) => (
              <section key={g}>
                <h4>{g}</h4>
                {items.map((i) => (
                  <RouteItemRow key={i.id} item={i} onUpdate={onUpdate} />
                ))}
              </section>
            ))}
        </div>
      ) : (
        <div>
          {route.items.map((i) => (
            <RouteItemRow key={i.id} item={i} onUpdate={onUpdate} />
          ))}
        </div>
      )}
      <footer>
        <div className="promo-route-bar">
          <i style={{ width: `${route.route_pct}%` }} />
        </div>
        <span>{route.route_pct}%</span>
      </footer>
      {!route.is_eligible && (
        <p className="promo-route-note">
          {route.name} window has closed — only the remaining route(s) apply.
        </p>
      )}
      {route.note && <p className="promo-route-note">{route.note}</p>}
    </article>
  );
}
