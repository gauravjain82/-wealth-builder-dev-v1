import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// pdf.js worker — load from same package version to avoid mismatches.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// Width of the left thumbnail ("contents") panel.
const THUMB_PANEL_WIDTH = 200;
const THUMB_WIDTH = 150;

/**
 * A single page thumbnail in the left contents panel. The actual <Page> only
 * renders once it scrolls near view, so a long document doesn't render dozens
 * of thumbnails up front. Must be rendered inside a <Document>.
 */
function PdfThumbnail({
  pageNumber,
  isActive,
  onClick,
}: {
  pageNumber: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShow(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px 0px 400px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      ref={ref}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        width: '100%',
        padding: '8px 0',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
      }}
      title={`Go to page ${pageNumber}`}
    >
      <div
        style={{
          width: THUMB_WIDTH,
          minHeight: Math.round(THUMB_WIDTH * 1.294),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
          border: isActive
            ? '2px solid #4aa3ff'
            : '1px solid rgba(255,255,255,0.25)',
          boxShadow: isActive ? '0 0 0 2px rgba(74,163,255,0.4)' : 'none',
          overflow: 'hidden',
        }}
      >
        {show ? (
          <Page
            pageNumber={pageNumber}
            width={THUMB_WIDTH}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading={<div style={{ height: Math.round(THUMB_WIDTH * 1.294) }} />}
          />
        ) : (
          <div style={{ height: Math.round(THUMB_WIDTH * 1.294) }} />
        )}
      </div>
      <span
        style={{
          fontSize: 12,
          color: isActive ? '#fff' : '#cfcfcf',
          fontWeight: isActive ? 600 : 400,
        }}
      >
        {pageNumber}
      </span>
    </button>
  );
}

interface PdfAnnotatorProps {
  src: string;
}

type Stroke = {
  points: { x: number; y: number }[];
  color: string;
  size: number;
};

type TextItem = { x: number; y: number; value: string; color: string; size: number };

type PageAnnotations = { strokes: Stroke[]; texts: TextItem[] };

/**
 * PDF viewer with per-page drawing/text annotations.
 *
 * Each PDF page renders into its own <Page> element, and we overlay one
 * absolutely-positioned <canvas> per page. Drawings/texts are stored in
 * page coordinates (not screen coordinates), so they scroll and zoom with
 * the page they belong to.
 */
