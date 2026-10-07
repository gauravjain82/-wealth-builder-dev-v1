import { useEffect, useRef } from 'react';

/**
 * Runs `onRestored` when the browser restores this page from the back/forward cache.
 *
 * A redirect to Stripe leaves React state as it was ("Opening…", button disabled). If
 * the user comes back with the Back button, the browser restores that frozen page
 * without remounting anything, so the state has to be reset here.
 */
export function usePageRestored(onRestored: () => void): void {
  const callback = useRef(onRestored);
  callback.current = onRestored;

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) callback.current();
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);
}
