import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@core/utils';
import './button.css';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700]/35 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Old-site primary CTA: soft gold surface with gold text.
        default: 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-[rgba(255,215,0,.35)] dark:bg-[rgba(255,215,0,.2)] dark:text-[#ffd700] dark:hover:bg-[rgba(255,215,0,.28)]',
        // Neutral dark surface button from legacy tracker UI.
        secondary: 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-[rgba(255,255,255,.18)] dark:bg-[rgba(255,255,255,.08)] dark:text-white dark:hover:bg-[rgba(255,255,255,.12)]',
        // Legacy ghost button style.
        outline: 'border-gray-300 bg-transparent text-gray-700 hover:bg-gray-100 dark:border-[rgba(255,255,255,.25)] dark:bg-transparent dark:text-white dark:hover:bg-[rgba(255,255,255,.06)]',
        ghost: 'border-gray-300 bg-transparent text-gray-700 hover:bg-gray-100 dark:border-[rgba(255,255,255,.25)] dark:bg-transparent dark:text-white dark:hover:bg-[rgba(255,255,255,.06)]',
        destructive: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-[rgba(239,83,80,.55)] dark:bg-[rgba(239,83,80,.25)] dark:text-white dark:hover:bg-[rgba(239,83,80,.32)]',
        link: 'border-transparent bg-transparent p-0 text-amber-700 underline-offset-4 hover:underline dark:text-[#ffd700]',
      },
      size: {
        default: 'h-10 px-3 py-2',
        sm: 'h-8 px-2.5 text-[13px]',
        lg: 'h-11 px-4 py-2.5',
        icon: 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
