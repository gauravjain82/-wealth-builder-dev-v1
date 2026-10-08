import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Modal, Textarea } from '@/shared/components';
import { useContentAction } from '../hooks/use-promotion-admin';
import {
  createAILesson,
  fetchAILesson,
  updateAILesson,
} from '../services/promotion-admin-service';
import type { AdminAILesson, AdminVideo, AILessonContent } from '../types';

interface AILessonModalProps {
  video: AdminVideo | null;
  onClose: () => void;
}

/** Sophia needs at least this many questions to run a test (the backend enforces it too). */
const MIN_QUESTIONS = 3;

const EMPTY_LESSON: AILessonContent = {
  summary: '',
  learning_objectives: [],
  key_concepts: [],
  sections: [],
  scripts_and_phrases: [],
  common_mistakes: [],
  quiz: [],
};

const INPUT =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-300/50 dark:border-white/15 dark:bg-white/5 dark:text-white';
const GROUP =
  'space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]';
const LEGEND = 'text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50';
const REMOVE =
  'rounded p-1.5 text-slate-400 hover:bg-slate-200 dark:text-white/40 dark:hover:bg-white/10';
const ADD = 'text-xs font-medium text-amber-700 hover:underline dark:text-[#ffd700]';

const toLines = (items: string[]) => items.join('\n');
const fromLines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/** A list of short strings edited as one textarea, one item per line. */
function LinesField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  rows?: number;
}) {
  const [text, setText] = useState(toLines(value));
  useEffect(() => setText(toLines(value)), [value]);
  return (
    <label className="block space-y-1">
      <span className={LEGEND}>{label} — one per line</span>
      <Textarea
        rows={rows}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onChange(fromLines(text))}
      />
    </label>
  );
}

/**
 * Edit the lesson Sophia teaches and tests from: summary, sections, scripts, common
 * mistakes and the question bank (with ideal answers and must-mention points), plus
 * whether the AI test is required and its pass mark. Our admin UI owns this content
 * after the one-time import from wealthbuilderagent.
 */
