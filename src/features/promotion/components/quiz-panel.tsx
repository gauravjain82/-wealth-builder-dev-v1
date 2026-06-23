import { useEffect, useState } from "react";
import { promotionService } from "../services/promotion-service";
import type { PromotionModule, QuizQuestion } from "../types";

export function QuizPanel({
  module,
  onComplete,
}: {
  module: PromotionModule;
  onComplete: () => void;
}) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (module.status === "quiz")
      promotionService
        .questions(module.id)
        .then(setQuestions)
        .catch((e) =>
          setMessage(e instanceof Error ? e.message : "Unable to load quiz"),
        );
  }, [module.id, module.status]);
  const watch = async () => {
    setBusy(true);
    setMessage("");
    try {
      await promotionService.watch(module.id);
      if (module.has_quiz)
        setQuestions(await promotionService.questions(module.id));
      else onComplete();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to update video");
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    setBusy(true);
    try {
      const r = await promotionService.submitQuiz(module.id, answers);
      setMessage(`Score: ${r.score}/${r.total} — Complete`);
      onComplete();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to submit quiz");
    } finally {
      setBusy(false);
    }
  };
  if (!module.video_url)
    return (
      <div className="promo-pending">
        Video not yet recorded for this module. Once you send the clip, it plugs
        in here — quiz questions to follow.
      </div>
    );
  return (
    <div className="promo-video-area">
      <div
        className={`promo-video ${module.status !== "watch" ? "watched" : ""}`}
      >
        <a
          href={module.video_url}
          target="_blank"
          rel="noreferrer"
          className="promo-play"
          aria-label={`Watch ${module.title}`}
        />
        <span>
          {module.title} — {module.duration_label}
        </span>
      </div>
      {module.status === "watch" && (
        <button disabled={busy} onClick={watch} className="promo-gold-btn">
          {busy ? "Saving…" : "Mark as Watched"}
        </button>
      )}
      {questions.length > 0 && (
        <div className="promo-quiz">
          <h4>Quick Check — Answer Before Moving On</h4>
          {questions.map((q) => (
            <fieldset key={q.id}>
              <legend>{q.question_text}</legend>
              {q.options.map((o, i) => (
                <label key={o}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === i}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                  />
                  {o}
                </label>
              ))}
            </fieldset>
          ))}
          <button
            className="promo-gold-btn"
            disabled={busy || Object.keys(answers).length !== questions.length}
            onClick={submit}
          >
            Submit Quiz
          </button>
        </div>
      )}
      {message && <div className="promo-message">{message}</div>}
    </div>
  );
}
