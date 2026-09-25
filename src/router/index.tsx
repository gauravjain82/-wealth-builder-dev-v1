import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { ProtectedRoute } from './protected-route';
import { AdminRoute } from './admin-route';
import { BuilderAiRoute } from './builder-ai-route';
import { MisalignmentsRoute } from './misalignments-route';
import { WbPipelineRoute } from './wb-pipeline-route';
import { ContestSettingsRoute } from './contest-settings-route';
import { ContestsRoute } from './contests-route';
import { LeaderboardsRoute } from './leaderboards-route';
import { ProductsRoute } from './products-route';
import { PublicRoute } from './public-route';
import { RouteErrorFallback } from './route-error-boundary';
import { RootRedirect } from './root-redirect.tsx';
import { MainLayout } from '@shared/layouts';
import { BpmSelectionProvider } from '@/features/bpm/context/bpm-selection-context';
import { BpmConfigProvider } from '@/features/bpm/context/bpm-config-context';
import { LoginPage, SignupPage } from '@/features/auth';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('@/features/home/pages/home-page'));
const EventsListPage = lazy(() => import('@/features/events/pages/events-list-page'));
const PurchasesPage = lazy(() => import('@/features/events/pages/purchases-page'));
const CheckinPage = lazy(() => import('@/features/events/pages/checkin-page'));
const RecognitionPage = lazy(() => import('@/features/events/pages/recognition-page'));
const PermissionsPage = lazy(() => import('@/features/events/pages/permissions-page'));
const EventBuilderPage = lazy(() => import('@/features/events/pages/event-builder-page'));
const EventOrdersPage = lazy(() => import('@/features/events/pages/event-orders-page'));
const EventMyTicketsPage = lazy(() => import('@/features/events/pages/event-my-tickets-page'));
const EventCheckinPage = lazy(() => import('@/features/events/pages/event-checkin-page'));
const EventRecognitionPage = lazy(() => import('@/features/events/pages/event-recognition-page'));
const EventEmailsPage = lazy(() => import('@/features/events/pages/event-emails-page'));
const EventQuestionsPage = lazy(() => import('@/features/events/pages/event-questions-page'));
const EventPermissionsPage = lazy(() => import('@/features/events/pages/event-permissions-page'));
const EventLandingPage = lazy(() => import('@/features/events/pages/public/event-landing-page'));
const EventCheckoutPage = lazy(() => import('@/features/events/pages/public/event-checkout-page'));
const EventTransferPage = lazy(() => import('@/features/events/pages/public/event-transfer-page'));
const EventTicketPage = lazy(() => import('@/features/events/pages/public/event-ticket-page'));
// BPM's one public page: the pass a guest is emailed or texted a link to.
const BpmGuestPassPage = lazy(() => import('@/features/bpm/pages/public/bpm-guest-pass-page'));
const EducationPage = lazy(() => import('@/features/education/pages/education-page'));
const ProspectTrackerPage = lazy(() => import('@/features/team/prospect/pages/prospect-tracker-page'));
const OrgChartPage = lazy(() => import('@/features/team/org-chart/pages/org-chart-page'));
const MissionTrackerPage = lazy(() => import('@/features/team/mission-tracker/pages/mission-tracker-page'));
const AssociateTrackerPage = lazy(() => import('@/features/team/associate-tracker/pages/associate-tracker-page'));
const BuildersPage = lazy(() => import('@/features/team/builders/pages/builders-page'));
const BuilderAiHomePage = lazy(() => import('@/features/builder-ai/pages/home-page'));
const BuilderAiCompanyPage = lazy(() => import('@/features/builder-ai/pages/company-page'));
const BuilderAiBaseshopPage = lazy(() => import('@/features/builder-ai/pages/baseshop-page'));
const BuilderAiInvitationsPage = lazy(() => import('@/features/builder-ai/pages/invitations-page'));
const BuilderAiReportingPage = lazy(() => import('@/features/builder-ai/pages/reporting-page'));
const BuilderAiBulletinPage = lazy(() => import('@/features/builder-ai/pages/bulletin-page'));
const LeaderMisalignmentsPage = lazy(
  () => import('@/features/admin/misalignments/pages/leader-misalignments-page')
);
const PolicyMisalignmentsPage = lazy(
  () => import('@/features/admin/misalignments/pages/policy-misalignments-page')
);
const LeaderboardsPage = lazy(
  () => import('@/features/leaderboards/pages/leaderboards-page')
);
const ContestsPage = lazy(() => import('@/features/contests/pages/contests-page'));
const ContestSettingsPage = lazy(
  () => import('@/features/contests/pages/contest-settings-page')
);
const HomeV2Page = lazy(
  () => import('@/features/home-v2/pages/home-v2-page')
);
const WbPipelinePage = lazy(
  () => import('@/features/admin/wb-pipeline/pages/wb-pipeline-page')
);
const ProductsListPage = lazy(
  () => import('@/features/admin/products/pages/products-list-page')
);
const PublicDailySixPage = lazy(() => import('@/features/team/builders/pages/public-daily-six-page'));
const AddGoalsPage = lazy(() => import('@/features/team/associate-tracker/pages/add-goals-page'));
const LicensingTrackerPage = lazy(() => import('@/features/team/licensing-tracker/pages/licensing-tracker-page'));
const ProductionTrackerPage = lazy(() => import('@/features/team/production-tracker/pages/production-tracker-page'));
const ReportsPage = lazy(() => import('@/features/reports/pages/reports-page'));
const SettingsPage = lazy(() => import('@/features/settings/pages/settings-page'));
const ComponentsShowcase = lazy(() => import('@/features/showcase/pages/components-showcase'));
const PublicInsightCenter = lazy(() => import('@/features/insight-center/pages/public-insight-center'));
const PublicBusinessPage = lazy(() => import('@/features/education/pages/public-business-page'));
const PublicEducationPage = lazy(() => import('@/features/education/pages/public-education-page'));
const FileVaultPage = lazy(() => import('@/features/file-vault/pages/file-vault-page'));
const AdminFileVaultPage = lazy(() => import('@/features/admin/file-vault/pages/admin-file-vault-page'));
const AdminTrainingCenterPage = lazy(() => import('@/features/admin/training-center/pages/admin-training-center-page'));
const AdminHomeContentPage = lazy(() => import('@/features/admin/home-content/pages/admin-home-content-page'));
const TrackMyLicensePage = lazy(() => import('@/features/licensing/track-my-license/pages/track-my-license-page'));
const LicensingDocumentsPage = lazy(() => import('@/features/licensing/licensing-documents/pages/licensing-documents-page'));
const CrashCoursePage = lazy(() => import('@/features/licensing/crash-course/pages/crash-course-page'));
const ChapterCoursePage = lazy(() => import('@/features/licensing/crash-course/pages/chapter-course-page'));
const TenSystematicToolsPage = lazy(() => import('@/features/systematic-tools/pages/ten-systematic-tools-page'));
const OnboardingGamePage = lazy(() => import('@/features/team/onboarding-game/pages/onboarding-game-page'));
const ResetPasswordPage = lazy(() => import('@/features/auth/components/reset-password-page'));
const TrainingCenterPage = lazy(() => import('@/features/training-center/pages/training-center-page'));
const TrainingSchedulePage = lazy(() => import('@/features/training-schedule/pages/training-schedule-page'));
const MatchupPage = lazy(() => import('@/features/matchup/pages/matchup-page'));
const CalendarPage = lazy(() => import('@/features/matchup/pages/calendar-page'));
const BpmOverviewPage = lazy(() => import('@/features/bpm/pages/bpm-overview-page'));
const BpmSchedulePage = lazy(() => import('@/features/bpm/pages/bpm-schedule-page'));
const BpmAddGuestPage = lazy(() => import('@/features/bpm/pages/add-guest-page'));
const BpmViewInvitesPage = lazy(() => import('@/features/bpm/pages/view-invites-page'));
const BpmAssociateInvitesPage = lazy(() => import('@/features/bpm/pages/associate-invites-page'));
const BpmGuestCheckinPage = lazy(() => import('@/features/bpm/pages/guest-checkin-page'));
const BpmAssociateCheckinPage = lazy(() => import('@/features/bpm/pages/associate-checkin-page'));
const BpmSettingsPage = lazy(() => import('@/features/bpm/pages/bpm-settings-page'));
const HelpNeededPage = lazy(() => import('@/features/helpdesk/pages/help-needed-page'));
const PrivacyPolicyPage = lazy(() => import('@/features/legal/pages/privacy-policy-page'));
const TermsPage = lazy(() => import('@/features/legal/pages/terms-page'));
const AdminHelpdeskPage = lazy(() => import('@/features/helpdesk/pages/admin-helpdesk-page'));
const InviteAgentsPage = lazy(() => import('@/features/admin/invite-agents/pages/invite-agents-page'));
const FunctionsPage = lazy(() => import('@/features/admin/access-control/pages/functions-page'));
const UserPermissionsPage = lazy(() => import('@/features/admin/access-control/pages/user-permissions-page'));
const LevelPermissionsPage = lazy(() => import('@/features/admin/access-control/pages/level-permissions-page'));
import { AdminMissionRingProofPage } from '@/features/admin/mission-ring-proof';
const TerminatedUsersPage = lazy(() => import('@/features/terminated-users/pages/terminated-users-page'));
const PromotionDashboardPage = lazy(() => import('@/features/promotion/pages/promotion-dashboard-page'));
const TeamPromotionPage = lazy(() => import('@/features/promotion/pages/team-promotion-page'));

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
    errorElement: <RouteErrorFallback />,
  },

  // Login page (standalone, no layout wrapper)
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <RouteErrorFallback />,
  },

  // Public helpdesk page (works without login)
  {
    path: '/help-needed',
    element: lazyLoad(HelpNeededPage),
    errorElement: <RouteErrorFallback />,
  },

  // Public legal pages (must render without login for Google OAuth branding review)
  {
    path: '/privacy-policy',
    element: lazyLoad(PrivacyPolicyPage),
    errorElement: <RouteErrorFallback />,
  },
  {
    path: '/terms-and-conditions',
    element: lazyLoad(TermsPage),
    errorElement: <RouteErrorFallback />,
  },

  // Password reset/setup page (email link target)
  {
    path: '/reset-password',
    element: lazyLoad(ResetPasswordPage),
    errorElement: <RouteErrorFallback />,
  },

  // Signup page
  {
    path: '/signup',
    element: (
      <PublicRoute>
        <SignupPage />
      </PublicRoute>
    ),
    errorElement: <RouteErrorFallback />,
  },

  // Public Insight Center (standalone, no auth required)
  {
    path: '/public-insight-center',
    element: lazyLoad(PublicInsightCenter),
    errorElement: <RouteErrorFallback />,
  },

  // Public Education Pages (no auth required)
  {
    path: '/learn/public-business',
    element: lazyLoad(PublicBusinessPage),
    errorElement: <RouteErrorFallback />,
  },
  {
    path: '/learn/public-education',
    element: lazyLoad(PublicEducationPage),
    errorElement: <RouteErrorFallback />,
  },

  // Public Daily Six submission page
  {
    path: '/team/builders/daily-six/:agencyCode',
    element: lazyLoad(PublicDailySixPage),
    errorElement: <RouteErrorFallback />,
  },

  // Hidden shareable page. Recipients sign in and update their own associate tracker goals.
  {
    path: '/add-goals',
    element: (
      <ProtectedRoute>
        {lazyLoad(AddGoalsPage)}
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorFallback />,
  },

  // Protected routes
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorFallback />,
    children: [
      {
        path: 'home',
        element: lazyLoad(HomePage),
      },
      {
        // Owner-only: Company Owner & Builder are separate things — a Builder only
        // gets Baseshop + Invitations, so keep them off the owner Home page.
        path: 'builder-ai/home',
        element: <BuilderAiRoute ownerOnly>{lazyLoad(BuilderAiHomePage)}</BuilderAiRoute>,
      },
      {
        // Owner-only company overview.
        path: 'builder-ai/company',
        element: <BuilderAiRoute ownerOnly>{lazyLoad(BuilderAiCompanyPage)}</BuilderAiRoute>,
      },
      {
        // Owner-only drill-in into another owner's company.
        path: 'builder-ai/company/:ownerId',
        element: <BuilderAiRoute ownerOnly>{lazyLoad(BuilderAiCompanyPage)}</BuilderAiRoute>,
      },
      {
        // Shared: both Company Owners and Builders can see their baseshop.
        path: 'builder-ai/baseshop',
        element: <BuilderAiRoute>{lazyLoad(BuilderAiBaseshopPage)}</BuilderAiRoute>,
      },
      {
        // Shared: Builders come here to accept their invitation.
        path: 'builder-ai/invitations',
        element: <BuilderAiRoute>{lazyLoad(BuilderAiInvitationsPage)}</BuilderAiRoute>,
      },
      {
        // Owner-only reporting.
        path: 'builder-ai/reporting',
        element: <BuilderAiRoute ownerOnly>{lazyLoad(BuilderAiReportingPage)}</BuilderAiRoute>,
      },
      {
        // Owner-only bulletin.
        path: 'builder-ai/bulletin',
        element: <BuilderAiRoute ownerOnly>{lazyLoad(BuilderAiBulletinPage)}</BuilderAiRoute>,
      },
      {
        // Admin-only Data Integrity report; gated per-user by misalignments:read.
        path: 'admin/data-integrity/leader-misalignments',
        element: <MisalignmentsRoute>{lazyLoad(LeaderMisalignmentsPage)}</MisalignmentsRoute>,
      },
      {
        // Admin-only Data Integrity report; gated per-user by misalignments:read.
        path: 'admin/data-integrity/policy-misalignments',
        element: <MisalignmentsRoute>{lazyLoad(PolicyMisalignmentsPage)}</MisalignmentsRoute>,
      },
      {
        // The next home page. Behind homev2:read — a named rollout list, not a
        // role — while `/home` stays exactly as it is.
        path: 'home-v2',
        element: <LeaderboardsRoute>{lazyLoad(HomeV2Page)}</LeaderboardsRoute>,
      },
      {
        // Expanded leaderboard and Full Report; same homev2:read gate.
        path: 'leaderboards',
        element: <LeaderboardsRoute>{lazyLoad(LeaderboardsPage)}</LeaderboardsRoute>,
      },
      {
        // The optional standalone route from UI_CONTRACT.md. Same card, same rules,
        // a taller box. Gated on can_view_contests, which reads the same homev2:read
        // grant the Home v2 page does (decision C11).
        path: 'contests',
        element: <ContestsRoute>{lazyLoad(ContestsPage)}</ContestsRoute>,
      },
      {
        // Configuring a contest is wbreporting:manage, not the homev2:read that
        // opens the card - a different gate for a different job.
        path: 'admin/contest-settings',
        element: <ContestSettingsRoute>{lazyLoad(ContestSettingsPage)}</ContestSettingsRoute>,
      },
      {
        // Admin-only reporting pipeline operations; gated per-user by
        // wbreporting:read / wbreporting:manage.
        path: 'admin/reporting-pipeline',
        element: <WbPipelineRoute>{lazyLoad(WbPipelinePage)}</WbPipelineRoute>,
      },
      {
        // Product catalog management; gated per-user by products:read.
        path: 'admin/products',
        element: <ProductsRoute>{lazyLoad(ProductsListPage)}</ProductsRoute>,
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
        element: lazyLoad(EventsListPage),
      },
      {
        path: 'events/purchases',
        element: lazyLoad(PurchasesPage),
      },
      {
        path: 'events/check-in',
        element: lazyLoad(CheckinPage),
      },
      {
        path: 'events/recognition',
        element: lazyLoad(RecognitionPage),
      },
      {
        path: 'events/permissions',
        element: lazyLoad(PermissionsPage),
      },
      {
        path: 'events/:eventId/builder',
        element: lazyLoad(EventBuilderPage),
      },
      {
        path: 'events/:eventId/orders',
        element: lazyLoad(EventOrdersPage),
      },
      {
        path: 'events/:eventId/my-tickets',
        element: lazyLoad(EventMyTicketsPage),
      },
      {
        path: 'events/:eventId/checkin',
        element: lazyLoad(EventCheckinPage),
      },
      {
        path: 'events/:eventId/recognition',
        element: lazyLoad(EventRecognitionPage),
      },
      {
        path: 'events/:eventId/emails',
        element: lazyLoad(EventEmailsPage),
      },
      {
        path: 'events/:eventId/questions',
        element: lazyLoad(EventQuestionsPage),
      },
      {
        path: 'events/:eventId/access',
        element: lazyLoad(EventPermissionsPage),
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
        path: 'promotion/dashboard',
        element: lazyLoad(PromotionDashboardPage),
      },
      {
        path: 'promotion/team',
        element: lazyLoad(TeamPromotionPage),
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
        path: 'matchup',
        element: lazyLoad(MatchupPage),
      },
      {
        path: 'calendar',
        element: lazyLoad(CalendarPage),
      },
      {
        // Nested so every BPM sub-tool shares one BpmSelectionProvider: the
        // chosen BPM / date / location survives navigation between them instead
        // of each page resetting its own picker. Paths are unchanged.
        // BpmConfigProvider sits here for the same reason: the settings
        // singleton and the row-colour rules are each read by several
        // components across several pages, and one provider fetches them once
        // instead of every consumer issuing its own request.
        path: 'bpm',
        element: (
          <BpmSelectionProvider>
            <BpmConfigProvider>
              <Outlet />
            </BpmConfigProvider>
          </BpmSelectionProvider>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="/bpm/overview" replace />,
          },
          {
            path: 'overview',
            element: lazyLoad(BpmOverviewPage),
          },
          {
            path: 'schedule',
            element: lazyLoad(BpmSchedulePage),
          },
          {
            path: 'add-guest',
            element: lazyLoad(BpmAddGuestPage),
          },
          {
            path: 'view-invites',
            element: lazyLoad(BpmViewInvitesPage),
          },
          {
            // Ordered after Guest Invites, and nested here like the rest so it
            // inherits the sticky BPM/date selection.
            path: 'associate-invites',
            element: lazyLoad(BpmAssociateInvitesPage),
          },
          {
            path: 'guest-checkin',
            element: lazyLoad(BpmGuestCheckinPage),
          },
          {
            path: 'associate-checkin',
            element: lazyLoad(BpmAssociateCheckinPage),
          },
          {
            path: 'settings',
            element: lazyLoad(BpmSettingsPage),
          },
        ],
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
        path: 'team/builders',
        element: lazyLoad(BuildersPage),
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
        path: 'admin/functions',
        element: <AdminRoute>{lazyLoad(FunctionsPage)}</AdminRoute>,
      },
      {
        path: 'admin/user-permissions',
        element: <AdminRoute>{lazyLoad(UserPermissionsPage)}</AdminRoute>,
      },
      {
        path: 'admin/level-permissions',
        element: <AdminRoute>{lazyLoad(LevelPermissionsPage)}</AdminRoute>,
      },
      {
        path: 'admin/file-vault',
        element: <AdminRoute>{lazyLoad(AdminFileVaultPage)}</AdminRoute>,
      },
      {
        path: 'admin/training-center',
        element: <AdminRoute>{lazyLoad(AdminTrainingCenterPage)}</AdminRoute>,
      },
      {
        path: 'admin/home-content',
        element: <AdminRoute>{lazyLoad(AdminHomeContentPage)}</AdminRoute>,
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

  // Public event pages (no auth required)
  {
    path: '/event/:shortcut',
    element: lazyLoad(EventLandingPage),
    errorElement: <RouteErrorFallback />,
  },
  {
    path: '/event/:shortcut/checkout',
    element: lazyLoad(EventCheckoutPage),
    errorElement: <RouteErrorFallback />,
  },
  {
    path: '/event/:shortcut/transfer',
    element: lazyLoad(EventTransferPage),
    errorElement: <RouteErrorFallback />,
  },
  {
    path: '/event/ticket/:qrToken',
    element: lazyLoad(EventTicketPage),
    errorElement: <RouteErrorFallback />,
  },
  // Unauthenticated, and must stay in step with `bpm.services.qr.guest_pass_url`,
  // which builds this path into every message a guest is sent.
  {
    path: '/bpm/pass/:token',
    element: lazyLoad(BpmGuestPassPage),
    errorElement: <RouteErrorFallback />,
  },

  // Catch all - 404
  {
    path: '*',
    element: <Navigate to="/" replace />,
    errorElement: <RouteErrorFallback />,
  },
]);

export { router };
export default router;
