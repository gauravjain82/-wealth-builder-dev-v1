/** Client-side checks mirroring the backend's helpdesk upload rules. */

/** Image types the backend accepts (it sniffs the bytes too). */
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/** `accept` attribute value for file inputs. */
export const IMAGE_ACCEPT = ALLOWED_IMAGE_TYPES.join(',');

/** Most files per ticket or reply (screenshot included). */
export const MAX_ATTACHMENTS = 3;

/** Largest file accepted: 5 MiB. */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/** Result of checking new files against what is already attached. */
export interface AttachmentCheck {
  accepted: File[];
  errors: string[];
}

/**
 * Split `incoming` into files that may be added (type, size, and total count with
 * `existingCount` already attached) and messages for the ones rejected.
 */
export function checkNewAttachments(existingCount: number, incoming: File[]): AttachmentCheck {
  const accepted: File[] = [];
  const errors: string[] = [];
  for (const file of incoming) {
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      errors.push(`${file.name}: only PNG, JPEG or WebP images can be attached.`);
    } else if (file.size > MAX_ATTACHMENT_BYTES) {
      errors.push(`${file.name}: images must be 5 MB or smaller.`);
    } else if (existingCount + accepted.length >= MAX_ATTACHMENTS) {
      errors.push(`You can attach up to ${MAX_ATTACHMENTS} images.`);
      break;
    } else {
      accepted.push(file);
    }
  }
  return { accepted, errors };
}

/** Image files from a paste event, renamed so they are stored as uploads, not screenshots. */
export function imagesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return [];
  const files: File[] = [];
  Array.from(data.items).forEach((item, index) => {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) return;
    const file = item.getAsFile();
    if (!file) return;
    const ext = file.type.split('/')[1] || 'png';
    files.push(new File([file], `pasted-${Date.now()}-${index}.${ext}`, { type: file.type }));
  });
  return files;
}
