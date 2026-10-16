import { UserCog } from 'lucide-react';

import { useAuth } from '@/features/auth/hooks/use-auth';

/**
 * Thin, non-dismissible bar shown on every signed-in screen while an SMD's assistant is
 * signed in with their own login (`user.actingAs`). Renders nothing otherwise.
 */
export function AssistantModeBanner() {
  const { user } = useAuth();
  const actingAs = user?.actingAs;
  if (!actingAs) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex shrink-0 items-center justify-center gap-2 bg-indigo-700 px-4 py-1.5 text-center text-xs font-medium text-white sm:text-sm"
    >
      <UserCog className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        You&apos;re signed in as <strong>{actingAs.assistant_name}</strong>, working in{' '}
        <strong>{actingAs.principal_name}</strong>&apos;s account. Some personal settings are hidden.
      </span>
    </div>
  );
}
