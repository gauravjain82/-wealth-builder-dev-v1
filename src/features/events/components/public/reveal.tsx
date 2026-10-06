/**
 * Scroll-reveal wrapper: fades and lifts its children in the first time they
 * enter the viewport.
 *
 * Uses `IntersectionObserver` + Tailwind transitions rather than an animation
 * library. Content is visible by default when JS/observers are unavailable, and
 * users with `prefers-reduced-motion` get no movement (`motion-safe:` variants).
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@core/utils';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms, for revealing grid items one after another. */
  delay?: number;
}

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Start "shown" when the observer is unsupported so content is never hidden.
  const [shown, setShown] = useState(
    () => typeof IntersectionObserver === 'undefined',
  );

  useEffect(() => {
    const node = ref.current;
    if (!node || shown) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shown]);

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        'motion-safe:transition motion-safe:duration-700 motion-safe:ease-out',
        shown
          ? 'opacity-100 translate-y-0'
          : 'motion-safe:translate-y-6 motion-safe:opacity-0',
        className,
      )}
    >
      {children}
    </div>
  );
}
