import { ReactNode } from 'react';
import './page-wrapper.css';

interface PageWrapperProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
}

export function PageWrapper({
  children,
  title,
  subtitle,
  centered = true,
  className = '',
}: PageWrapperProps) {
  return (
    <div className={`ic-wrap ${centered ? 'ic-centered' : ''} ${className}`}>
      {children}
      {title && <h3 className="ic-question">{title}</h3>}
      {subtitle && <p className="ic-subtitle">{subtitle}</p>}
    </div>
  );
}
