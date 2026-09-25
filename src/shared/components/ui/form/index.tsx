import type { FormEvent, ReactNode } from 'react';
import { cn } from '@core/utils';

interface FormProps {
  children: ReactNode;
  className?: string;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
}

export function Form({ children, className, onSubmit }: FormProps) {
  return (
    <form onSubmit={onSubmit} className={cn('grid gap-4', className)}>
      {children}
    </form>
  );
}

interface FormRowGroupProps {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
}

const groupColumns: Record<1 | 2 | 3, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-3',
};

export function FormRowGroup({ children, className, columns = 2 }: FormRowGroupProps) {
  return <div className={cn('grid gap-4', groupColumns[columns], className)}>{children}</div>;
}

interface FormRowProps {
  children: ReactNode;
  className?: string;
  /**
   * Optional stable key for contextual guidance (GMS decision G9).
   *
   * A pass-through only: it renders as a `data-gms-target` attribute on the row's
   * existing wrapper and changes no behaviour, no styling and no layout. Guidance
   * spotlights elements that already exist rather than adding wrappers of its own, and
   * this row is a plain layout div that did not previously forward props — so the
   * alternative was a GMS-owned element inside every form, which would have been a
   * larger change than this one.
   */
  'data-gms-target'?: string;
}

export function FormRow({ children, className, ...rest }: FormRowProps) {
  return (
    <div className={cn('grid gap-1.5', className)} {...rest}>
      {children}
    </div>
  );
}

interface FormActionsProps {
  children: ReactNode;
  className?: string;
}

export function FormActions({ children, className }: FormActionsProps) {
  return (
    <div className={cn('mt-2 flex justify-end gap-3 border-t border-white/10 pt-4', className)}>
      {children}
    </div>
  );
}
