import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PromotionHeader } from "../components/promotion-header";
import { TeamMemberCard } from "../components/team-member-card";
import { TeamStats } from "../components/team-stats";
import { promotionService } from "../services/promotion-service";
import type { TeamSort } from "../types";
import "./promotion.css";

export default function TeamPromotionPage() {
  const [role, setRole] = useState<"MD" | "SMD">("MD");
  const [rank, setRank] = useState("");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<TeamSort>("progress_asc");
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["promotion-team", rank, search, sort],
    queryFn: () => promotionService.team(rank, search, sort),
  });

  return (
    <main className="promo-page team">
      <PromotionHeader
        title="TEAM PROMOTION TRACKER"
        subtitle="Wealth Builders — Downline Visibility Dashboard"
        actions={
          <div className="promo-role-toggle">
            <button
              className={role === "MD" ? "active" : ""}
              onClick={() => setRole("MD")}
            >
              View as MD
            </button>
            <button
              className={role === "SMD" ? "active" : ""}
              onClick={() => setRole("SMD")}
            >
              View as SMD
            </button>
          </div>
        }
      />
      {data && <TeamStats stats={data.stats} />}
      <div className="promo-filters">
        <div>
          {[
            ["", "All"],
            ["TA", "Training Assoc."],
            ["A", "Associates"],
            ["MD", "Marketing Dir."],
          ].map(([code, label]) => (
            <button
              key={code}
              className={rank === code ? "active" : ""}
              onClick={() => setRank(code)}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Search by name..."
        />
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as TeamSort)}
        >
          <option value="progress_asc">Sort: Furthest Behind First</option>
          <option value="progress_desc">
            Sort: Closest to Promotion First
          </option>
          <option value="name">Sort: Name A–Z</option>
          <option value="rank">Sort: Rank</option>
        </select>
      </div>
      <div className="promo-section-label">Your Downline</div>
      {isLoading ? (
        <div className="promo-state">Loading your downline…</div>
      ) : error ? (
        <div className="promo-state">
          {error instanceof Error ? error.message : "Unable to load the team."}
        </div>
      ) : data?.members.length ? (
        data.members.map((member) => (
          <TeamMemberCard
            key={member.id}
            member={member}
            open={open === member.id}
            onToggle={() => setOpen(open === member.id ? null : member.id)}
          />
        ))
      ) : (
        <div className="promo-state">No team members match this filter.</div>
      )}
      <footer className="promo-footer">
        <strong>WEALTH BUILDERS</strong>
        {/* <span>
          Sample data shown — connect your live recruit tracker to populate in
          real time
        </span> */}
      </footer>
    </main>
  );
}
