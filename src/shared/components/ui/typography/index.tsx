import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@core/utils';
import './typography.css';

/* ==================== Heading Component ==================== */

const headingVariants = cva('font-semibold tracking-tight', {
  variants: {
    variant: {
      h1: 'text-4xl md:text-5xl lg:text-6xl',
      h2: 'text-3xl md:text-4xl lg:text-5xl',
      h3: 'text-2xl md:text-3xl lg:text-4xl',
      h4: 'text-xl md:text-2xl lg:text-3xl',
      h5: 'text-lg md:text-xl lg:text-2xl',
      h6: 'text-base md:text-lg lg:text-xl',
    },
    weight: {
      light: 'font-light',
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
      extrabold: 'font-extrabold',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
  },
  defaultVariants: {
    variant: 'h2',
    weight: 'semibold',
    align: 'left',
  },
});

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, variant, weight, align, as, ...props }, ref) => {
    const Comp = as || variant || 'h2';
    return (
      <Comp
        ref={ref}
        className={cn(headingVariants({ variant: variant || (as as any), weight, align, className }))}
        {...props}
      />
    );
  }
);
Heading.displayName = 'Heading';

/* ==================== Text Component ==================== */

const textVariants = cva('', {
  variants: {
    variant: {
      body: 'text-base leading-relaxed',
      lead: 'text-xl leading-relaxed font-light',
      large: 'text-lg leading-relaxed',
      small: 'text-sm leading-normal',
      muted: 'text-sm text-muted-foreground leading-normal',
      tiny: 'text-xs leading-tight',
    },
    weight: {
      light: 'font-light',
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      justify: 'text-justify',
    },
  },
  defaultVariants: {
    variant: 'body',
    weight: 'normal',
    align: 'left',
  },
});

export interface TextProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof textVariants> {
  as?: 'p' | 'span' | 'div';
}

const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, variant, weight, align, as = 'p', ...props }, ref) => {
    const Comp = as;
    return (
      <Comp
        ref={ref as any}
        className={cn(textVariants({ variant, weight, align, className }))}
        {...props}
      />
    );
  }
);
Text.displayName = 'Text';

/* ==================== Link Component ==================== */

const linkVariants = cva(
  'inline-flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'text-primary underline-offset-4 hover:underline',
        muted: 'text-muted-foreground hover:text-foreground underline-offset-4 hover:underline',
        subtle: 'text-foreground/80 hover:text-foreground underline-offset-4 hover:underline',
        discrete: 'text-foreground hover:text-primary transition-colors',
      },
      size: {
        default: 'text-base',
        sm: 'text-sm',
        lg: 'text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface LinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof linkVariants> {
  external?: boolean;
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, variant, size, external, children, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={cn(linkVariants({ variant, size, className }))}
        {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
        {...props}
      >
        {children}
      </a>
    );
  }
);
Link.displayName = 'Link';

/* ==================== Blockquote Component ==================== */

export interface BlockquoteProps extends React.HTMLAttributes<HTMLQuoteElement> {}

const Blockquote = React.forwardRef<HTMLQuoteElement, BlockquoteProps>(
  ({ className, ...props }, ref) => {
    return (
      <blockquote
        ref={ref}
        className={cn(
          'border-l-4 border-primary pl-6 italic text-muted-foreground my-4',
          className
        )}
        {...props}
      />
    );
  }
);
Blockquote.displayName = 'Blockquote';

/* ==================== Code Component ==================== */

const codeVariants = cva(
  'font-mono rounded px-1.5 py-0.5',
  {
    variants: {
      variant: {
        inline: 'bg-muted text-sm',
        block: 'bg-muted/50 text-sm block p-4 overflow-x-auto',
      },
    },
    defaultVariants: {
      variant: 'inline',
    },
  }
);

export interface CodeProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof codeVariants> {}

const Code = React.forwardRef<HTMLElement, CodeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <code
        ref={ref}
        className={cn(codeVariants({ variant, className }))}
        {...props}
      />
    );
  }
);
Code.displayName = 'Code';

/* ==================== List Components ==================== */

export interface ListProps extends React.HTMLAttributes<HTMLUListElement | HTMLOListElement> {
  ordered?: boolean;
}

const List = React.forwardRef<HTMLUListElement | HTMLOListElement, ListProps>(
  ({ className, ordered = false, ...props }, ref) => {
    const Comp = ordered ? 'ol' : 'ul';
    return (
      <Comp
        ref={ref as any}
        className={cn(
          'space-y-2 pl-6',
          ordered ? 'list-decimal' : 'list-disc',
          className
        )}
        {...props}
      />
    );
  }
);
List.displayName = 'List';

export interface ListItemProps extends React.HTMLAttributes<HTMLLIElement> {}

const ListItem = React.forwardRef<HTMLLIElement, ListItemProps>(
  ({ className, ...props }, ref) => {
    return <li ref={ref} className={cn('leading-relaxed', className)} {...props} />;
  }
);
ListItem.displayName = 'ListItem';

/* ==================== Divider Component ==================== */

const dividerVariants = cva('border-border', {
  variants: {
    orientation: {
      horizontal: 'w-full border-t',
      vertical: 'h-full border-l',
    },
    spacing: {
      none: '',
      sm: '',
      md: '',
      lg: '',
    },
  },
  compoundVariants: [
    {
      orientation: 'horizontal',
      spacing: 'sm',
      className: 'my-2',
    },
    {
      orientation: 'horizontal',
      spacing: 'md',
      className: 'my-4',
    },
    {
      orientation: 'horizontal',
      spacing: 'lg',
      className: 'my-8',
    },
    {
      orientation: 'vertical',
      spacing: 'sm',
      className: 'mx-2',
    },
    {
      orientation: 'vertical',
      spacing: 'md',
      className: 'mx-4',
    },
    {
      orientation: 'vertical',
      spacing: 'lg',
      className: 'mx-8',
    },
  ],
  defaultVariants: {
    orientation: 'horizontal',
    spacing: 'md',
  },
});

export interface DividerProps
  extends React.HTMLAttributes<HTMLHRElement>,
    VariantProps<typeof dividerVariants> {}

const Divider = React.forwardRef<HTMLHRElement, DividerProps>(
  ({ className, orientation, spacing, ...props }, ref) => {
    return (
      <hr
        ref={ref}
        className={cn(dividerVariants({ orientation, spacing, className }))}
        {...props}
      />
    );
  }
);
Divider.displayName = 'Divider';

/* ==================== Badge Component ==================== */

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success: 'border-transparent bg-green-500 text-white hover:bg-green-600',
        warning: 'border-transparent bg-yellow-500 text-white hover:bg-yellow-600',
        info: 'border-transparent bg-blue-500 text-white hover:bg-blue-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
  }
);
Badge.displayName = 'Badge';

export {
  Heading,
  Text,
  Link,
  Blockquote,
  Code,
  List,
  ListItem,
  Divider,
  Badge,
  headingVariants,
  textVariants,
  linkVariants,
  codeVariants,
  dividerVariants,
  badgeVariants,
};
