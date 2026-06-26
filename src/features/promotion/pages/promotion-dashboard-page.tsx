import { useEffect, useMemo, useState } from "react";
import { Plan } from "@core/types";
import { roleToPlan } from "@core/constants/roles";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { PromotionHeader } from "../components/promotion-header";
import { ProgressSummary } from "../components/progress-summary";
import { RouteCard } from "../components/route-card";
import { SkillsCard } from "../components/skills-card";
import { usePromotionDashboard } from "../hooks/use-promotion-dashboard";
import "./promotion.css";

const TAB_LABEL_BY_LEVEL_CODE: Record<string, string> = {
  TA: "Associate (A)",
  A: "Marketing Director (MD)",
  MD: "Senior Marketing Director (SMD)",
};

function getUserPlan(roles?: string[]): Plan {
  const primaryRole = roles?.[0];
  if (!primaryRole) return Plan.NewAgent;
  return roleToPlan(primaryRole.trim().toUpperCase().replace(/[\s-]+/g, "_"));
}

function getTrackTabLabel(levelCode: string, fallbackName: string): string {
  return TAB_LABEL_BY_LEVEL_CODE[levelCode] || fallbackName;
}

export default function PromotionDashboardPage() {
  const { user } = useAuth();
  const {
    data: dashboards,
    isLoading,
    error,
    toggleSkill,
    selectRoute,
    updateItem,
    refresh,
  } = usePromotionDashboard();
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const isNewAgent = getUserPlan(user?.roles) === Plan.NewAgent;

  const visibleDashboards = useMemo(() => {
    const list = dashboards || [];
    return isNewAgent ? list.slice(0, 1) : list;
  }, [dashboards, isNewAgent]);

  useEffect(() => {
    if (activeTrackIndex >= visibleDashboards.length) {
      setActiveTrackIndex(0);
    }
  }, [activeTrackIndex, visibleDashboards.length]);

  const data = visibleDashboards[activeTrackIndex] || visibleDashboards[0];

  if (isLoading) {
    return <div className="promo-state">Loading your promotion track...</div>;
  }

  if (error || !data || visibleDashboards.length === 0) {
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
        subtitle="Wealth Builders - Promotion Tracker & Skill Mastery"
      />
      <div className="promo-tabs">
        {visibleDashboards.map((dashboard, index) => (
          <button
            key={dashboard.track.id}
            type="button"
            className={index === activeTrackIndex ? "active" : ""}
            onClick={() => setActiveTrackIndex(index)}
          >
            {getTrackTabLabel(dashboard.track.level_code, dashboard.track.name)}
          </button>
        ))}
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
        Choose Your Promotion Route - Pick One
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
          <div className="promo-result-icon">{"\u2605"}</div>
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
        <span>Self-Assessment - Updated in Real Time</span>
      </footer>
    </main>
  );
}
