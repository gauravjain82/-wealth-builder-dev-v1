import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ExternalLink,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
  VideoOff,
} from 'lucide-react';
import { Button, ConfirmationDialog, ErrorState, LoadingState } from '@/shared/components';
import { cn } from '@core/utils';
import { QuizEditorModal } from '../components/quiz-editor-modal';
import { SkillFormModal } from '../components/skill-form-modal';
import { SortableList } from '../components/sortable-list';
import { VideoFormModal } from '../components/video-form-modal';
import { useContentAction, usePromotionContent, useReorder } from '../hooks/use-promotion-admin';
import { deleteSkill, deleteVideo } from '../services/promotion-admin-service';
import { SKILL_TAG_LABELS, type AdminSkill, type AdminVideo } from '../types';

type DeleteTarget = { kind: 'skill'; skill: AdminSkill } | { kind: 'video'; video: AdminVideo };

const ICON_BUTTON =
  'rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10';
const DANGER_ICON_BUTTON =
  'rounded p-1.5 text-red-500 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-400/10';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Promotion Management — the in-app replacement for editing promotion content in Django
 * admin. One screen per track: skills in dashboard order, each with its videos and quiz.
 * Everything is drag-to-reorder; moving a skill or video is done from its edit form.
 */
export default function AdminPromotionPage() {
  const { data: tracks = [], isLoading, isError, error, refetch } = usePromotionContent();
  const run = useContentAction();
  const reorder = useReorder();

  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [skillForm, setSkillForm] = useState<{ editing: AdminSkill | null } | null>(null);
  const [videoForm, setVideoForm] = useState<{
    editing: AdminVideo | null;
    skillId: number | null;
  } | null>(null);
  const [quizVideoId, setQuizVideoId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const track = tracks.find((t) => t.id === selectedTrackId) ?? tracks[0] ?? null;
  // Looked up from the live tree, so the quiz modal shows each save as it lands.
  const quizVideo = useMemo(() => {
    for (const t of tracks)
      for (const skill of t.skills)
        for (const video of skill.modules) if (video.id === quizVideoId) return video;
    return null;
  }, [tracks, quizVideoId]);

  const toggleCollapsed = (skillId: number) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(skillId)) next.delete(skillId);
      else next.add(skillId);
      return next;
    });

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await (deleteTarget.kind === 'skill'
      ? run(() => deleteSkill(deleteTarget.skill.id), 'Skill deleted')
      : run(() => deleteVideo(deleteTarget.video.id), 'Video deleted'));
    setDeleting(false);
    setDeleteTarget(null);
  }

  const heading = 'Promotion Management';
  const description =
    'Skills and training videos agents work through on their Promotion dashboard, in the order they see them.';

  if (isLoading) {
    return <LoadingState className="p-6" pageHeading={heading} pageDescription={description} />;
  }
  if (isError) {
    return (
      <ErrorState
        className="p-6"
        pageHeading={heading}
        pageDescription={description}
        description={error instanceof Error ? error.message : 'Could not load promotion content.'}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{heading}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-white/60">
            {description} Drag <span aria-hidden>⠿</span> to reorder.
          </p>
        </div>
        {track && (
          <Button onClick={() => setSkillForm({ editing: null })}>
            <Plus className="h-4 w-4" /> Add skill
          </Button>
        )}
      </div>

      {tracks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/50">
          No promotion tracks exist yet. Tracks are tied to rank levels and are created by the
          platform team.
        </p>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Promotion track"
            className="mb-5 flex gap-2 overflow-x-auto pb-1"
          >
            {tracks.map((t) => {
              const active = t.id === track?.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedTrackId(t.id)}
                  className={cn(
                    'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-[rgba(255,215,0,.45)] dark:bg-[rgba(255,215,0,.18)] dark:text-[#ffd700]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5'
                  )}
                >
                  {t.name}
                  <span className="ml-2 text-xs opacity-60">{t.skills.length}</span>
                </button>
              );
            })}
          </div>

          {track && track.skills.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/50">
              No skills on this track yet. Use <strong>Add skill</strong> to create the first one.
            </p>
          )}

          {track && track.skills.length > 0 && (
            <SortableList
              items={track.skills}
              className="space-y-3"
              itemLabel={(skill) => skill.label}
              onReorder={(ids) => reorder.mutate({ kind: 'skills', parentId: track.id, ids })}
              renderItem={(skill, handle) => {
                const open = !collapsed.has(skill.id);
                const pending = skill.modules.filter((video) => !video.video_url).length;
                return (
                  <section className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex flex-wrap items-center gap-2 px-2 py-2">
                      {handle}
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(skill.id)}
                        aria-expanded={open}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 shrink-0 text-slate-400 transition-transform',
                            !open && '-rotate-90'
                          )}
                        />
                        <span className="truncate font-semibold text-slate-900 dark:text-white">
                          {skill.label}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                            skill.tag === 'action'
                              ? 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200'
                              : 'bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200'
                          )}
                        >
                          {SKILL_TAG_LABELS[skill.tag]}
                        </span>
                        <span className="shrink-0 text-xs text-slate-500 dark:text-white/50">
                          {plural(skill.modules.length, 'video')}
                          {pending > 0 && (
                            <span className="text-amber-600 dark:text-amber-300">
                              {' '}
                              · {pending} pending
                            </span>
                          )}
                        </span>
                      </button>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setVideoForm({ editing: null, skillId: skill.id })}
                        >
                          <Plus className="h-3.5 w-3.5" /> Video
                        </Button>
                        <button
                          type="button"
                          className={ICON_BUTTON}
                          onClick={() => setSkillForm({ editing: skill })}
                          aria-label={`Edit or move skill ${skill.label}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={DANGER_ICON_BUTTON}
                          onClick={() => setDeleteTarget({ kind: 'skill', skill })}
                          aria-label={`Delete skill ${skill.label}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {open && (
                      <div className="border-t border-slate-100 px-2 py-2 dark:border-white/5">
                        {skill.modules.length === 0 ? (
                          <p className="px-3 py-4 text-sm text-slate-500 dark:text-white/50">
                            No videos in this skill yet.
                          </p>
                        ) : (
                          <SortableList
                            items={skill.modules}
                            className="space-y-1"
                            itemLabel={(video) => video.title}
                            onReorder={(ids) =>
                              reorder.mutate({ kind: 'modules', parentId: skill.id, ids })
                            }
                            renderItem={(video, videoHandle) => (
                              <VideoRow
                                video={video}
                                position={skill.modules.indexOf(video) + 1}
                                handle={videoHandle}
                                onEdit={() => setVideoForm({ editing: video, skillId: skill.id })}
                                onQuiz={() => setQuizVideoId(video.id)}
                                onDelete={() => setDeleteTarget({ kind: 'video', video })}
                              />
                            )}
                          />
                        )}
                      </div>
                    )}
                  </section>
                );
              }}
            />
          )}
        </>
      )}

      <SkillFormModal
        open={skillForm !== null}
        tracks={tracks}
        defaultTrackId={track?.id ?? null}
        editing={skillForm?.editing ?? null}
        onClose={() => setSkillForm(null)}
      />
      <VideoFormModal
        open={videoForm !== null}
        tracks={tracks}
        defaultSkillId={videoForm?.skillId ?? null}
        editing={videoForm?.editing ?? null}
        onClose={() => setVideoForm(null)}
      />
      <QuizEditorModal video={quizVideo} onClose={() => setQuizVideoId(null)} />
      <ConfirmationDialog
        open={deleteTarget !== null}
        title={deleteTarget?.kind === 'skill' ? 'Delete skill?' : 'Delete video?'}
        message={deleteMessage(deleteTarget)}
        confirmText="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/** Deleting cascades to agents' progress on the backend, so say exactly what is lost. */
