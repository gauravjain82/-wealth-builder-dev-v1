import { useEffect, useRef, useState } from 'react';

interface SecureSlidePlayerProps {
  embedSrc: string;
  aspectRatio?: number;
  allowFullscreen?: boolean;
}

export default function SecureSlidePlayer({
  embedSrc,
  aspectRatio = 16 / 9,
  allowFullscreen = true,
}: SecureSlidePlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [drawMode, setDrawMode] = useState(false);
  const [brushSize, setBrushSize] = useState(4);
  const [brushColor, setBrushColor] = useState('#ff5252');
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(
    null
  );

  const [useCssFullscreen, setUseCssFullscreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);

  useEffect(() => {
    setFullscreenSupported(Boolean(document.fullscreenEnabled));
  }, []);

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!canvas || !rect) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = (rect.width / aspectRatio) * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.width / aspectRatio}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [aspectRatio, useCssFullscreen]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawMode) return;
    setIsDrawing(true);
    setLastPoint(getPos(e));
  };

  const moveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawMode || !isDrawing || !lastPoint) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const current = getPos(e);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();
    setLastPoint(current);
  };

  const endDraw = () => {
    setIsDrawing(false);
    setLastPoint(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const toggleFullscreen = async () => {
    if (!allowFullscreen) return;

    if (!fullscreenSupported) {
      setUseCssFullscreen((v) => !v);
      return;
    }

    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      setUseCssFullscreen((v) => !v);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useCssFullscreen && e.key === 'Escape') setUseCssFullscreen(false);
      if (e.key.toLowerCase() === 't') setToolbarVisible((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [useCssFullscreen]);

  const containerStyle: React.CSSProperties = useCssFullscreen
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.92)',
        margin: 0,
        width: '100vw',
        height: '100vh',
        userSelect: 'none',
      }
    : {
        width: '100%',
        maxWidth: 1200,
        margin: '0 auto',
        position: 'relative',
        aspectRatio: '16 / 9',
        userSelect: 'none',
      };

  const toolbarBaseStyle: React.CSSProperties = {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 6,
    display: 'flex',
    gap: 8,
    background: 'rgba(18,18,18,0.7)',
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

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      style={containerStyle}
    >
      {toolbarVisible && (
        <div style={toolbarBaseStyle}>
          <button
            onClick={() => setDrawMode((v) => !v)}
            style={{
              ...toolButtonStyle,
              background: drawMode
                ? 'rgba(255,255,255,0.15)'
                : 'rgba(0,0,0,0.4)',
            }}
            title="Toggle drawing"
          >
            ✏️ {drawMode ? 'Drawing On' : 'Drawing Off'}
          </button>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#fff',
            }}
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
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#fff',
            }}
            title="Brush color"
          >
            Color
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              style={{
                width: 36,
                height: 28,
                border: 'none',
                background: 'transparent',
              }}
            />
          </label>

          <button onClick={clearCanvas} style={toolButtonStyle} title="Clear">
            🧽 Clear
          </button>

          {allowFullscreen && (
            <button
              onClick={toggleFullscreen}
              style={toolButtonStyle}
              title={fullscreenSupported ? 'Fullscreen' : 'Expand'}
            >
              {useCssFullscreen || document.fullscreenElement
                ? '⤢ Exit'
                : fullscreenSupported
                ? '⛶ Fullscreen'
                : '⤢ Expand'}
            </button>
          )}

          <button
            onClick={() => setToolbarVisible(false)}
            style={toolButtonStyle}
            title="Hide toolbar (press T to toggle)"
          >
            Hide
          </button>
        </div>
      )}

      {!toolbarVisible && (
        <button
          onClick={() => setToolbarVisible(true)}
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 7,
            padding: '6px 10px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(18,18,18,0.6)',
            color: '#fff',
            fontSize: 12,
            cursor: 'pointer',
            backdropFilter: 'blur(6px)',
          }}
          title="Show toolbar (T)"
        >
          🛠️ Tools
        </button>
      )}

      <iframe
        src={embedSrc}
        title="Presentation"
        allowFullScreen
        allow="fullscreen; encrypted-media; picture-in-picture; clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        referrerPolicy="no-referrer"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 0,
          pointerEvents: drawMode ? 'none' : 'auto',
          background: 'black',
        }}
      />

      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 140,
          height: 80,
          zIndex: 4,
          pointerEvents: 'auto',
        }}
      />

      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 3,
          pointerEvents: drawMode ? 'auto' : 'none',
          touchAction: 'none',
        }}
        onMouseDown={startDraw}
        onMouseMove={moveDraw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={moveDraw}
        onTouchEnd={endDraw}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 35,
          left: 8,
          zIndex: 5,
          padding: '6px 10px',
          borderRadius: 8,
          fontSize: 12,
          color: '#ddd',
          background: 'rgba(0,0,0,0.4)',
        }}
      >
        Tip: Press <b>T</b> to toggle the toolbar. Turn drawing OFF to use slide
        arrows and keyboard.
      </div>
    </div>
  );
}
