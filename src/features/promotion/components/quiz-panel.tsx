import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { promotionService } from "../services/promotion-service";
import type {
  PromotionModule,
  QuizQuestion,
  QuizSubmitResult,
  WatchProgress,
} from "../types";
import { getEmbedVideoUrl } from "../video-url";
import { AITestPanel } from "./ai-test-panel";
import { TrackedVideoModal } from "./tracked-video-modal";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

type Phase = "intro" | "question" | "result";

/** Fisher-Yates shuffle of option positions, so the answer is not always in the same place. */
function shuffledOrder(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function QuizPanel({
  module,
  onComplete,
}: {
  module: PromotionModule;
  onComplete: () => void;
}) {
  const [watched, setWatched] = useState(module.status !== "watch");
  const [watchedSeconds, setWatchedSeconds] = useState(module.watch_seconds);
  const [duration, setDuration] = useState(module.video_duration);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  // question id -> ORIGINAL option index (what the server scores)
  const [answers, setAnswers] = useState<Record<number, number>>({});
  // question id -> display order of original option indexes, fixed per attempt
  const [optionOrder, setOptionOrder] = useState<Record<number, number[]>>({});
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const questionRef = useRef<HTMLDivElement>(null);

  // Done or waiting on the AI test both mean the quiz itself is passed.
  const quizPassed = Boolean(module.quiz_passed_at) || module.status === "done";
  const quizOpen = module.has_quiz && watched && !quizPassed;

  useEffect(() => {
    if (!quizOpen || questions.length) return;
    promotionService
      .questions(module.id)
      .then(setQuestions)
      .catch((e) =>
        setMessage(e instanceof Error ? e.message : "Unable to load quiz"),
      );
  }, [quizOpen, module.id, questions.length]);

  useEffect(() => {
    if (phase === "question") questionRef.current?.focus();
  }, [phase, index]);

  const onWatchProgress = (progress: WatchProgress) => {
    setWatchedSeconds(progress.watch_seconds);
    setDuration(progress.video_duration);
    if (progress.watched_at && !watched) {
      setWatched(true);
      onComplete();
    }
  };

  const watchedPct = duration
    ? Math.min(100, Math.round((watchedSeconds / duration) * 100))
    : 0;

  const startAttempt = () => {
    setOptionOrder(
      Object.fromEntries(
        questions.map((q) => [q.id, shuffledOrder(q.options.length)]),
      ),
    );
    setAnswers({});
    setResult(null);
    setMessage("");
    setIndex(0);
    setPhase("question");
  };

  const submit = async () => {
    setBusy(true);
    setMessage("");
    try {
      const r = await promotionService.submitQuiz(module.id, answers);
      setResult(r);
      setPhase("result");
      if (r.passed) onComplete();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to submit quiz");
    } finally {
      setBusy(false);
    }
  };

  if (!module.video_url)
    return (
      <div className="promo-pending">
        Coming soon — this video hasn't been published yet.
      </div>
    );

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const answered = question ? answers[question.id] !== undefined : false;

  const goNext = () => {
    if (!answered || busy) return;
    if (isLast) void submit();
    else setIndex(index + 1);
  };

  const onQuestionKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!question) return;
    const order = optionOrder[question.id] ?? [];
    const key = event.key.toUpperCase();
    const byLetter = LETTERS.indexOf(key);
    const byNumber = Number.parseInt(key, 10) - 1;
    const position = byLetter >= 0 ? byLetter : byNumber;
    if (position >= 0 && position < order.length) {
      event.preventDefault();
      setAnswers((a) => ({ ...a, [question.id]: order[position] }));
    } else if (event.key === "Enter") {
      event.preventDefault();
      goNext();
    }
  };

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
      <TrackedVideoModal
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        moduleId={module.id}
        src={getEmbedVideoUrl(module.video_url)}
        title={module.title}
        watchedSeconds={watchedSeconds}
        alreadyWatched={watched}
        onProgress={onWatchProgress}
      />

      {!watched && (
        <div className="promo-watch-cta">
          <div className="promo-watch-progress">
            <span>
              {module.has_quiz
                ? "Watch the full video to unlock the quiz."
                : "Watch the full video to complete this module."}
              {watchedPct > 0 && ` ${watchedPct}% watched.`}
            </span>
            <div
              className="promo-watch-bar"
              role="progressbar"
              aria-valuenow={watchedPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i style={{ width: `${watchedPct}%` }} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setVideoOpen(true)}
            className="promo-gold-btn"
          >
            {watchedPct > 0 ? "Continue Watching" : "Watch Video"}
          </button>
        </div>
      )}

      {module.has_quiz && quizPassed && phase !== "result" && (
        <div className="promo-quiz promo-quiz-passed">
          <strong>✓ Quiz passed</strong>
          {module.quiz_total ? (
            <span>
              {module.quiz_score}/{module.quiz_total} correct
            </span>
          ) : null}
        </div>
      )}

      {quizOpen && phase === "intro" && (
        <div className="promo-quiz">
          <h4>Quick Check</h4>
          <p className="promo-quiz-meta">
            {questions.length
              ? `${questions.length} questions`
              : "Loading questions…"}{" "}
            · answer all correctly to pass · unlimited retakes
          </p>
          {module.quiz_total ? (
            <p className="promo-quiz-meta">
              Last attempt: {module.quiz_score}/{module.quiz_total}
            </p>
          ) : null}
          <button
            type="button"
            className="promo-gold-btn"
            disabled={!questions.length}
            onClick={startAttempt}
          >
            {module.quiz_total ? "Try Again" : "Start Quiz"}
          </button>
        </div>
      )}

      {phase === "question" && question && (
        <div
          className="promo-quiz"
          ref={questionRef}
          tabIndex={-1}
          onKeyDown={onQuestionKey}
          aria-label={`Question ${index + 1} of ${questions.length}`}
        >
          <div className="promo-quiz-head">
            <h4>
              Question {index + 1} of {questions.length}
            </h4>
            <span className="promo-quiz-hint">
              Keys A–{LETTERS[(optionOrder[question.id] ?? []).length - 1]} to
              choose · Enter to continue
            </span>
          </div>
          <div
            className="promo-quiz-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-valuenow={index + 1}
          >
            {questions.map((q, i) => (
              <i
                key={q.id}
                className={
                  i === index ? "current" : answers[q.id] !== undefined ? "answered" : ""
                }
              />
            ))}
          </div>
          <fieldset className="promo-quiz-question">
            <legend>{question.question_text}</legend>
            {(optionOrder[question.id] ?? []).map((original, position) => {
              const selected = answers[question.id] === original;
              return (
                <label
                  key={original}
                  className={`promo-quiz-option ${selected ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name={`q-${question.id}`}
                    checked={selected}
                    onChange={() =>
                      setAnswers((a) => ({ ...a, [question.id]: original }))
                    }
                  />
                  <b>{LETTERS[position]}</b>
                  <span>{question.options[original]}</span>
                </label>
              );
            })}
          </fieldset>
          <div className="promo-quiz-nav">
            <button
              type="button"
              className="promo-ghost-btn"
              disabled={index === 0 || busy}
              onClick={() => setIndex(index - 1)}
            >
              Back
            </button>
            <button
              type="button"
              className="promo-gold-btn"
              disabled={!answered || busy}
              onClick={goNext}
            >
              {isLast ? (busy ? "Submitting…" : "Submit Quiz") : "Next"}
            </button>
          </div>
        </div>
      )}

      {phase === "result" && result && (
        <div
          className={`promo-quiz promo-quiz-result ${result.passed ? "pass" : "fail"}`}
          role="status"
        >
          <div className="promo-quiz-score">
            <strong>
              {result.score}/{result.total}
            </strong>
            <div>
              <h4>{result.passed ? "Quiz passed" : "Not quite yet"}</h4>
              <p>
                {result.passed
                  ? module.has_ai_test
                    ? "Nice work. One step left: the AI test below."
                    : result.skill_auto_completed
                      ? "Module complete — and that finishes the whole skill."
                      : "Module complete. Nice work."
                  : `You need all ${result.total} correct to pass. Review the ones marked below, rewatch if it helps, and try again.`}
              </p>
            </div>
          </div>
          <ol className="promo-quiz-review">
            {questions.map((q) => {
              const r = result.results.find((x) => x.question_id === q.id);
              const picked =
                r?.selected_index != null ? q.options[r.selected_index] : "—";
              return (
                <li key={q.id} className={r?.is_correct ? "correct" : "wrong"}>
                  <span aria-hidden="true">{r?.is_correct ? "✓" : "✗"}</span>
                  <div>
                    <div>{q.question_text}</div>
                    <small>
                      Your answer: {picked}
                      {r?.is_correct ? "" : " — incorrect"}
                    </small>
                  </div>
                </li>
              );
            })}
          </ol>
          {!result.passed && (
            <div className="promo-quiz-nav">
              <button
                type="button"
                className="promo-ghost-btn"
                onClick={() => setVideoOpen(true)}
              >
                Rewatch Video
              </button>
              <button
                type="button"
                className="promo-gold-btn"
                onClick={startAttempt}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}

      {module.has_ai_test && (quizPassed || (!module.has_quiz && watched)) && (
        <AITestPanel module={module} onComplete={onComplete} />
      )}

      {message && <div className="promo-message">{message}</div>}
    </div>
  );
}
