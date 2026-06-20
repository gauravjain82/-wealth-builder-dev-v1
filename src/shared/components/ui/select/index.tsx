import * as React from 'react';
import { cn } from '@core/utils';
import './select.css';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  variant?: 'default' | 'surface';
}

const selectVariantClasses: Record<NonNullable<SelectProps['variant']>, string> = {
  default: 'input',
  surface: 'input h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-slate-900 dark:border-white/20 dark:bg-white/5 dark:text-white',
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, variant = 'surface', ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn('select', selectVariantClasses[variant], className)}
      {...props}
    >
      {children}
    </select>
  );
});

Select.displayName = 'Select';

export { Select };
