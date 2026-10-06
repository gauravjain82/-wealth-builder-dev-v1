import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button, ConfirmationDialog, Modal, Textarea } from '@/shared/components';
import { cn } from '@core/utils';
import { useContentAction, useReorder } from '../hooks/use-promotion-admin';
import {
  createQuizQuestion,
  deleteQuizQuestion,
  updateQuizQuestion,
} from '../services/promotion-admin-service';
import type { AdminQuizQuestion, AdminVideo } from '../types';
import { SortableList } from './sortable-list';

interface QuizEditorModalProps {
  /** The video whose quiz is open, read from the live tree so it refreshes after saves. */
  video: AdminVideo | null;
  onClose: () => void;
}

/** `null` = no form; `'new'` = adding; a question = editing it. */
type Draft = null | 'new' | AdminQuizQuestion;

const EMPTY_OPTIONS = ['', ''];

export function QuizEditorModal({ video, onClose }: QuizEditorModalProps) {
  const run = useContentAction();
  const reorder = useReorder();
  const [draft, setDraft] = useState<Draft>(null);
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(EMPTY_OPTIONS);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminQuizQuestion | null>(null);

  const videoId = video?.id;
  useEffect(() => {
    setDraft(null);
  }, [videoId]);

  useEffect(() => {
    if (draft === null) return;
    const editing = draft === 'new' ? null : draft;
    setQuestionText(editing?.question_text ?? '');
    setOptions(editing ? [...editing.options] : [...EMPTY_OPTIONS]);
    setCorrectIndex(editing?.correct_index ?? 0);
  }, [draft]);

  if (!video) return null;
  const questions = video.quiz_questions;
  const formValid =
    questionText.trim() !== '' &&
    options.length >= 2 &&
    options.every((option) => option.trim() !== '') &&
    correctIndex < options.length;

  const removeOption = (index: number) => {
    setOptions((current) => current.filter((_, i) => i !== index));
    setCorrectIndex((current) => {
      if (index === current) return 0;
      return index < current ? current - 1 : current;
    });
  };

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!video || draft === null) return;
    const payload = {
      module: video.id,
      question_text: questionText.trim(),
      options: options.map((option) => option.trim()),
      correct_index: correctIndex,
    };
    setSaving(true);
    const ok = await run(
      () =>
        draft === 'new' ? createQuizQuestion(payload) : updateQuizQuestion(draft.id, payload),
      draft === 'new' ? 'Question added' : 'Question saved'
    );
    setSaving(false);
    if (ok) setDraft(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    await run(() => deleteQuizQuestion(deleteTarget.id), 'Question deleted');
    setSaving(false);
    if (draft !== null && draft !== 'new' && draft.id === deleteTarget.id) setDraft(null);
    setDeleteTarget(null);
  }

  return (
    <Modal
      open
      title="Quiz"
      subtitle={video.title}
      onClose={onClose}
      contentClassName="max-w-[640px]"
    >
      <div className="space-y-4">
        {questions.length === 0 && draft === null && (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/50">
            No quiz yet. Agents complete this video by watching it. Add a question to require
            a quiz as well.
          </p>
        )}

        {questions.length > 0 && (
          <SortableList
            items={questions}
            className="space-y-2"
            itemLabel={(question) => question.question_text}
            onReorder={(ids) => reorder.mutate({ kind: 'questions', parentId: video.id, ids })}
            renderItem={(question, handle) => (
              <div
                className={cn(
                  'flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-white/[0.03]',
                  draft !== null && draft !== 'new' && draft.id === question.id &&
                    'border-amber-300 dark:border-[rgba(255,215,0,.45)]'
                )}
              >
                {handle}
                <div className="min-w-0 flex-1 py-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {question.question_text}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-white/50">
                    {question.options.length} options · Answer:{' '}
                    <span className="text-emerald-700 dark:text-emerald-300">
                      {question.options[question.correct_index] ?? '—'}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDraft(question)}
                  aria-label={`Edit question: ${question.question_text}`}
                  className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(question)}
                  aria-label={`Delete question: ${question.question_text}`}
                  className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-400/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          />
        )}

        {draft === null ? (
          <Button type="button" variant="secondary" onClick={() => setDraft('new')}>
            <Plus className="h-4 w-4" /> Add question
          </Button>
        ) : (
          <form
            onSubmit={handleSave}
            className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {draft === 'new' ? 'New question' : 'Edit question'}
            </p>
            <Textarea
              aria-label="Question"
              placeholder="Type the question…"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={2}
              autoFocus
            />
            <fieldset className="space-y-2">
              <legend className="mb-1 text-xs font-medium text-slate-500 dark:text-white/50">
                Options — select the correct answer
              </legend>
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="promo-quiz-correct"
                    checked={correctIndex === index}
                    onChange={() => setCorrectIndex(index)}
                    aria-label={`Option ${index + 1} is correct`}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <input
                    type="text"
                    value={option}
                    placeholder={`Option ${index + 1}`}
                    aria-label={`Option ${index + 1}`}
                    onChange={(e) =>
                      setOptions((current) =>
                        current.map((value, i) => (i === index ? e.target.value : value))
                      )
                    }
                    className={cn(
                      'h-9 flex-1 rounded-md border bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-300/50 dark:bg-white/5 dark:text-white',
                      correctIndex === index
                        ? 'border-emerald-400 dark:border-emerald-400/60'
                        : 'border-slate-300 dark:border-white/15'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    disabled={options.length <= 2}
                    aria-label={`Remove option ${index + 1}`}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-200 disabled:opacity-30 dark:text-white/40 dark:hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {options.length < 6 && (
                <button
                  type="button"
                  onClick={() => setOptions((current) => [...current, ''])}
                  className="text-xs font-medium text-amber-700 hover:underline dark:text-[#ffd700]"
                >
                  + Add option
                </button>
              )}
            </fieldset>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !formValid}>
                {saving ? 'Saving…' : 'Save question'}
              </Button>
            </div>
          </form>
        )}
      </div>

      <ConfirmationDialog
        open={deleteTarget !== null}
        title="Delete question?"
        message={`“${deleteTarget?.question_text ?? ''}” will be removed from this quiz.`}
        confirmText="Delete"
        loading={saving}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Modal>
  );
}
