import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './header';
import { Sidebar } from './sidebar';
import './main-layout.css';

interface MainLayoutProps {
  children?: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="main-layout">
      <Header />

      <div className="main-layout__body">
        <Sidebar />

        <div className="main-layout__content">
          <main className="main-layout__main">
            <div className="main-layout__main-inner">
              {children || <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
