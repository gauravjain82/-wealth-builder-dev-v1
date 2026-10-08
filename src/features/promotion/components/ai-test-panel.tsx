import { useCallback, useEffect, useRef, useState } from "react";
import {
  MicrophoneUnavailableError,
  RealtimeCoachSession,
} from "../realtime-coach";
import { promotionService } from "../services/promotion-service";
import type {
  AITestAnswer,
  AITestFinishResult,
  AITestStartResult,
  AITestState,
  ConversationTurn,
  PromotionModule,
} from "../types";

type Phase =
  | "idle"
  | "connecting"
  | "live"
  | "typed"
  | "finishing"
  | "result"
  | "practice";

const errorText = (e: unknown, fallback: string) =>
  e instanceof Error ? e.message : fallback;

/** One graded answer: score, what was good, what was missing, tips. */
function AnswerCard({ answer }: { answer: AITestAnswer }) {
  return (
    <li className={`promo-ai-answer ${answer.passed ? "pass" : "fail"}`}>
      <div className="promo-ai-answer-head">
        <strong>{answer.question}</strong>
        <span>{answer.score}/100</span>
      </div>
      <p>{answer.feedback}</p>
      {answer.mistakes.length > 0 && (
        <ul>
          {answer.mistakes.map((m) => (
            <li key={m}>✗ {m}</li>
          ))}
        </ul>
      )}
      {answer.tips.length > 0 && (
        <ul>
          {answer.tips.map((t) => (
            <li key={t}>→ {t}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * The AI Test step after a module's quiz. Sophia (OpenAI Realtime) asks spoken
 * questions and every answer is graded by our backend; when the microphone can't be
 * used, the learner can type answers to question-bank questions instead. Passing is
 * decided by the server when the test is finished.
 */
export function AITestPanel({
  module,
  onComplete,
}: {
  module: PromotionModule;
  onComplete: () => void;
}) {
  const [state, setState] = useState<AITestState | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [attempt, setAttempt] = useState<AITestStartResult | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [graded, setGraded] = useState<AITestAnswer[]>([]);
  const [typed, setTyped] = useState<Record<number, string>>({});
  const [grading, setGrading] = useState<number | null>(null);
  const [result, setResult] = useState<AITestFinishResult | null>(null);
  const [micBlocked, setMicBlocked] = useState(false);
  const [practiceId, setPracticeId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const sessionRef = useRef<RealtimeCoachSession | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    promotionService
      .aiTestState(module.id)
      .then(setState)
      .catch((e) => setMessage(errorText(e, "Unable to load the AI test")));
  }, [module.id]);

  useEffect(load, [load, module.status]);
  useEffect(() => () => sessionRef.current?.stop(), []);
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight });
  }, [turns, graded]);

  const reset = () => {
    setTurns([]);
    setGraded([]);
    setTyped({});
    setResult(null);
    setMessage("");
  };

  const startVoice = async () => {
    reset();
    setPhase("connecting");
    try {
      // Ask for the microphone first, so a refusal doesn't use up a test.
      await RealtimeCoachSession.checkMicrophone();
      const started = await promotionService.aiTestStart(module.id, "voice");
      setAttempt(started);
      const session = new RealtimeCoachSession({
        onAgentText: (text) => setTurns((t) => [...t, { role: "agent", text }]),
        onLearnerText: (text) => setTurns((t) => [...t, { role: "learner", text }]),
        onGrade: async (args) => {
          const answer = await promotionService.aiTestGrade(started.attempt_id, args);
          setGraded((g) => [...g, answer]);
          return answer;
        },
        onLive: () => setPhase("live"),
        onError: (text) => setMessage(text),
      });
      sessionRef.current = session;
      await session.start(started.client_secret ?? "");
    } catch (e) {
      sessionRef.current = null;
      if (e instanceof MicrophoneUnavailableError) setMicBlocked(true);
      setMessage(errorText(e, "Unable to start the AI test"));
      setPhase("idle");
    }
  };

  /** Sophia teaches the lesson (her teaching prompt, no grading tool). */
  const startPractice = async () => {
    reset();
    setPhase("connecting");
    try {
      await RealtimeCoachSession.checkMicrophone();
      const started = await promotionService.aiPracticeStart(module.id);
      setPracticeId(started.session_id);
      const session = new RealtimeCoachSession({
        onAgentText: (text) => setTurns((t) => [...t, { role: "agent", text }]),
        onLearnerText: (text) => setTurns((t) => [...t, { role: "learner", text }]),
        // Teaching sessions carry no grading tool, so the model never calls this.
        onGrade: async () => ({ error: "Grading is not part of practice." }),
        onLive: () => setPhase("practice"),
        onError: (text) => setMessage(text),
      });
      sessionRef.current = session;
      await session.start(started.client_secret);
    } catch (e) {
      sessionRef.current = null;
      if (e instanceof MicrophoneUnavailableError) setMicBlocked(true);
      setMessage(errorText(e, "Unable to start practice"));
      setPhase("idle");
    }
  };

  const endPractice = () => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    if (practiceId !== null) {
      promotionService.aiPracticeEnd(practiceId, turns).catch(() => undefined);
    }
    setPracticeId(null);
    setPhase("idle");
    load();
  };

  const startTyped = async () => {
    reset();
    setPhase("connecting");
    try {
      setAttempt(await promotionService.aiTestStart(module.id, "text"));
      setPhase("typed");
    } catch (e) {
      setMessage(errorText(e, "Unable to start the AI test"));
      setPhase("idle");
    }
  };

  const gradeTyped = async (index: number, question: string) => {
    if (!attempt || !typed[index]?.trim()) return;
    setGrading(index);
    setMessage("");
    try {
      const answer = await promotionService.aiTestGrade(attempt.attempt_id, {
        question,
        answer: typed[index],
      });
      setGraded((g) => [...g.filter((a) => a.question !== question), answer]);
    } catch (e) {
      setMessage(errorText(e, "Unable to grade that answer"));
    } finally {
      setGrading(null);
    }
  };

  const finish = async () => {
    if (!attempt) return;
    sessionRef.current?.stop();
    sessionRef.current = null;
    setPhase("finishing");
    try {
      const finished = await promotionService.aiTestFinish(attempt.attempt_id, turns);
      setResult(finished);
      setPhase("result");
      if (finished.passed) onComplete();
      load();
    } catch (e) {
      setMessage(errorText(e, "Unable to finish the test"));
      setPhase(attempt.mode === "voice" ? "idle" : "typed");
    }
  };

  if (!state?.available) return null;

  const threshold = state.pass_threshold ?? 75;
  const minQuestions = state.min_questions ?? 3;
  const left = Math.max(0, (state.daily_limit ?? 0) - (state.attempts_today ?? 0));
  const distinctGraded = new Set(graded.map((a) => a.question.toLowerCase())).size;
  const practiceLeft = Math.max(
    0,
    (state.practice_limit ?? 0) - (state.practice_today ?? 0),
  );
  const practiceButton = (
    <button
      type="button"
      className="promo-ghost-btn"
      disabled={practiceLeft === 0}
      onClick={startPractice}
      title={
        practiceLeft === 0
          ? "You've used today's practice sessions"
          : `${practiceLeft} practice session${practiceLeft === 1 ? "" : "s"} left today`
      }
    >
      Practice with Sophia
    </button>
  );

  if (state.status === "locked") {
    return (
      <div className="promo-quiz promo-ai-locked">
        <h4>🔒 AI Test</h4>
        <p className="promo-quiz-meta">Pass the quiz first to unlock the AI test.</p>
      </div>
    );
  }

  if (state.status === "passed" && phase === "idle") {
    return (
      <div className="promo-quiz promo-quiz-passed">
        <strong>✓ AI Test Complete</strong>
        {state.best_score != null && <span>Score {state.best_score}/100</span>}
        {practiceButton}
        {message && <span className="promo-message">{message}</span>}
      </div>
    );
  }

  return (
    <div
      className={`promo-quiz promo-ai ${
        phase === "result" && result ? `promo-quiz-result ${result.passed ? "pass" : "fail"}` : ""
      }`}
    >
      <h4>{phase === "practice" ? "Practice · Sophia" : "AI Test · Sophia"}</h4>

      {phase === "idle" && (
        <>
          <p className="promo-quiz-meta">
            Sophia will ask you 3 to 5 questions about this video out loud and give
            feedback on each answer. Average {threshold}+ across at least{" "}
            {minQuestions} questions to pass.
          </p>
          {state.last_attempt && (
            <div className="promo-ai-last">
              <strong>
                Last attempt: {state.last_attempt.score ?? 0}/100 — not passed yet
              </strong>
              <p>{state.last_attempt.feedback}</p>
            </div>
          )}
          {micBlocked && (
            <p className="promo-quiz-meta">
              We couldn't use your microphone. Allow microphone access in your
              browser and try again, or type your answers instead.
            </p>
          )}
          <div className="promo-quiz-nav">
            {practiceButton}
            {micBlocked && (
              <button
                type="button"
                className="promo-ghost-btn"
                disabled={left === 0}
                onClick={startTyped}
              >
                Type Answers Instead
              </button>
            )}
            <button
              type="button"
              className="promo-gold-btn"
              disabled={left === 0}
              onClick={startVoice}
            >
              {state.last_attempt ? "Try Again" : "Start AI Test"}
            </button>
          </div>
          <p className="promo-quiz-hint">
            {left === 0
              ? "You've used today's AI tests. Come back tomorrow."
              : `${left} AI test${left === 1 ? "" : "s"} left today`}
            {" · "}
            Practice isn't graded — Sophia walks you through the lesson first (
            {practiceLeft} left today).
          </p>
        </>
      )}

      {phase === "connecting" && <p className="promo-quiz-meta">Connecting…</p>}

      {phase === "practice" && (
        <>
          <p className="promo-quiz-meta">
            <span className="promo-ai-live" /> Live — Sophia is teaching this lesson.
            Ask her anything about it. Nothing here is graded.
          </p>
          <div className="promo-ai-transcript" ref={transcriptRef}>
            {turns.map((turn, i) => (
              <p key={i} className={turn.role}>
                <b>{turn.role === "agent" ? "Sophia" : "You"}:</b> {turn.text}
              </p>
            ))}
          </div>
          <div className="promo-quiz-nav">
            <button type="button" className="promo-gold-btn" onClick={endPractice}>
              End Practice
            </button>
          </div>
        </>
      )}

      {phase === "live" && (
        <>
          <p className="promo-quiz-meta">
            <span className="promo-ai-live" /> Live — speak any time ·{" "}
            {distinctGraded}/{minQuestions}+ questions answered
          </p>
          <div className="promo-ai-transcript" ref={transcriptRef}>
            {turns.map((turn, i) => (
              <p key={i} className={turn.role}>
                <b>{turn.role === "agent" ? "Sophia" : "You"}:</b> {turn.text}
              </p>
            ))}
          </div>
          {graded.length > 0 && (
            <ul className="promo-ai-answers">
              {graded.map((a) => (
                <AnswerCard key={a.id} answer={a} />
              ))}
            </ul>
          )}
          <div className="promo-quiz-nav">
            <button type="button" className="promo-gold-btn" onClick={finish}>
              Finish Test
            </button>
          </div>
        </>
      )}

      {phase === "typed" && attempt?.questions && (
        <>
          <p className="promo-quiz-meta">
            Answer at least {minQuestions} questions in your own words, then finish
            the test.
          </p>
          <ol className="promo-ai-typed">
            {attempt.questions.map((question, index) => {
              const answer = graded.find((a) => a.question === question);
              return (
                <li key={question}>
                  <strong>{question}</strong>
                  <textarea
                    rows={3}
                    value={typed[index] ?? ""}
                    onChange={(e) => setTyped((t) => ({ ...t, [index]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="promo-ghost-btn"
                    disabled={grading !== null || !typed[index]?.trim()}
                    onClick={() => gradeTyped(index, question)}
                  >
                    {grading === index ? "Grading…" : answer ? "Resubmit" : "Submit Answer"}
                  </button>
                  {answer && (
                    <ul className="promo-ai-answers">
                      <AnswerCard answer={answer} />
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="promo-quiz-nav">
            <button
              type="button"
              className="promo-gold-btn"
              disabled={grading !== null || graded.length === 0}
              onClick={finish}
            >
              Finish Test
            </button>
          </div>
        </>
      )}

      {phase === "finishing" && <p className="promo-quiz-meta">Scoring your test…</p>}

      {phase === "result" && result && (
        <>
          <div className="promo-quiz-score">
            <strong>{result.score ?? 0}</strong>
            <div>
              <h4>{result.passed ? "AI Test passed" : "Not quite yet"}</h4>
              <p className="promo-ai-feedback">{result.feedback}</p>
              {result.skill_auto_completed && (
                <p>Every video in this skill is now complete.</p>
              )}
            </div>
          </div>
          <ul className="promo-ai-answers">
            {result.answers.map((a) => (
              <AnswerCard key={a.id} answer={a} />
            ))}
          </ul>
          {!result.passed && (
            <div className="promo-quiz-nav">
              <button type="button" className="promo-gold-btn" onClick={() => setPhase("idle")}>
                Try Again
              </button>
            </div>
          )}
        </>
      )}

      {message && <div className="promo-message">{message}</div>}
    </div>
  );
}
