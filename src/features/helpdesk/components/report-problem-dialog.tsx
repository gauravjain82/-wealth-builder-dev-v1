/**
 * "Report a problem" dialog: category, subject, description, an optional screenshot
 * (remove / retake), up to three images (picker or paste), and an opt-out for the
 * allow-listed page details, which are shown verbatim under "What's included".
 */

import { useRef, useState, type ClipboardEvent, type FormEvent, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useNavigate } from 'react-router-dom';
import { Camera, ChevronDown, ChevronRight, ImagePlus, Loader2, X } from 'lucide-react';

import { useToastStore } from '@/store';

import { HELPDESK_CATEGORY_OPTIONS } from '../constants';
import { useCreateMyTicket } from '../hooks/use-my-tickets';
import {
  HelpdeskApiError,
  type HelpdeskCategory,
  type SupportContextPayload,
} from '../services/helpdesk-service';
import {
  IMAGE_ACCEPT,
  MAX_ATTACHMENTS,
  checkNewAttachments,
  imagesFromClipboard,
} from '../support-context/attachment-rules';
import { captureScreenshot } from '../support-context/capture-screenshot';
import { useSupportContext } from '../support-context/collect-support-context';
import { LocalFileThumb } from './attachment-strip';

const INPUT =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 dark:border-white/20 dark:bg-black/30 dark:text-white dark:placeholder:text-white/50';

/** Wait for the browser to paint (twice, so a just-hidden dialog is really gone). */
function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

interface ReportProblemDialogProps {
  /** Screenshot taken before the dialog opened, if any. */
  initialScreenshot: File | null;
  /** Page context snapshot taken when the dialog opened. */
  context: SupportContextPayload;
  onClose: () => void;
}

/** Field error line under an input. */
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600 dark:text-red-300">{message}</p>;
}

