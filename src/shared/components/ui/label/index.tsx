import * as React from 'react';
import { cn } from '@core/utils';
import './label.css';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  variant?: 'default' | 'form';
}

const labelVariantClasses: Record<NonNullable<LabelProps['variant']>, string> = {
  default: '',
  form: 'mb-1 block text-sm font-semibold text-slate-700 dark:text-white',
};

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, variant = 'default', ...props }, ref) => (
  <label
    ref={ref}
    className={cn('label', labelVariantClasses[variant], className)}
    {...props}
  />
));
Label.displayName = 'Label';

export { Label };
