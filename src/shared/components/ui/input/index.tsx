import * as React from 'react';
import { cn } from '@core/utils';
import './input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'surface';
}

const inputVariantClasses: Record<NonNullable<InputProps['variant']>, string> = {
  default: '',
  surface:
    'h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-slate-900 placeholder:text-slate-500 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder:text-white/50',
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = 'default', ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn('input', inputVariantClasses[variant], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
