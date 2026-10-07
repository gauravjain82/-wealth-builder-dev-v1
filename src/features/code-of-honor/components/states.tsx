/** Loading, empty and error states shared by every tab (none may spin forever or fail silently). */

import { Button } from '@/shared/components/ui/button';

import { errorMessage } from './error-message';

export function Loading({ label }: { label: string }) {
  return (
    <div className="wb-coh-loading" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="wb-coh-skeleton" aria-hidden="true" />
      ))}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="wb-coh-empty">{children}</p>;
}

export function ErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="wb-coh-error" role="alert">
      <span>{errorMessage(error)}</span>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
