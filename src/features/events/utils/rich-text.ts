/**
 * Shared helpers for organizer rich text (About, Notes, Refund policy, …).
 *
 * The backend sanitizes this HTML on write and on read
 * (`events/services/rich_text.py`); these helpers only decide *how* to render
 * a value. Legacy rows hold plain text, which must keep rendering as escaped
 * text with its line breaks, never as HTML.
 */

/** Mirrors the backend's `looks_like_html`: any tag-like sequence. */
const TAG_RE = /<[a-zA-Z!/]/;

/** True when the value contains markup rather than plain text. */
export function looksLikeHtml(value: string | null | undefined): boolean {
  return Boolean(value) && TAG_RE.test(value as string);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Convert legacy plain text into editor HTML: blank lines split paragraphs,
 * single newlines become `<br>`. HTML values are returned unchanged.
 */
export function toEditorHtml(value: string | null | undefined): string {
  if (!value) return '';
  if (looksLikeHtml(value)) return value;
  return value
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * Typography for rendered rich text, shared by the builder editor and the
 * public page so what organizers type is what attendees see. (The project has
 * no `@tailwindcss/typography`; arbitrary variants keep it dependency-free.)
 */
export const richTextClasses = [
  '[&_p]:my-2',
  '[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-bold',
  '[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold',
  '[&_h4]:mb-1 [&_h4]:mt-3 [&_h4]:font-semibold',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6',
  '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6',
  '[&_li]:my-0.5 [&_li>p]:my-0',
  '[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 dark:[&_blockquote]:border-white/20 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:opacity-90',
  '[&_a]:underline [&_a]:underline-offset-2',
  '[&_hr]:my-4 [&_hr]:border-current [&_hr]:opacity-20',
  '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
].join(' ');