export function AILessonModal({ video, onClose }: AILessonModalProps) {
  const run = useContentAction();
  const [existing, setExisting] = useState<AdminAILesson | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(75);
  const [lesson, setLesson] = useState<AILessonContent>(EMPTY_LESSON);
  const [transcript, setTranscript] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [saving, setSaving] = useState(false);

  const videoId = video?.id;
  useEffect(() => {
    if (videoId === undefined) return;
    setLoading(true);
    setLoadError('');
    setShowTranscript(false);
    fetchAILesson(videoId)
      .then((found) => {
        setExisting(found);
        setEnabled(found?.enabled ?? false);
        setThreshold(found?.pass_threshold ?? 75);
        setLesson(found ? { ...EMPTY_LESSON, ...found.lesson } : EMPTY_LESSON);
        setTranscript(found?.transcript ?? '');
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Unable to load the lesson'))
      .finally(() => setLoading(false));
  }, [videoId]);

  if (!video) return null;

  const patch = (changes: Partial<AILessonContent>) => setLesson((l) => ({ ...l, ...changes }));
  const quizValid = lesson.quiz.every((q) => q.question.trim() && q.ideal_answer.trim());
  const canEnable = lesson.quiz.length >= MIN_QUESTIONS;
  const formValid = quizValid && (!enabled || canEnable) && threshold >= 1 && threshold <= 100;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!video) return;
    const payload = {
      module: video.id,
      enabled,
      pass_threshold: threshold,
      lesson,
      transcript,
    };
    setSaving(true);
    const ok = await run(
      () => (existing ? updateAILesson(existing.id, payload) : createAILesson(payload)),
      existing ? 'AI lesson saved' : 'AI lesson created'
    );
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Modal
      open
      title="AI Test lesson"
      subtitle={video.title}
      onClose={onClose}
      contentClassName="max-w-[760px]"
    >
      {loading ? (
        <p className="py-6 text-center text-sm text-slate-500">Loading…</p>
      ) : loadError ? (
        <p className="py-6 text-center text-sm text-red-600">{loadError}</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          {!existing && (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 dark:border-white/15 dark:text-white/50">
              This video has no AI lesson, so there is no AI test. Write the lesson below
              (at least {MIN_QUESTIONS} questions) and switch the test on.
            </p>
          )}

          <div className={GROUP}>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
              <input
                type="checkbox"
                checked={enabled}
                disabled={!canEnable && !enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
              Require the AI test for this video
            </label>
            <p className="text-xs text-slate-500 dark:text-white/50">
              {enabled
                ? existing?.enabled && existing.required_since
                  ? `Required since ${new Date(existing.required_since).toLocaleDateString()}. Agents who finished the quiz before then stay complete.`
                  : 'Agents who pass the quiz from now on must also pass the AI test. Agents already complete stay complete.'
                : canEnable
                  ? 'Off: the video completes when its quiz is passed.'
                  : `Add at least ${MIN_QUESTIONS} questions to switch the AI test on.`}
            </p>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-white/80">
              Pass mark
              <input
                type="number"
                min={1}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className={`${INPUT} w-20`}
              />
              / 100 average
            </label>
          </div>

          <label className="block space-y-1">
            <span className={LEGEND}>Summary</span>
            <Textarea
              rows={3}
              value={lesson.summary}
              onChange={(e) => patch({ summary: e.target.value })}
            />
          </label>

          <LinesField
            label="Learning objectives"
            value={lesson.learning_objectives}
            onChange={(v) => patch({ learning_objectives: v })}
          />
          <LinesField
            label="Key concepts"
            value={lesson.key_concepts}
            onChange={(v) => patch({ key_concepts: v })}
          />

          <fieldset className={GROUP}>
            <legend className={LEGEND}>Sections</legend>
            {lesson.sections.map((section, i) => (
              <div key={i} className="space-y-1 border-b border-slate-200 pb-2 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <input
                    className={INPUT}
                    placeholder="Heading"
                    value={section.heading}
                    onChange={(e) =>
                      patch({
                        sections: lesson.sections.map((s, j) =>
                          j === i ? { ...s, heading: e.target.value } : s
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className={REMOVE}
                    aria-label={`Remove section ${i + 1}`}
                    onClick={() => patch({ sections: lesson.sections.filter((_, j) => j !== i) })}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Textarea
                  rows={3}
                  placeholder="What the trainer teaches in this part"
                  value={section.content}
                  onChange={(e) =>
                    patch({
                      sections: lesson.sections.map((s, j) =>
                        j === i ? { ...s, content: e.target.value } : s
                      ),
                    })
                  }
                />
              </div>
            ))}
            <button
              type="button"
              className={ADD}
              onClick={() => patch({ sections: [...lesson.sections, { heading: '', content: '' }] })}
            >
              + Add section
            </button>
          </fieldset>

          <LinesField
            label="Scripts and phrases (exact wording)"
            value={lesson.scripts_and_phrases}
            onChange={(v) => patch({ scripts_and_phrases: v })}
          />
          <LinesField
            label="Common mistakes"
            value={lesson.common_mistakes}
            onChange={(v) => patch({ common_mistakes: v })}
          />

          <fieldset className={GROUP}>
            <legend className={LEGEND}>
              Question bank · {lesson.quiz.length} (Sophia picks 3–5 and may rephrase)
            </legend>
            {lesson.quiz.map((item, i) => (
              <div key={i} className="space-y-1 border-b border-slate-200 pb-2 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <input
                    className={INPUT}
                    placeholder="Question"
                    value={item.question}
                    onChange={(e) =>
                      patch({
                        quiz: lesson.quiz.map((q, j) =>
                          j === i ? { ...q, question: e.target.value } : q
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className={REMOVE}
                    aria-label={`Remove question ${i + 1}`}
                    onClick={() => patch({ quiz: lesson.quiz.filter((_, j) => j !== i) })}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Textarea
                  rows={2}
                  placeholder="Ideal answer"
                  value={item.ideal_answer}
                  onChange={(e) =>
                    patch({
                      quiz: lesson.quiz.map((q, j) =>
                        j === i ? { ...q, ideal_answer: e.target.value } : q
                      ),
                    })
                  }
                />
                <LinesField
                  label="Must mention"
                  rows={2}
                  value={item.must_mention}
                  onChange={(v) =>
                    patch({
                      quiz: lesson.quiz.map((q, j) => (j === i ? { ...q, must_mention: v } : q)),
                    })
                  }
                />
              </div>
            ))}
            <button
              type="button"
              className={ADD}
              onClick={() =>
                patch({
                  quiz: [...lesson.quiz, { question: '', ideal_answer: '', must_mention: [] }],
                })
              }
            >
              <Plus className="mr-1 inline h-3 w-3" />
              Add question
            </button>
          </fieldset>

          <div className="space-y-1">
            <button type="button" className={ADD} onClick={() => setShowTranscript((v) => !v)}>
              {showTranscript ? 'Hide' : 'Show'} trainer transcript (
              {transcript.length.toLocaleString()} characters)
            </button>
            {showTranscript && (
              <Textarea
                rows={10}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
            )}
            <p className="text-xs text-slate-500 dark:text-white/50">
              The grader treats the transcript as the source of truth.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !formValid}>
              {saving ? 'Saving…' : 'Save lesson'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
