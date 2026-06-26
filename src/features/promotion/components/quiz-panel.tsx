import { useEffect, useState } from "react";
import { VideoModal } from "@/features/education/components";
import { promotionService } from "../services/promotion-service";
import type { PromotionModule, QuizQuestion } from "../types";

function getEmbedVideoUrl(src: string): string {
  if (!src) return src;

  try {
    const url = new URL(src);
    const host = url.hostname.toLowerCase();
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (host.includes("player.vimeo.com")) {
      return url.toString();
    }

    if (host.includes("youtu.be")) {
      const id = pathParts[0];
      return id ? `https://www.youtube.com/embed/${id}` : src;
    }

    if (host.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      return src;
    }

    if (host.includes("vimeo.com") && !host.includes("player.vimeo.com")) {
      const id = pathParts[0];
      if (!id) return src;
      const embedUrl = new URL(`https://player.vimeo.com/video/${id}`);
      const privateHash = pathParts[1] || url.searchParams.get("h");
      if (privateHash) embedUrl.searchParams.set("h", privateHash);
      return embedUrl.toString();
    }

    return src;
  } catch {
    return src;
  }
}

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
  const [videoOpen, setVideoOpen] = useState(false);
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
        <button
          type="button"
          className="promo-play"
          aria-label={`Watch ${module.title}`}
          onClick={() => setVideoOpen(true)}
        />
        <span>
          {module.title} — {module.duration_label}
        </span>
      </div>
      <VideoModal
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        src={getEmbedVideoUrl(module.video_url)}
        title={module.title}
      />
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
