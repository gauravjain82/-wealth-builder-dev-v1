import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './protected-route';
import { PublicRoute } from './public-route';
import { RootRedirect } from './root-redirect.tsx';
import { MainLayout } from '@shared/layouts';
import { LoginPage, SignupPage } from '@/features/auth';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('@/features/home/pages/home-page'));
const EventsPage = lazy(() => import('@/features/events/pages/events-page'));
const EducationPage = lazy(() => import('@/features/education/pages/education-page'));
const ProspectTrackerPage = lazy(() => import('@/features/team/prospect/pages/prospect-tracker-page'));
const OrgChartPage = lazy(() => import('@/features/team/org-chart/pages/org-chart-page'));
const MissionTrackerPage = lazy(() => import('@/features/team/mission-tracker/pages/mission-tracker-page'));
const AssociateTrackerPage = lazy(() => import('@/features/team/associate-tracker/pages/associate-tracker-page'));
const LicensingTrackerPage = lazy(() => import('@/features/team/licensing-tracker/pages/licensing-tracker-page'));
const ProductionTrackerPage = lazy(() => import('@/features/team/production-tracker/pages/production-tracker-page'));
const ReportsPage = lazy(() => import('@/features/reports/pages/reports-page'));
const SettingsPage = lazy(() => import('@/features/settings/pages/settings-page'));
const ComponentsShowcase = lazy(() => import('@/features/showcase/pages/components-showcase'));
const PublicInsightCenter = lazy(() => import('@/features/insight-center/pages/public-insight-center'));
const PublicBusinessPage = lazy(() => import('@/features/education/pages/public-business-page'));
const PublicEducationPage = lazy(() => import('@/features/education/pages/public-education-page'));
const FileVaultPage = lazy(() => import('@/features/file-vault/pages/file-vault-page'));
const TrackMyLicensePage = lazy(() => import('@/features/licensing/track-my-license/pages/track-my-license-page'));
const LicensingDocumentsPage = lazy(() => import('@/features/licensing/licensing-documents/pages/licensing-documents-page'));
const CrashCoursePage = lazy(() => import('@/features/licensing/crash-course/pages/crash-course-page'));
const ChapterCoursePage = lazy(() => import('@/features/licensing/crash-course/pages/chapter-course-page'));
const TenSystematicToolsPage = lazy(() => import('@/features/systematic-tools/pages/ten-systematic-tools-page'));
const OnboardingGamePage = lazy(() => import('@/features/team/onboarding-game/pages/onboarding-game-page'));
const ResetPasswordPage = lazy(() => import('@/features/auth/components/reset-password-page'));
const TrainingCenterPage = lazy(() => import('@/features/training-center/pages/training-center-page'));
const TrainingSchedulePage = lazy(() => import('@/features/training-schedule/pages/training-schedule-page'));
const HelpNeededPage = lazy(() => import('@/features/helpdesk/pages/help-needed-page'));
const AdminHelpdeskPage = lazy(() => import('@/features/helpdesk/pages/admin-helpdesk-page'));
const InviteAgentsPage = lazy(() => import('@/features/admin/invite-agents/pages/invite-agents-page'));
import { AdminMissionRingProofPage } from '@/features/admin/mission-ring-proof';
const TerminatedUsersPage = lazy(() => import('@/features/terminated-users/pages/terminated-users-page'));

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

  // Public helpdesk page (works without login)
  {
    path: '/help-needed',
    element: lazyLoad(HelpNeededPage),
  },

  // Password reset/setup page (email link target)
  {
    path: '/reset-password',
    element: lazyLoad(ResetPasswordPage),
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
        element: <Navigate to="/home" replace />,
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
        path: 'licensing/chapter/:chapterId',
        element: lazyLoad(ChapterCoursePage),
      },
      {
        path: 'onboarding-game',
        element: lazyLoad(OnboardingGamePage),
      },
      {
        path: 'training-center',
        element: lazyLoad(TrainingCenterPage),
      },
      {
        path: 'training-schedule',
        element: lazyLoad(TrainingSchedulePage),
      },
      {
        path: 'file-vault',
        element: lazyLoad(FileVaultPage),
      },
      {
        path: 'team',
        element: <Navigate to="/team/prospect-tracker" replace />,
      },
      {
        path: 'team/prospect-tracker',
        element: lazyLoad(ProspectTrackerPage),
      },
      {
        path: 'team/org-chart',
        element: lazyLoad(OrgChartPage),
      },
      {
        path: 'team/mission-tracker',
        element: lazyLoad(MissionTrackerPage),
      },
      {
        path: 'team/associate-tracker',
        element: lazyLoad(AssociateTrackerPage),
      },
      {
        path: 'team/licensing-tracker',
        element: lazyLoad(LicensingTrackerPage),
      },
      {
        path: 'team/production-tracker',
        element: lazyLoad(ProductionTrackerPage),
      },
      {
        path: 'admin/invite-agents',
        element: lazyLoad(InviteAgentsPage),
      },
      {
        path: 'admin/mission-ring-proof',
        element: lazyLoad(AdminMissionRingProofPage),
      },
      {
        path: 'terminated-users',
        element: lazyLoad(TerminatedUsersPage),
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
        path: 'helpdesk',
        element: lazyLoad(HelpNeededPage),
      },
      {
        path: 'admin/helpdesk',
        element: lazyLoad(AdminHelpdeskPage),
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
