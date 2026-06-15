import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { useToastStore } from '@/store';
import {
  lookupHelpdeskTicket,
  submitHelpdeskTicket,
  type HelpdeskCategory,
  type HelpdeskTicketLookupResponse,
} from '@/features/helpdesk/services/helpdesk-service';

const CATEGORY_OPTIONS: Array<{ value: HelpdeskCategory; label: string }> = [
  { value: 'login', label: 'Cannot Login' },
  { value: 'access', label: 'Access Denied' },
  { value: 'password_reset', label: 'Password Reset' },
  { value: 'team_visibility', label: 'Cannot See Correct Team' },
  { value: 'file_visibility', label: 'Cannot See Correct Files' },
  { value: 'other', label: 'Other' },
];

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export default function HelpNeededPage() {
  const addToast = useToastStore((state) => state.addToast);
  const { user, isAuthenticated } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<HelpdeskCategory>('login');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdTicketNumber, setCreatedTicketNumber] = useState<string | null>(null);

  const [lookupTicketNumber, setLookupTicketNumber] = useState('');
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<HelpdeskTicketLookupResponse | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const resolvedName =
      user.fullName
      || user.name
      || `${user.firstName || ''} ${user.lastName || ''}`.trim()
      || user.displayName
      || '';

    if (resolvedName) setName((prev) => prev || resolvedName);
    if (user.email) {
      setEmail((prev) => prev || user.email);
      setLookupEmail((prev) => prev || user.email);
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setCreatedTicketNumber(null);

    try {
      const created = await submitHelpdeskTicket({
        name: name.trim(),
        email: email.trim(),
        category,
        subject: subject.trim(),
        description: description.trim(),
      });

      setCreatedTicketNumber(created.ticket_number);
      addToast({ type: 'success', message: `Ticket submitted: ${created.ticket_number}` });
      setSubject('');
      setDescription('');
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to submit help request.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async (event: FormEvent) => {
    event.preventDefault();
    setLookupLoading(true);
    setLookupResult(null);

    try {
      const ticket = await lookupHelpdeskTicket(lookupTicketNumber.trim(), lookupEmail.trim());
      setLookupResult(ticket);
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Ticket lookup failed.',
      });
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 dark:bg-[#0b0d12] dark:text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-amber-700 dark:text-[#f5d66a]">Help Needed?</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-white/70">
              Submit a support ticket even if you cannot sign in, then track status by ticket number + email.
            </p>
          </div>
          {isAuthenticated ? (
            <Link to="/home" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10">
              Back To Dashboard
            </Link>
          ) : (
            <Link to="/login" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10">
              Back To Login
            </Link>
          )}
        </div>

        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-300/20 dark:bg-amber-500/10 dark:text-amber-50">
          For high-priority issues that require escalation, please email your <strong>ticket number</strong>,{' '}
          <strong>phone number</strong>, and a brief description of the issue to{' '}
          <a href="mailto:website@iamawealthbuilder.com" className="font-semibold text-amber-700 underline underline-offset-2 dark:text-[#f5d66a]">
            website@iamawealthbuilder.com
          </a>.
          <p className="mt-2">
            Our team will review the request, prioritize it accordingly, and contact you as soon as possible.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
            <h2 className="mb-4 text-lg font-semibold">Create Help Request</h2>
            <form className="grid gap-3" onSubmit={handleSubmit}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 dark:border-white/20 dark:bg-black/30 dark:text-white dark:placeholder:text-white/50"
                required
                disabled={submitting}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 dark:border-white/20 dark:bg-black/30 dark:text-white dark:placeholder:text-white/50"
                required
                disabled={submitting}
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as HelpdeskCategory)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/20 dark:bg-black/30 dark:text-white"
                required
                disabled={submitting}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-white text-slate-900 dark:bg-[#0b0d12] dark:text-white">
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                maxLength={255}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 dark:border-white/20 dark:bg-black/30 dark:text-white dark:placeholder:text-white/50"
                required
                disabled={submitting}
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue"
                rows={5}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 dark:border-white/20 dark:bg-black/30 dark:text-white dark:placeholder:text-white/50"
                required
                disabled={submitting}
              />
              <button
                type="submit"
                className="rounded-lg bg-[#f5d66a] px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </form>

            {createdTicketNumber && (
              <div className="mt-4 rounded-lg border border-emerald-300/60 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-300/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                Ticket created successfully. Your ticket number is <strong>{createdTicketNumber}</strong>.
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
            <h2 className="mb-4 text-lg font-semibold">Track Existing Ticket</h2>
            <form className="grid gap-3" onSubmit={handleLookup}>
              <input
                type="text"
                value={lookupTicketNumber}
                onChange={(e) => setLookupTicketNumber(e.target.value)}
                placeholder="Ticket number (e.g. HD-A3F2C1B8)"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 dark:border-white/20 dark:bg-black/30 dark:text-white dark:placeholder:text-white/50"
                required
                disabled={lookupLoading}
              />
              <input
                type="email"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                placeholder="Submission email"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 dark:border-white/20 dark:bg-black/30 dark:text-white dark:placeholder:text-white/50"
                required
                disabled={lookupLoading}
              />
              <button
                type="submit"
                className="rounded-lg border border-amber-400/60 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#f5d66a]/40 dark:text-[#f5d66a] dark:hover:bg-[#f5d66a]/10"
                disabled={lookupLoading}
              >
                {lookupLoading ? 'Checking...' : 'Lookup Ticket'}
              </button>
            </form>

            {lookupResult && (
              <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-white/15 dark:bg-black/30">
                <div className="grid gap-1">
                  <div><strong>Ticket:</strong> {lookupResult.ticket_number}</div>
                  <div><strong>Subject:</strong> {lookupResult.subject}</div>
                  <div><strong>Category:</strong> {lookupResult.category}</div>
                  <div><strong>Status:</strong> {STATUS_LABELS[lookupResult.status] || lookupResult.status}</div>
                  <div><strong>Priority:</strong> {PRIORITY_LABELS[lookupResult.priority] || lookupResult.priority}</div>
                  <div><strong>Created:</strong> {formatDate(lookupResult.created_at)}</div>
                  <div><strong>Updated:</strong> {formatDate(lookupResult.updated_at)}</div>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">Public Comments</h3>
                  {lookupResult.comments.length === 0 ? (
                    <p className="text-slate-600 dark:text-white/60">No public comments yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {lookupResult.comments.map((comment) => (
                        <div key={comment.id} className="rounded-md border border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-white/5">
                          <div className="mb-1 text-xs text-slate-600 dark:text-white/70">
                            {(comment.author_name || 'Support Team')} - {formatDate(comment.created_at)}
                          </div>
                          <div>{comment.body}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