/** The dialog itself; mounted only while open, so each opening starts fresh. */
export function ReportProblemDialog({ initialScreenshot, context, onClose }: ReportProblemDialogProps) {
  const navigate = useNavigate();
  const addToast = useToastStore((state) => state.addToast);
  const createTicket = useCreateMyTicket();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<HelpdeskCategory>('other');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(initialScreenshot);
  const [images, setImages] = useState<File[]>([]);
  const [includeContext, setIncludeContext] = useState(true);
  const [showIncluded, setShowIncluded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [retaking, setRetaking] = useState(false);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<HelpdeskApiError | Error | null>(null);

  const attachedCount = images.length + (screenshot ? 1 : 0);
  const fieldErrors = submitError instanceof HelpdeskApiError ? submitError.fieldErrors : {};

  /** Add picked or pasted images, enforcing type/size/count rules. */
  const addImages = (files: File[]) => {
    if (files.length === 0) return;
    const { accepted, errors } = checkNewAttachments(attachedCount, files);
    setFileErrors(errors);
    if (accepted.length) setImages((current) => [...current, ...accepted]);
  };

  /** Hide the dialog, capture the page again, then show the dialog. */
  const retake = async () => {
    if (!screenshot && attachedCount >= MAX_ATTACHMENTS) {
      setFileErrors([`You can attach up to ${MAX_ATTACHMENTS} images. Remove one first.`]);
      return;
    }
    setRetaking(true);
    setHidden(true);
    await nextPaint();
    const shot = await captureScreenshot();
    setHidden(false);
    setRetaking(false);
    if (shot) {
      setScreenshot(shot);
      setFileErrors([]);
    } else {
      setFileErrors(['Could not capture a screenshot of this page. You can attach images instead.']);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const pasted = imagesFromClipboard(event.clipboardData);
    if (pasted.length === 0) return;
    event.preventDefault();
    addImages(pasted);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!description.trim() || createTicket.isPending) return;
    setSubmitError(null);
    const attachments = [...(screenshot ? [screenshot] : []), ...images];
    createTicket.mutate(
      {
        category,
        subject: subject.trim(),
        description: description.trim(),
        context: includeContext ? context : null,
        attachments,
      },
      {
        onSuccess: (ticket) => {
          addToast({
            type: 'success',
            message: `Ticket ${ticket.ticket_number} created`,
            duration: 8000,
            action: {
              label: 'View ticket',
              onClick: () => navigate(`/helpdesk?ticket=${encodeURIComponent(ticket.ticket_number)}`),
            },
          });
          onClose();
        },
        onError: (error) => setSubmitError(error),
      }
    );
  };

  const hiddenClass = hidden ? ' invisible' : '';

  return (
    <Dialog.Root open onOpenChange={(next) => !next && !retaking && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          data-support-dialog=""
          className={`fixed inset-0 z-[1150] bg-slate-900/40 dark:bg-black/60${hiddenClass}`}
        />
        <Dialog.Content
          data-support-dialog=""
          onPaste={handlePaste}
          onInteractOutside={(event) => event.preventDefault()}
          className={`fixed left-1/2 top-1/2 z-[1160] flex max-h-[90vh] w-[min(640px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-white/10 dark:bg-[#141925] dark:text-white${hiddenClass}`}
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
            <div>
              <Dialog.Title className="text-base font-bold">Report a problem</Dialog.Title>
              <Dialog.Description className="text-xs text-slate-600 dark:text-white/65">
                Tell us what went wrong. You can paste images straight into this window.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close" className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-auto px-4 py-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-xs font-medium">
                  Category
                  <select value={category} onChange={(e) => setCategory(e.target.value as HelpdeskCategory)} className={`${INPUT} mt-1`}>
                    {HELPDESK_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-white text-slate-900 dark:bg-[#0f131c] dark:text-white">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <FieldError message={fieldErrors.category} />
                </label>
                <label className="block text-xs font-medium">
                  Subject
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={200}
                    placeholder="Short summary"
                    className={`${INPUT} mt-1`}
                  />
                  <FieldError message={fieldErrors.subject} />
                </label>
              </div>

              <label className="block text-xs font-medium">
                What happened? <span className="text-red-500">*</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  required
                  placeholder="What were you trying to do, and what did you see instead?"
                  className={`${INPUT} mt-1`}
                />
                <FieldError message={fieldErrors.description} />
              </label>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium">
                    Images ({attachedCount}/{MAX_ATTACHMENTS})
                  </span>
                  <div className="flex gap-2">
                    <SmallButton onClick={() => void retake()} disabled={retaking}>
                      {retaking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                      {screenshot ? 'Retake' : 'Take screenshot'}
                    </SmallButton>
                    <SmallButton onClick={() => fileInputRef.current?.click()} disabled={attachedCount >= MAX_ATTACHMENTS}>
                      <ImagePlus className="h-3.5 w-3.5" /> Add images
                    </SmallButton>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={IMAGE_ACCEPT}
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addImages(Array.from(e.target.files ?? []));
                        e.target.value = '';
                      }}
                    />
                  </div>
                </div>
                {screenshot || images.length ? (
                  <div className="flex flex-wrap gap-3">
                    {screenshot ? (
                      <div className="flex flex-col items-center gap-1">
                        <LocalFileThumb file={screenshot} className="h-24 w-40" onRemove={() => setScreenshot(null)} />
                        <span className="text-[10px] text-slate-500 dark:text-white/55">
                          Screenshot ·{' '}
                          <button type="button" className="underline" onClick={() => setScreenshot(null)}>
                            Remove
                          </button>
                        </span>
                      </div>
                    ) : null}
                    {images.map((file, index) => (
                      <LocalFileThumb
                        key={`${file.name}-${index}`}
                        file={file}
                        className="h-24 w-28"
                        onRemove={() => setImages((current) => current.filter((_, i) => i !== index))}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-white/55">No images attached. PNG, JPEG or WebP, up to 5 MB each.</p>
                )}
                {fileErrors.map((message) => (
                  <p key={message} className="text-xs text-red-600 dark:text-red-300">{message}</p>
                ))}
                <FieldError message={fieldErrors.attachments} />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-black/20">
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input type="checkbox" checked={includeContext} onChange={(e) => setIncludeContext(e.target.checked)} />
                  Include page details (page address, browser, recent errors)
                </label>
                <button
                  type="button"
                  onClick={() => setShowIncluded((current) => !current)}
                  aria-expanded={showIncluded}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-slate-600 underline-offset-2 hover:underline dark:text-white/70"
                >
                  {showIncluded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  What&apos;s included
                </button>
                {showIncluded ? (
                  includeContext ? (
                    <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-white p-2 font-mono text-[11px] dark:bg-black/40">
                      {JSON.stringify(context, null, 2)}
                    </pre>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500 dark:text-white/55">No page details will be sent.</p>
                  )
                ) : null}
              </div>

              {submitError ? (
                <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-100">
                  {submitError.message}
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-white/10">
              <Dialog.Close asChild>
                <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:border-white/25 dark:hover:bg-white/10">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={createTicket.isPending || !description.trim()}
                className="rounded-lg bg-[#f5d66a] px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createTicket.isPending ? 'Sending...' : 'Send report'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Compact outline button used in the images row. */
function SmallButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
    >
      {children}
    </button>
  );
}

/** What a launcher's trigger receives. */
export interface ReportProblemTriggerProps {
  /** Capture (when enabled) and open the dialog. */
  start: () => void;
  /** True while the pre-open screenshot is being taken. */
  busy: boolean;
}

interface ReportProblemLauncherProps {
  /** Take a screenshot before opening (true for the header button). */
  captureOnOpen?: boolean;
  children: (props: ReportProblemTriggerProps) => ReactNode;
}

/**
 * Owns the open/close flow: snapshots the page context and (optionally) a screenshot
 * BEFORE the dialog opens, so neither shows the dialog. Must render inside the router.
 */
export function ReportProblemLauncher({ captureOnOpen = true, children }: ReportProblemLauncherProps) {
  const buildContext = useSupportContext();
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<{ id: number; screenshot: File | null; context: SupportContextPayload } | null>(null);

  const start = async () => {
    if (busy || session) return;
    setBusy(true);
    const context = buildContext();
    const screenshot = captureOnOpen ? await captureScreenshot() : null;
    setBusy(false);
    setSession({ id: Date.now(), screenshot, context });
  };

  return (
    <>
      {children({ start: () => void start(), busy })}
      {session ? (
        <ReportProblemDialog
          key={session.id}
          initialScreenshot={session.screenshot}
          context={session.context}
          onClose={() => setSession(null)}
        />
      ) : null}
    </>
  );
}
