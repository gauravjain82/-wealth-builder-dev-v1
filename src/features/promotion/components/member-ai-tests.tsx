import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { promotionService } from "../services/promotion-service";
import type { ModuleStatus, TeamMember } from "../types";
import { AIAttemptReviewModal } from "./ai-attempt-review-modal";

const STATUS_LABEL: Record<ModuleStatus, string> = {
  pending: "Awaiting video",
  watch: "Watching",
  quiz: "Quiz pending",
  ai_test: "AI test pending",
  done: "Complete",
};

/**
 * The AI Test section of a team member's card: each module with an AI test, where the
 * member is, their best score, and every attempt (click one to read the full review).
 * Loaded only when the card is opened.
 */
export function MemberAITests({ member }: { member: TeamMember }) {
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["promotion-team-ai-tests", member.id],
    queryFn: () => promotionService.teamMemberAITests(member.id),
  });
  const { required, passed, pending } = member.ai_tests;

  return (
    <section className="promo-team-ai">
      <h3>
        AI Tests — {passed}/{required} passed
        {pending > 0 && <span className="promo-team-ai-pending"> · {pending} waiting</span>}
      </h3>
      {isLoading ? (
        <p className="promo-team-ai-note">Loading…</p>
      ) : error ? (
        <p className="promo-team-ai-note">
          {error instanceof Error ? error.message : "Unable to load AI tests"}
        </p>
      ) : !data?.modules.length ? (
        <p className="promo-team-ai-note">No AI tests on this member's track yet.</p>
      ) : (
        data.modules.map((m) => (
          <div className="promo-team-ai-row" key={m.module_id}>
            <div className="promo-team-ai-module">
              <strong>{m.title}</strong>
              <small>{m.skill}</small>
            </div>
            <i className={m.status}>{STATUS_LABEL[m.status]}</i>
            <b>{m.best_score != null ? `${m.best_score}/100` : "—"}</b>
            <div className="promo-team-ai-attempts">
              {m.attempts.length === 0 ? (
                <small>No attempts</small>
              ) : (
                m.attempts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={a.passed ? "pass" : a.status === "finished" ? "fail" : ""}
                    onClick={() => setAttemptId(a.id)}
                    title={`Attempt #${a.attempt_number} · ${a.answer_count} answers`}
                  >
                    #{a.attempt_number} {a.score != null ? a.score : "…"}
                  </button>
                ))
              )}
            </div>
          </div>
        ))
      )}
      <AIAttemptReviewModal attemptId={attemptId} onClose={() => setAttemptId(null)} />
    </section>
  );
}
