/**
 * AIReviewRequestModal — pick a template + its subject and request a review.
 *
 * The chosen template's `subject_type` decides the second picker: a BUILDER_PERIOD
 * template reviews the caller's metrics for a period; a SUBMISSION template reviews
 * one of the caller's submissions. The backend derives the builder (the caller) and
 * enforces all cross-field rules, so the payload is just template + subject id.
 */

import { useEffect, useMemo, useState } from 'react';
import { Button, Label, Modal, Select } from '@shared/components';
import type {
  AIReviewTemplate,
  CreateAIReviewPayload,
  PerformancePeriod,
  SubmissionSummary,
} from '../../types';

export interface AIReviewRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAIReviewPayload) => Promise<void>;
  isSubmitting: boolean;
  templates: AIReviewTemplate[];
  periods: PerformancePeriod[];
  submissions: SubmissionSummary[];
}

/** Render the request-a-review modal. */
export function AIReviewRequestModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  templates,
  periods,
  submissions,
}: AIReviewRequestModalProps) {
  const activeTemplates = useMemo(() => templates.filter((t) => t.is_active), [templates]);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);

  // Default to the first template when the modal opens / the list loads.
  useEffect(() => {
    if (open && templateId === null && activeTemplates.length > 0) {
      setTemplateId(activeTemplates[0].id);
    }
  }, [open, templateId, activeTemplates]);

  const template = activeTemplates.find((t) => t.id === templateId) ?? null;
  const isSubmission = template?.subject_type === 'SUBMISSION';

  const close = () => {
    setTemplateId(null);
    setSubjectId(null);
    onClose();
  };

  const submit = async () => {
    if (!template || subjectId === null) return;
    const payload: CreateAIReviewPayload = isSubmission
      ? { template: template.id, submission: subjectId }
      : { template: template.id, period: subjectId };
    await onSubmit(payload);
  };

  const subjectOptions = isSubmission
    ? submissions.map((s) => ({
        id: s.id,
        label: `#${s.id} · ${s.submission_type_code} (${s.state_code})`,
      }))
    : periods.map((p) => ({
        id: p.id,
        label: `${p.type} · ${p.start_date} → ${p.end_date}`,
      }));

  const noSubjects = subjectOptions.length === 0;

  return (
    <Modal open={open} onClose={close} title="Request an AI review">
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-white/70">
          The AI reviews the selected artifact and returns coaching feedback. It runs in the
          background — the result appears in the list once ready.
        </p>

        <div>
          <Label htmlFor="ai-review-template">Review type</Label>
          <Select
            id="ai-review-template"
            value={templateId ?? ''}
            onChange={(e) => {
              setTemplateId(e.target.value ? Number(e.target.value) : null);
              setSubjectId(null);
            }}
          >
            {activeTemplates.length === 0 && <option value="">No review types configured</option>}
            {activeTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          {template?.description && (
            <p className="mt-1 text-xs text-slate-500 dark:text-white/60">{template.description}</p>
          )}
        </div>

        {template && (
          <div>
            <Label htmlFor="ai-review-subject">{isSubmission ? 'Submission' : 'Period'}</Label>
            <Select
              id="ai-review-subject"
              value={subjectId ?? ''}
              onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : null)}
              disabled={noSubjects}
            >
              <option value="">
                {noSubjects
                  ? isSubmission
                    ? 'No submissions to review yet'
                    : 'No periods available yet'
                  : 'Select…'}
              </option>
              {subjectOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!template || subjectId === null || isSubmitting}>
            {isSubmitting ? 'Requesting…' : 'Request review'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
