import React from 'react';
import SecureSlidePlayer from '@/features/systematic-tools/components/secure-slide-player';
import PdfAnnotator from '@/features/systematic-tools/components/pdf-annotator';

export const isSlidesUrl = (src: string) =>
  typeof src === 'string' &&
  (src.includes('/pubembed') ||
    src.includes('/embed') ||
    src.includes('docs.google.com/presentation'));

// Convert any pasted Google Slides URL into a frame-safe embed URL.
// Users may paste the deck in several forms; only the embed forms render
// inside an <iframe>:
//   - /d/e/{PUB_ID}/pubembed  — "Publish to web" embed (already frame-safe)
//   - /d/{FILE_ID}/embed      — standard embed form
//   - /d/{FILE_ID}/edit|present|view — editor/viewer links that Google
//     REFUSES to frame; these must be rewritten to /embed. Note the deck's
//     sharing must be "anyone with the link" for the embed to render.
export const toEmbeddableSlidesUrl = (src: string) => {
  if (typeof src !== 'string') return src;
  if (!src.includes('docs.google.com/presentation')) return src;
  // Already an embed form — leave it (and its query params) untouched.
  if (src.includes('/pubembed') || src.includes('/embed')) return src;

  const params = 'start=false&loop=false&delayms=3000';

  // Published-to-web link: /d/e/{PUB_ID}/pub -> /d/e/{PUB_ID}/pubembed
  const pubMatch = src.match(/\/presentation\/d\/e\/([^/]+)/);
  if (pubMatch) {
    return `https://docs.google.com/presentation/d/e/${pubMatch[1]}/pubembed?${params}`;
  }

  // Standard file link: /d/{FILE_ID}/edit|present|view -> /d/{FILE_ID}/embed
  const fileMatch = src.match(/\/presentation\/d\/([^/]+)/);
  if (fileMatch) {
    return `https://docs.google.com/presentation/d/${fileMatch[1]}/embed?${params}`;
  }

  return src;
};

export const isPdfUrl = (src: string) =>
  typeof src === 'string' &&
  (src.includes('/preview') ||
    src.includes('drive.google.com') ||
    src.toLowerCase().includes('.pdf'));

// True when the PDF can be fetched directly by pdf.js (CORS-friendly hosts
// like Firebase Storage or any URL ending in .pdf). Google Drive /preview
// URLs are NOT fetchable cross-origin — they only render inside an iframe —
// so we fall back to the iframe path for those.
export const isDirectPdfUrl = (src: string) => {
  if (typeof src !== 'string') return false;
  if (src.includes('drive.google.com')) return false;
  return src.toLowerCase().includes('.pdf');
};

// Normalize a PDF source URL for embedding in an <iframe>.
// - Google Drive: keep the /preview URL as-is. Rewriting to /uc?export=download
//   breaks for owner-restricted files ("Sorry, the owner hasn't given you
//   permission to download this file"). Drive's preview viewer still works.
// - Direct .pdf URLs (e.g. Firebase Storage): returned unchanged so the
//   browser's built-in PDF.js viewer (with text/draw annotation tools) loads.
export const toEmbeddablePdfUrl = (src: string) => {
  if (typeof src !== 'string') return src;
  const driveMatch = src.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    const fileId = driveMatch[1];
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return src;
};

interface FullscreenViewerProps {
  isOpen: boolean;
  src: string;
  title: string;
  onClose: () => void;
  allowDownload?: boolean;
  httpHeaders?: Record<string, string>;
  forcePdf?: boolean;
}

const FullscreenViewer: React.FC<FullscreenViewerProps> = ({
  isOpen,
  src,
  title,
  onClose,
  allowDownload = false,
  httpHeaders,
  forcePdf = false,
}) => {
  if (!isOpen) return null;

  const slides = isSlidesUrl(src);
  const slidesSrc = slides ? toEmbeddableSlidesUrl(src) : src;
  const pdf = forcePdf || isPdfUrl(src);
  const directPdf = pdf && (src.includes('drive.google.com') ? false : forcePdf || isDirectPdfUrl(src));

  const handleDownload = async () => {
    if (!allowDownload) return;
    const downloadUrl = src.includes('?') ? `${src}&download=1` : `${src}?download=1`;
    const target = httpHeaders ? downloadUrl : src;
    try {
      const response = await fetch(target, { headers: httpHeaders });
      if (!response.ok) return;
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = title.toLowerCase().endsWith('.pdf') ? title : `${title}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(src, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#cfcfcf',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: slides ? '#000' : '#cfcfcf',
        }}
      >
        {/* Title in the top center bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            textAlign: 'center',
            padding: '6px 0',
            color: '#222',
            fontSize: 14,
            fontWeight: 500,
            pointerEvents: 'none',
            zIndex: pdf ? 0 : 10000,
          }}
        >
          {title}
        </div>

        {/* Close button */}
        <button
          aria-label="Close"
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 12,
            right: 16,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'rgba(0,0,0,0.65)',
            color: '#fff',
            fontSize: 26,
            fontWeight: 700,
            cursor: 'pointer',
            zIndex: 10001,
            lineHeight: 1,
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          ×
        </button>

        {allowDownload ? (
          <button
            aria-label="Download"
            onClick={() => void handleDownload()}
            style={{
              position: 'fixed',
              top: 12,
              right: 64,
              height: 40,
              padding: '0 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'rgba(0,0,0,0.65)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              zIndex: 10001,
              borderRadius: 999,
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}
          >
            Download
          </button>
        ) : null}

        {slides ? (
          <SecureSlidePlayer embedSrc={slidesSrc} fillContainer />
        ) : directPdf ? (
          <PdfAnnotator src={src} httpHeaders={httpHeaders} />
        ) : pdf ? (
          <SecureSlidePlayer
            embedSrc={toEmbeddablePdfUrl(src)}
            fillContainer
            iframeSandbox={null}
          />
        ) : (
          <video
            title={title || 'Embedded content'}
            src={src}
            className="vault-embedded-video"
            controls
            playsInline
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>
    </div>
  );
};

export default FullscreenViewer;
