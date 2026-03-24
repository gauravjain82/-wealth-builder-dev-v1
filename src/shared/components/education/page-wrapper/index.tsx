import { ReactNode } from 'react';
import './page-wrapper.css';

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

export function PageWrapper({ children, className = '' }: PageWrapperProps) {
  return <div className={`biz-wrap ${className}`}>{children}</div>;
}
