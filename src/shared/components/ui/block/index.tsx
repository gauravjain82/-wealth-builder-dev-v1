import type { ReactNode } from 'react';
import { cn } from '@core/utils';
import { Heading, Text, type HeadingProps } from '../typography';

interface BlockProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  headerClassName?: string;
  titleVariant?: HeadingProps['variant'];
}

export function Block({
  title,
  description,
  actions,
  children,
  className,
  headerClassName,
  titleVariant = 'h4',
}: BlockProps) {
  return (
    <section className={cn(className)}>
      {(title || description) && (
        <div className={cn('mb-1', headerClassName)}>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            {title ? <Heading as="h1" variant={titleVariant} weight="bold">{title}</Heading> : <span />}
            {actions}
          </div>
          {description ? <Text variant="muted" className="text-gray-400">{description}</Text> : null}
        </div>
      )}
      {children}
    </section>
  );
}
