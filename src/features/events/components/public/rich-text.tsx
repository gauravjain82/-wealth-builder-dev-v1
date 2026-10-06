/**
 * Renders organizer rich text on the public pages.
 *
 * HTML values arrive already sanitized by the API (the public serializer
 * re-cleans every read against an allowlist — `events/services/rich_text.py`),
 * which is what makes `dangerouslySetInnerHTML` acceptable here. Legacy
 * plain-text values never touch innerHTML: they render as escaped text with
 * their line breaks preserved.
 */

import { cn } from '@core/utils';

import { looksLikeHtml, richTextClasses } from '../../utils/rich-text';

export function RichText({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  if (!value) return null;

  if (!looksLikeHtml(value)) {
    return <p className={cn('whitespace-pre-line', className)}>{value}</p>;
  }

  return (
    <div
      className={cn(richTextClasses, className)}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
}