function deleteMessage(target: DeleteTarget | null): string {
  if (!target) return '';
  if (target.kind === 'video') {
    const { title, watched_count: watched } = target.video;
    return watched > 0
      ? `“${title}” and its quiz will be removed. ${plural(watched, 'agent')} who watched it will lose that progress. This cannot be undone.`
      : `“${title}” and its quiz will be removed. This cannot be undone.`;
  }
  const { label, modules } = target.skill;
  const watched = modules.reduce((sum, video) => sum + video.watched_count, 0);
  const parts = [`“${label}” and its ${plural(modules.length, 'video')} will be removed.`];
  if (watched > 0) parts.push(`Agents lose ${plural(watched, 'watched-video record')}.`);
  parts.push('Any manual completion ticks for this skill are also removed. This cannot be undone.');
  return parts.join(' ');
}

function VideoRow({
  video,
  position,
  handle,
  onEdit,
  onQuiz,
  onDelete,
}: {
  video: AdminVideo;
  position: number;
  handle: React.ReactNode;
  onEdit: () => void;
  onQuiz: () => void;
  onDelete: () => void;
}) {
  const quizCount = video.quiz_questions.length;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-slate-50 dark:hover:bg-white/[0.03]">
      {handle}
      <span className="w-5 shrink-0 text-right text-xs tabular-nums text-slate-400 dark:text-white/40">
        {position}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
          {video.title}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-white/50">
          {[video.subtitle, video.duration_label].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {video.video_url ? (
          <a
            href={video.video_url}
            target="_blank"
            rel="noreferrer"
            className={ICON_BUTTON}
            aria-label={`Open video link for ${video.title}`}
            title={video.video_url}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-400/15 dark:text-amber-200"
            title="No link yet — agents see “Pending Video”"
          >
            <VideoOff className="h-3 w-3" /> No link
          </span>
        )}
        <button
          type="button"
          onClick={onQuiz}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
            quizCount > 0
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200'
              : 'border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-white/15 dark:text-white/50 dark:hover:bg-white/10'
          )}
          aria-label={`Edit quiz for ${video.title}`}
        >
          <ListChecks className="h-3 w-3" />
          {quizCount > 0 ? `Quiz · ${quizCount}` : 'Add quiz'}
        </button>
        <button
          type="button"
          className={ICON_BUTTON}
          onClick={onEdit}
          aria-label={`Edit or move video ${video.title}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={DANGER_ICON_BUTTON}
          onClick={onDelete}
          aria-label={`Delete video ${video.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
