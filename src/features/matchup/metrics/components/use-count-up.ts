import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 800;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/**
 * Animates from the last shown value to `target` (from 0 on first render).
 * Jumps straight to the target when the viewer asked for reduced motion.
 */
export function useCountUp(target: number): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const shown = useRef(value);
  shown.current = value;

  useEffect(() => {
    const from = shown.current;
    if (from === target) return undefined;
    if (prefersReducedMotion()) {
      setValue(target);
      return undefined;
    }
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      // The first frame's timestamp can precede `started`; clamp so it never runs backwards.
      const progress = Math.min(Math.max((now - started) / DURATION_MS, 0), 1);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}
