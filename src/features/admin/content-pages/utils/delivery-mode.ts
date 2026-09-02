export type DeliveryMode = 'link' | 'upload';

type BlobBearing = {
  gcs_blob_name?: string;
  thumb_gcs_blob_name?: string;
  href?: string;
};

export function inferDeliveryMode(item?: BlobBearing | null): DeliveryMode {
  if (!item) return 'link';
  if (item.gcs_blob_name) return 'upload';
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

function blobBasename(blob?: string, fallback = 'Uploaded file'): string | undefined {
  if (!blob) return undefined;
  const parts = blob.split('/');
  return parts[parts.length - 1] || fallback;
}

export function existingDocumentLabel(item?: BlobBearing | null): string | undefined {
  return blobBasename(item?.gcs_blob_name);
}

export function existingThumbnailLabel(item?: BlobBearing | null): string | undefined {
  return blobBasename(item?.thumb_gcs_blob_name, 'Uploaded thumbnail');
}

export function isPdfLike(
  resourceType: string,
  stagedFile?: File | null,
  blobName?: string
): boolean {
  return (
    resourceType === 'pdf' ||
    Boolean(stagedFile?.name.toLowerCase().endsWith('.pdf')) ||
    Boolean(blobName?.toLowerCase().endsWith('.pdf'))
  );
}
