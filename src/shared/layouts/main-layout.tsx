import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { ExpandableChat } from '@/features/ai/components/expandable-chat';
import { AnnouncementBar } from '@/features/events/components/announcement-bar/announcement-bar';
import { Header } from './header';
import { Sidebar } from './sidebar';
import './main-layout.css';

interface MainLayoutProps {
  children?: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="main-layout">
      <AnnouncementBar />
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

      <ExpandableChat />
    </div>
  );
}
