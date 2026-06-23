import { PromotionHeader } from "../components/promotion-header";
import { ProgressSummary } from "../components/progress-summary";
import { RouteCard } from "../components/route-card";
import { SkillsCard } from "../components/skills-card";
import { usePromotionDashboard } from "../hooks/use-promotion-dashboard";
import { getNextRankName } from "../promotion-ranks";
import "./promotion.css";

export default function PromotionDashboardPage() {
  const {
    data,
    isLoading,
    error,
    toggleSkill,
    selectRoute,
    updateItem,
    refresh,
  } = usePromotionDashboard();

  if (isLoading)
    return <div className="promo-state">Loading your promotion track…</div>;
  if (error || !data) {
    return (
      <div className="promo-state">
        <h2>AM I READY TO PROMOTE?</h2>
        <p>
          {error instanceof Error
            ? error.message
            : "Your promotion track hasn't been set up yet. Contact your leader."}
        </p>
      </div>
    );
  }

  return (
    <main className="promo-page">
      <PromotionHeader
        title="AM I READY TO PROMOTE?"
        subtitle="Wealth Builders — Promotion Tracker & Skill Mastery"
      />
      <div className="promo-tabs">
        <button className="active">
          {data.track.level_name} → {getNextRankName(data.track.level_code)}
        </button>
      </div>
      <ProgressSummary
        percent={data.overall_pct}
        status={data.promotion_status}
      />
      <SkillsCard
        skills={data.skills}
        done={data.done_skills}
        total={data.total_skills}
        onToggle={(id) => toggleSkill.mutate(id)}
        onRefresh={() => void refresh()}
      />
      <div className="promo-section-label">
        Choose Your Promotion Route — Pick One
      </div>
      {data.routes.map((route, index) => (
        <div key={route.id}>
          {index > 0 && <div className="promo-or">OR</div>}
          <RouteCard
            route={route}
            onSelect={(id) => selectRoute.mutate(id)}
            onUpdate={(id, value) => updateItem.mutate({ id, value })}
          />
        </div>
      ))}
      {data.promotion_status === "ready" && (
        <section className="promo-result">
          <div className="promo-result-icon">★</div>
          <h2>YOU&apos;RE READY TO PROMOTE!</h2>
          <p>
            You&apos;ve met all the requirements. Schedule your interview with
            your upline leader now and take your next step.
          </p>
          <button
            onClick={() =>
              window.alert(
                "Contact your upline to schedule your promotion interview!",
              )
            }
          >
            Schedule My Promotion Interview
          </button>
        </section>
      )}
      <footer className="promo-footer">
        <strong>WEALTH BUILDERS</strong>
        <span>Self-Assessment — Updated in Real Time</span>
      </footer>
    </main>
  );
}
