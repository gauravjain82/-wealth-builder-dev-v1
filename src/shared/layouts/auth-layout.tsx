import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

interface AuthLayoutProps {
  children?: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <div className="w-full max-w-md">
        {children || <Outlet />}
      </div>
    </div>
  );
}
