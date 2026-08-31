import type { FileVaultItemAdmin } from '@/features/file-vault/types';
import type { DeliveryMode } from '../components/delivery-mode-selector';

export function inferDeliveryMode(item?: FileVaultItemAdmin | null): DeliveryMode {
  if (!item) return 'link';
  if (item.gcs_blob_name) return 'upload';
  if (item.href) return 'link';
  return 'link';
}

export function guessResourceTypeFromFile(file: File): string {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (mime.includes('presentation') || name.endsWith('.ppt') || name.endsWith('.pptx')) return 'ppt';
  if (mime.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return 'doc';
  if (mime.startsWith('video/')) return 'video';
  return 'link';
}

export function existingDocumentLabel(item?: FileVaultItemAdmin | null): string | undefined {
  if (!item?.gcs_blob_name) return undefined;
  const parts = item.gcs_blob_name.split('/');
  return parts[parts.length - 1] || 'Uploaded file';
}

export function existingThumbnailLabel(item?: FileVaultItemAdmin | null): string | undefined {
  if (!item?.thumb_gcs_blob_name) return undefined;
  const parts = item.thumb_gcs_blob_name.split('/');
  return parts[parts.length - 1] || 'Uploaded thumbnail';
}
