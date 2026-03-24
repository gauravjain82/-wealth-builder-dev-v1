import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './protected-route';
import { PublicRoute } from './public-route';
import { RootRedirect } from './root-redirect.tsx';
import { MainLayout } from '@shared/layouts';
import { LoginPage, SignupPage } from '@/features/auth';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('@/features/home/pages/home-page'));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/dashboard-page'));
const EventsPage = lazy(() => import('@/features/events/pages/events-page'));
const EducationPage = lazy(() => import('@/features/education/pages/education-page'));
const TeamPage = lazy(() => import('@/features/team/pages/team-page'));
const ProspectTrackerPage = lazy(() => import('@/features/team/prospect/pages/prospect-tracker-page'));
const ReportsPage = lazy(() => import('@/features/reports/pages/reports-page'));
const SettingsPage = lazy(() => import('@/features/settings/pages/settings-page'));
const ComponentsShowcase = lazy(() => import('@/features/showcase/pages/components-showcase'));
const PublicInsightCenter = lazy(() => import('@/features/insight-center/pages/public-insight-center'));
const PublicBusinessPage = lazy(() => import('@/features/education/pages/public-business-page'));
const PublicEducationPage = lazy(() => import('@/features/education/pages/public-education-page'));
const TrackMyLicensePage = lazy(() => import('@/features/licensing/pages/track-my-license-page'));
const LicensingDocumentsPage = lazy(() => import('@/features/licensing/pages/licensing-documents-page'));
const CrashCoursePage = lazy(() => import('@/features/licensing/pages/crash-course-page'));
const TenSystematicToolsPage = lazy(() => import('@/features/systematic-tools/pages/ten-systematic-tools-page'));

// Loading component
function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-lg">Loading...</div>
    </div>
  );
}

// Wrap lazy components with Suspense
function lazyLoad(Component: React.LazyExoticComponent<() => JSX.Element>) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

const router = createBrowserRouter([
  // Root - Redirect to home if authenticated, otherwise to login
  {
    path: '/',
    element: <RootRedirect />,
  },

  // Login page (standalone, no layout wrapper)
  {
    path: '/login',
    element: <LoginPage />,
  },

  // Signup page
  {
    path: '/signup',
    element: (
      <PublicRoute>
        <SignupPage />
      </PublicRoute>
    ),
  },

  // Public Insight Center (standalone, no auth required)
  {
    path: '/public-insight-center',
    element: lazyLoad(PublicInsightCenter),
  },

  // Public Education Pages (no auth required)
  {
    path: '/learn/public-business',
    element: lazyLoad(PublicBusinessPage),
  },
  {
    path: '/learn/public-education',
    element: lazyLoad(PublicEducationPage),
  },

  // Protected routes
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'home',
        element: lazyLoad(HomePage),
      },
      {
        path: 'insight-center',
        element: lazyLoad(PublicInsightCenter),
      },
      {
        path: 'dashboard',
        element: lazyLoad(DashboardPage),
      },
      {
        path: 'events',
        element: lazyLoad(EventsPage),
      },
      {
        path: 'systematic-tools',
        element: lazyLoad(TenSystematicToolsPage),
      },
      {
        path: 'education',
        element: lazyLoad(EducationPage),
      },
      {
        path: 'learn/business',
        element: lazyLoad(PublicBusinessPage),
      },
      {
        path: 'learn/education',
        element: lazyLoad(PublicEducationPage),
      },
      {
        path: 'licensing/track',
        element: lazyLoad(TrackMyLicensePage),
      },
      {
        path: 'licensing/documents',
        element: lazyLoad(LicensingDocumentsPage),
      },
      {
        path: 'licensing/crash-course',
        element: lazyLoad(CrashCoursePage),
      },
      {
        path: 'team',
        element: lazyLoad(TeamPage),
      },
      {
        path: 'team/prospect-tracker',
        element: lazyLoad(ProspectTrackerPage),
      },
      {
        path: 'reports',
        element: lazyLoad(ReportsPage),
      },
      {
        path: 'settings',
        element: lazyLoad(SettingsPage),
      },
      {
        path: 'components',
        element: lazyLoad(ComponentsShowcase),
      },
    ],
  },

  // Catch all - 404
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export { router };
export default router;