export default function PdfAnnotator({ src }: PdfAnnotatorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement | null>>(new Map());
  const pageSizeRef = useRef<Map<number, { width: number; height: number }>>(
    new Map()
  );
  const annotationsRef = useRef<Map<number, PageAnnotations>>(new Map());
  // Wrapper element per page so the table of contents can scroll to a page.
  const pageWrapperRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  const [numPages, setNumPages] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState(1);
  // Virtualization: only the pages near the viewport are actually rendered.
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set());
  const [pageWidth, setPageWidth] = useState(900);
  const [scale, setScale] = useState(1);
  // Track previous scale so we can rescale stored annotations when zoom changes.
  const previousScaleRef = useRef(1);

  const [drawMode, setDrawMode] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [brushSize, setBrushSize] = useState(4);
  const [brushColor, setBrushColor] = useState('#ff5252');
  const [fontSize] = useState(18);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [pendingText, setPendingText] = useState<
    { pageNumber: number; x: number; y: number; value: string } | null
  >(null);

  // Live-drawing state per page.
  const drawingRef = useRef<{ pageNumber: number; last: { x: number; y: number } } | null>(
    null
  );

  // Compute available page width so PDF fits nicely in the viewport.
  useEffect(() => {
    const updateWidth = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sidebarWidth = numPages > 0 && sidebarOpen ? THUMB_PANEL_WIDTH : 0;
      const padded = Math.max(320, rect.width - sidebarWidth - 32);
      setPageWidth(padded);
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [numPages, sidebarOpen]);

  // When the user zooms, scale all stored annotations by the same ratio so
  // they stay attached to the same logical spot on the page.
  useEffect(() => {
    const ratio = scale / previousScaleRef.current;
    if (ratio !== 1) {
      annotationsRef.current.forEach((annotations) => {
        annotations.strokes.forEach((stroke) => {
          stroke.points = stroke.points.map((point) => ({
            x: point.x * ratio,
            y: point.y * ratio,
          }));
          stroke.size *= ratio;
        });
        annotations.texts.forEach((textItem) => {
          textItem.x *= ratio;
          textItem.y *= ratio;
          textItem.size *= ratio;
        });
      });
      // Keep cached page sizes proportional so placeholder heights for
      // not-yet-rendered pages stay accurate after zooming.
      pageSizeRef.current.forEach((size, pageNumber) => {
        pageSizeRef.current.set(pageNumber, {
          width: size.width * ratio,
          height: size.height * ratio,
        });
      });
    }
    previousScaleRef.current = scale;
  }, [scale]);

  // Resize a single page's canvas to match its rendered size and replay
  // all annotations for that page.
  const syncCanvas = (pageNumber: number) => {
    const canvas = canvasRefs.current.get(pageNumber);
    const size = pageSizeRef.current.get(pageNumber);
    if (!canvas || !size) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    redrawPage(pageNumber);
  };

  const redrawPage = (pageNumber: number) => {
    const canvas = canvasRefs.current.get(pageNumber);
    const size = pageSizeRef.current.get(pageNumber);
    if (!canvas || !size) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size.width, size.height);
    const annotations = annotationsRef.current.get(pageNumber);
    if (!annotations) return;
    // Strokes
    annotations.strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i += 1) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
    // Text
    annotations.texts.forEach((textItem) => {
      ctx.fillStyle = textItem.color;
      ctx.font = `${textItem.size}px sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(textItem.value, textItem.x, textItem.y);
    });
  };

  // Smoothly scroll a page into view inside the scroll container.
  const scrollToPage = (pageNumber: number) => {
    const wrapper = pageWrapperRefs.current.get(pageNumber);
    if (wrapper) {
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActivePage(pageNumber);
    }
  };

  // Track which page is currently in view to highlight it in the sidebar.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || numPages === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const pageNumber = Number(
            (visible.target as HTMLElement).dataset.pageNumber
          );
          if (pageNumber) setActivePage(pageNumber);
        }
      },
      { root: container, threshold: [0.25, 0.5, 0.75] }
    );
    pageWrapperRefs.current.forEach((node) => {
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [numPages]);

  // Virtualize rendering: only mount the PDF pages near the viewport so large
  // documents (e.g. an 80-page manual) stay fast. Off-screen pages collapse to
  // a lightweight placeholder of the right height to preserve scroll position.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || numPages === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        setVisiblePages((prev) => {
          const next = new Set(prev);
          let changed = false;
          for (const entry of entries) {
            const pageNumber = Number(
              (entry.target as HTMLElement).dataset.pageNumber
            );
            if (!pageNumber) continue;
            if (entry.isIntersecting) {
              if (!next.has(pageNumber)) {
                next.add(pageNumber);
                changed = true;
              }
            } else if (next.has(pageNumber)) {
              next.delete(pageNumber);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      },
      // Preload a screenful above/below so scrolling stays smooth.
      { root: container, rootMargin: '1200px 0px 1200px 0px', threshold: 0 }
    );
    pageWrapperRefs.current.forEach((node) => {
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [numPages]);

  const getPageAnnotations = (pageNumber: number): PageAnnotations => {
    let annotations = annotationsRef.current.get(pageNumber);
    if (!annotations) {
      annotations = { strokes: [], texts: [] };
      annotationsRef.current.set(pageNumber, annotations);
    }
    return annotations;
  };

  const getPosOnPage = (
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (pageNumber: number, e: React.MouseEvent | React.TouchEvent) => {
    if (!drawMode) return;
    const canvas = canvasRefs.current.get(pageNumber);
    if (!canvas) return;
    const pos = getPosOnPage(e, canvas);
    const annotations = getPageAnnotations(pageNumber);
    annotations.strokes.push({ color: brushColor, size: brushSize, points: [pos] });
    drawingRef.current = { pageNumber, last: pos };
  };

  const moveDraw = (pageNumber: number, e: React.MouseEvent | React.TouchEvent) => {
    if (!drawMode || !drawingRef.current || drawingRef.current.pageNumber !== pageNumber) {
      return;
    }
    const canvas = canvasRefs.current.get(pageNumber);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPosOnPage(e, canvas);
    const annotations = getPageAnnotations(pageNumber);
    const currentStroke = annotations.strokes[annotations.strokes.length - 1];
    if (!currentStroke) return;
    currentStroke.points.push(pos);
    ctx.strokeStyle = currentStroke.color;
    ctx.lineWidth = currentStroke.size;
    ctx.beginPath();
    ctx.moveTo(drawingRef.current.last.x, drawingRef.current.last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    drawingRef.current.last = pos;
  };

  const endDraw = () => {
    drawingRef.current = null;
  };

  const handleCanvasClick = (
    pageNumber: number,
    e: React.MouseEvent<HTMLCanvasElement>
  ) => {
    if (!textMode) return;
    const canvas = canvasRefs.current.get(pageNumber);
    if (!canvas) return;
    const pos = getPosOnPage(e, canvas);
    setPendingText({ pageNumber, x: pos.x, y: pos.y, value: '' });
  };

  const commitText = () => {
    if (!pendingText || !pendingText.value.trim()) {
      setPendingText(null);
      return;
    }
    const annotations = getPageAnnotations(pendingText.pageNumber);
    annotations.texts.push({
      x: pendingText.x,
      y: pendingText.y,
      value: pendingText.value,
      color: brushColor,
      size: fontSize,
    });
    redrawPage(pendingText.pageNumber);
    setPendingText(null);
  };

  const clearAll = () => {
    annotationsRef.current.clear();
    canvasRefs.current.forEach((_, pageNumber) => redrawPage(pageNumber));
    setPendingText(null);
  };

  const toolbarBaseStyle: React.CSSProperties = {
    position: 'fixed',
    // When the panel is open, sit right of the thumbnail strip. When it's
    // collapsed, drop below the floating "Contents" button so they stack
    // vertically instead of overlapping.
    top: numPages > 0 && !sidebarOpen ? 100 : 60,
    left: numPages > 0 && sidebarOpen ? THUMB_PANEL_WIDTH + 12 : 12,
    zIndex: 10002,
    display: 'flex',
    gap: 8,
    background: 'rgba(18,18,18,0.78)',
    padding: 8,
    borderRadius: 12,
    backdropFilter: 'blur(6px)',
  };

  const toolButtonStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(0,0,0,0.4)',
    color: '#fff',
    cursor: 'pointer',
  };

  const documentOptions = useMemo(
    () => ({
      // Workaround for some hosts that don't send range-request friendly headers.
      disableStream: false,
      disableAutoFetch: false,
    }),
    []
  );

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'auto',
        background: '#525659',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        paddingLeft: numPages > 0 && sidebarOpen ? THUMB_PANEL_WIDTH : 0,
        userSelect: 'none',
      }}
    >
      {toolbarVisible ? (
        <div style={toolbarBaseStyle}>
          <button
            onClick={() => {
              setDrawMode((v) => !v);
              if (!drawMode) setTextMode(false);
            }}
            style={{
              ...toolButtonStyle,
              background: drawMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.4)',
            }}
            title="Toggle drawing"
          >
            ✏️ {drawMode ? 'Drawing On' : 'Drawing Off'}
          </button>

          <button
            onClick={() => {
              setTextMode((v) => !v);
              if (!textMode) setDrawMode(false);
            }}
            style={{
              ...toolButtonStyle,
              background: textMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.4)',
            }}
            title="Add text (click to place)"
          >
            T {textMode ? 'Text On' : 'Text Off'}
          </button>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fff' }}
            title="Brush size"
          >
            Size
            <input
              type="range"
              min={2}
              max={18}
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
            />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fff' }}
            title="Brush color"
          >
            Color
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              style={{ width: 36, height: 28, border: 'none', background: 'transparent' }}
            />
          </label>

          <button onClick={clearAll} style={toolButtonStyle} title="Clear all annotations">
            🧽 Clear
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} title="Zoom">
            <button
              onClick={() => setScale((value) => Math.max(0.5, +(value - 0.25).toFixed(2)))}
              style={toolButtonStyle}
              title="Zoom out"
            >
              −
            </button>
            <span style={{ color: '#fff', minWidth: 48, textAlign: 'center' }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((value) => Math.min(4, +(value + 0.25).toFixed(2)))}
              style={toolButtonStyle}
              title="Zoom in"
            >
              +
            </button>
            <button
              onClick={() => setScale(1)}
              style={toolButtonStyle}
              title="Reset zoom"
            >
              ⤺
            </button>
          </div>

          <button
            onClick={() => setToolbarVisible(false)}
            style={toolButtonStyle}
            title="Hide toolbar"
          >
            Hide
          </button>
        </div>
      ) : (
        <button
          onClick={() => setToolbarVisible(true)}
          style={{
            position: 'fixed',
            top: numPages > 0 && !sidebarOpen ? 100 : 60,
            left: numPages > 0 && sidebarOpen ? THUMB_PANEL_WIDTH + 12 : 12,
            zIndex: 10002,
            padding: '6px 10px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(18,18,18,0.7)',
            color: '#fff',
            fontSize: 12,
            cursor: 'pointer',
          }}
          title="Show toolbar"
        >
          🛠️ Tools
        </button>
      )}

      {/* Contents toggle. The open thumbnail panel is rendered inside
          <Document> below so each thumbnail can use the loaded PDF. */}
      {numPages > 0 && !sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            position: 'fixed',
            top: 60,
            left: 12,
            zIndex: 10002,
            padding: '6px 10px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(18,18,18,0.7)',
            color: '#fff',
            fontSize: 12,
            cursor: 'pointer',
          }}
          title="Show contents"
        >
          📑 Contents
        </button>
      )}

      <Document
        file={src}
        onLoadSuccess={(pdf) => {
          setNumPages(pdf.numPages);
        }}
        onLoadError={(error) => {
          // eslint-disable-next-line no-console
          console.error('PDF load failed:', error);
        }}
        options={documentOptions}
        loading={
          <div style={{ color: '#fff', padding: 24 }}>Loading PDF…</div>
        }
        error={
          <div style={{ color: '#fff', padding: 24 }}>
            Failed to load PDF. The file may be restricted or unreachable.
          </div>
        }
      >
        {/* Left contents panel: page thumbnails (like the native viewer). */}
        {numPages > 0 && sidebarOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: THUMB_PANEL_WIDTH,
              maxWidth: '60vw',
              zIndex: 10002,
              background: 'rgba(18,18,18,0.92)',
              backdropFilter: 'blur(6px)',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '2px 0 12px rgba(0,0,0,0.4)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14 }}>Contents</span>
              <button
                onClick={() => setSidebarOpen(false)}
                style={{ ...toolButtonStyle, padding: '4px 10px', fontSize: 12 }}
                title="Hide contents"
              >
                Hide
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '6px 0' }}>
              {Array.from({ length: numPages }, (_, index) => {
                const pageNumber = index + 1;
                return (
                  <PdfThumbnail
                    key={pageNumber}
                    pageNumber={pageNumber}
                    isActive={pageNumber === activePage}
                    onClick={() => scrollToPage(pageNumber)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {Array.from({ length: numPages }, (_, index) => {
          const pageNumber = index + 1;
          const cachedSize = pageSizeRef.current.get(pageNumber);
          // Best estimate of the rendered page height so the placeholder
          // reserves the right amount of space (US Letter ratio fallback).
          const estimatedHeight =
            cachedSize?.height ?? Math.round(pageWidth * scale * 1.294);
          const isRendered = visiblePages.has(pageNumber);
          return (
            <div
              key={pageNumber}
              data-page-number={pageNumber}
              ref={(node) => {
                if (node) pageWrapperRefs.current.set(pageNumber, node);
                else pageWrapperRefs.current.delete(pageNumber);
              }}
              style={{
                position: 'relative',
                marginBottom: 16,
                width: pageWidth * scale,
                minHeight: estimatedHeight,
                boxShadow: '0 2px 12px rgba(0,0,0,0.45)',
              }}
            >
              {isRendered ? (
                <>
                  <Page
                    pageNumber={pageNumber}
                    width={pageWidth * scale}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onRenderSuccess={(page) => {
                      const viewport = page.getViewport({
                        scale: (pageWidth * scale) / page.view[2],
                      });
                      pageSizeRef.current.set(pageNumber, {
                        width: viewport.width,
                        height: viewport.height,
                      });
                      syncCanvas(pageNumber);
                    }}
                  />
                  <canvas
                    ref={(node) => {
                      if (node) canvasRefs.current.set(pageNumber, node);
                      else canvasRefs.current.delete(pageNumber);
                    }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: drawMode || textMode ? 'auto' : 'none',
                      cursor: textMode ? 'text' : drawMode ? 'crosshair' : 'default',
                      touchAction: 'none',
                    }}
                    onClick={(e) => handleCanvasClick(pageNumber, e)}
                    onMouseDown={(e) => startDraw(pageNumber, e)}
                    onMouseMove={(e) => moveDraw(pageNumber, e)}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={(e) => startDraw(pageNumber, e)}
                    onTouchMove={(e) => moveDraw(pageNumber, e)}
                    onTouchEnd={endDraw}
                  />
                  {pendingText && pendingText.pageNumber === pageNumber && (
                    <input
                      autoFocus
                      value={pendingText.value}
                      onChange={(e) =>
                        setPendingText((prev) =>
                          prev ? { ...prev, value: e.target.value } : prev
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitText();
                        if (e.key === 'Escape') setPendingText(null);
                      }}
                      onBlur={commitText}
                      style={{
                        position: 'absolute',
                        left: pendingText.x,
                        top: pendingText.y,
                        fontSize,
                        color: brushColor,
                        border: '1px dashed rgba(0,0,0,0.4)',
                        background: 'rgba(255,255,255,0.9)',
                        padding: '2px 4px',
                        outline: 'none',
                      }}
                    />
                  )}
                </>
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: estimatedHeight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#3a3d40',
                    color: '#9a9a9a',
                    fontSize: 13,
                  }}
                >
                  Page {pageNumber}
                </div>
              )}
            </div>
          );
        })}
      </Document>
    </div>
  );
}
