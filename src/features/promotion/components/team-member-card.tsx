import type { TeamMember } from "../types";
const target: Record<string, string> = {
  TA: "Associate",
  A: "Marketing Director",
  MD: "Senior MD",
};
const number = (n: number | null) => new Intl.NumberFormat().format(n ?? 0);
export function TeamMemberCard({
  member,
  open,
  onToggle,
}: {
  member: TeamMember;
  open: boolean;
  onToggle: () => void;
}) {
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  return (
    <article className={`promo-member ${member.overall >= 95 ? "ready" : ""}`}>
      <button className="promo-member-row" onClick={onToggle}>
        <span className="promo-avatar">{initials}</span>
        <span className="promo-member-name">
          <strong>{member.name}</strong>
          <small>
            {member.done_videos}/{member.total_videos} videos ·{" "}
            {member.days_in_rank} days in rank
          </small>
        </span>
        <span className={`promo-rank rank-${member.rank_code}`}>
          {member.rank_name}
        </span>
        <span className="promo-arrow">→</span>
        <span className="promo-target">
          {target[member.rank_code] ?? "Next Rank"}
        </span>
        <span className="promo-mini-progress">
          <i>
            <b style={{ width: `${member.overall}%` }} />
          </i>
          <strong>{member.overall}%</strong>
        </span>
        {member.overall >= 95 && <span className="promo-ready">Ready</span>}
        <span className={open ? "open" : ""}>▼</span>
      </button>
      {open && (
        <div className="promo-member-detail">
          <section>
            <h3>Skills &amp; Videos — {member.skill_pct}% Complete</h3>
            {member.skill_progress.map((s) => (
              <div className="promo-team-skill" key={s.label}>
                <i
                  className={s.is_complete ? "done" : s.done ? "progress" : ""}
                >
                  {s.is_complete ? "✓" : s.done ? "~" : ""}
                </i>
                <span>{s.label}</span>
                <b>
                  {s.done}/{s.videos}
                </b>
              </div>
            ))}
          </section>
          <section className="promo-team-routes">
            <p>{member.days_in_rank} days in current rank</p>
            {member.routes.map((route) => (
              <div
                className={`promo-mini-route ${!route.is_eligible ? "expired" : ""}`}
                key={route.name}
              >
                <header>
                  <strong>{route.name}</strong>
                  <span className={route.is_urgent ? "urgent" : ""}>
                    {route.time_label}
                  </span>
                </header>
                {route.items.map((item) => (
                  <div key={item.id}>
                    {item.item_type === "check" ? (
                      <>
                        <i className={item.is_done ? "done" : ""}>
                          {item.is_done ? "✓" : ""}
                        </i>
                        <span>{item.label}</span>
                      </>
                    ) : (
                      <>
                        <span>{item.label}</span>
                        <b>
                          {number(item.numeric_value)} /{" "}
                          {number(item.target_value)} {item.is_done && "✓"}
                        </b>
                      </>
                    )}
                  </div>
                ))}
                {!route.is_eligible && (
                  <small>
                    {route.name} window has closed — only the remaining route(s)
                    apply.
                  </small>
                )}
              </div>
            ))}
          </section>
        </div>
      )}
    </article>
  );
}
