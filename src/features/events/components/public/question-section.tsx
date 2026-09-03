/**
 * Public "Ask a question" form on the event landing page.
 *
 * Unauthenticated: the asker supplies their own name/email so the organizer can
 * reply by email. Posts to the public questions endpoint and shows a thank-you
 * on success. Keeps its own local state; the landing page just renders it.
 */

import { useState } from 'react';
import { publicEventService } from '../../services/public-event-service';
import { PublicApiError } from '../../services/public-event-service';
import { PUBLIC_FIELD_CLASS } from '../../utils/public-brand';
import { BrandButton, PublicAlert, PublicCard, PublicField, PublicSection } from './public-event-shell';

interface QuestionSectionProps {
  shortcut: string;
  contactEmail?: string;
}

export function QuestionSection({ shortcut, contactEmail }: QuestionSectionProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await publicEventService.submitQuestion(shortcut, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      setSent(true);
    } catch (err) {
      setError(
        err instanceof PublicApiError ? err.message : 'Could not send your question. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicSection title="Have a Question?">
      <PublicCard>
        {sent ? (
          <PublicAlert
            tone="info"
            message="Thanks! Your question was sent to the organizer — they'll reply by email."
          />
        ) : (
          <form className="space-y-3" onSubmit={submit}>
            {error ? <PublicAlert message={error} /> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <PublicField label="Your name" required>
                <input className={PUBLIC_FIELD_CLASS} value={name} onChange={(e) => setName(e.target.value)} />
              </PublicField>
              <PublicField label="Email" required>
                <input
                  type="email"
                  className={PUBLIC_FIELD_CLASS}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </PublicField>
              <PublicField label="Phone">
                <input className={PUBLIC_FIELD_CLASS} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </PublicField>
              <PublicField label="Subject">
                <input className={PUBLIC_FIELD_CLASS} value={subject} onChange={(e) => setSubject(e.target.value)} />
              </PublicField>
            </div>
            <PublicField label="Question" required>
              <textarea
                className={PUBLIC_FIELD_CLASS}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </PublicField>
            <div className="flex items-center gap-3">
              <BrandButton type="submit" disabled={submitting || !name.trim() || !email.trim() || !message.trim()}>
                {submitting ? 'Sending…' : 'Send question'}
              </BrandButton>
              {contactEmail ? (
                <span className="text-xs text-slate-500 dark:text-white/50">or email {contactEmail}</span>
              ) : null}
            </div>
          </form>
        )}
      </PublicCard>
    </PublicSection>
  );
}
