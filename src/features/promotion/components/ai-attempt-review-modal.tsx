import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/shared/components";
import { promotionService } from "../services/promotion-service";
import type { AITestAnswer } from "../types";

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

/** One graded answer as a reviewer sees it: question, what was said, score and feedback. */
function ReviewedAnswer({ answer, threshold }: { answer: AITestAnswer; threshold: number }) {
  const passed = answer.score >= threshold;
  return (
    <li className="rounded-lg border border-slate-200 p-3 text-sm dark:border-white/10">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-slate-900 dark:text-white">{answer.question}</p>
        <span
          className={
            passed
              ? "shrink-0 font-semibold text-emerald-600 dark:text-emerald-300"
              : "shrink-0 font-semibold text-red-600 dark:text-red-300"
          }
        >
          {answer.score}/100
        </span>
      </div>
      <p className="mt-1 text-slate-600 dark:text-white/70">
        <span className="text-xs uppercase text-slate-400 dark:text-white/40">Answer · </span>
        {answer.answer}
      </p>
      {answer.feedback && (
        <p className="mt-2 text-slate-700 dark:text-white/80">{answer.feedback}</p>
      )}
      {answer.mistakes.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-red-700 dark:text-red-300">
          {answer.mistakes.map((m) => (
            <li key={m}>✗ {m}</li>
          ))}
        </ul>
      )}
      {answer.tips.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-slate-500 dark:text-white/60">
          {answer.tips.map((t) => (
            <li key={t}>→ {t}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * A leader's or admin's view of one AI test attempt: the verdict, every question with
 * the agent's answer and what was missing, and the full call transcript.
 */
export function AIAttemptReviewModal({
  attemptId,
  onClose,
}: {
  attemptId: number | null;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["promotion-ai-attempt", attemptId],
    queryFn: () => promotionService.teamAIAttempt(attemptId as number),
    enabled: attemptId !== null,
  });

  return (
    <Modal
      open={attemptId !== null}
      title="AI Test attempt"
      subtitle={data ? `${data.user_name} · ${data.module_title}` : undefined}
      onClose={onClose}
      dismissible
      contentClassName="max-w-[720px]"
    >
      {isLoading ? (
        <p className="py-6 text-center text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <p className="py-6 text-center text-sm text-red-600">
          {error instanceof Error ? error.message : "Unable to load the attempt"}
        </p>
      ) : data ? (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 dark:text-white/70">
            <span
              className={
                data.passed
                  ? "font-semibold text-emerald-600 dark:text-emerald-300"
                  : "font-semibold text-red-600 dark:text-red-300"
              }
            >
              {data.status === "in_progress"
                ? "Not finished"
                : data.passed
                  ? `Passed · ${data.score}/100`
                  : `Not passed · ${data.score ?? 0}/100`}
            </span>
            <span>Attempt #{data.attempt_number}</span>
            <span>{data.mode === "voice" ? "Voice" : "Typed"}</span>
            <span>Pass mark {data.pass_threshold}</span>
            <span>{formatDate(data.started_at)}</span>
          </div>
          {data.feedback && (
            <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-slate-700 dark:bg-white/[0.04] dark:text-white/80">
              {data.feedback}
            </p>
          )}

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
              Questions · {data.answers.length}
            </h3>
            {data.answers.length ? (
              <ul className="space-y-2">
                {data.answers.map((a) => (
                  <ReviewedAnswer key={a.id} answer={a} threshold={data.pass_threshold} />
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">No answers were graded.</p>
            )}
          </section>

          {data.conversation.length > 0 && (
            <details className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
                Call transcript · {data.conversation.length} lines
              </summary>
              <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
                {data.conversation.map((turn, i) => (
                  <p key={i} className="text-slate-700 dark:text-white/80">
                    <b
                      className={
                        turn.role === "agent"
                          ? "text-amber-700 dark:text-[#ffd700]"
                          : "text-sky-700 dark:text-sky-300"
                      }
                    >
                      {turn.role === "agent" ? "Sophia" : data.user_name}:
                    </b>{" "}
                    {turn.text}
                  </p>
                ))}
              </div>
            </details>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
