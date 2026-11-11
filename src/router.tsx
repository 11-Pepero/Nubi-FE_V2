import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireAuth } from '@/auth/RequireAuth'
import { LoadingState } from '@/components/ui'

const LandingPage = lazy(() => import('@/pages/landing/LandingPage'))
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const SignUpPage = lazy(() => import('@/pages/auth/SignUpPage'))
const SupportPage = lazy(() => import('@/pages/support/SupportPage'))
const EligiblePage = lazy(() => import('@/pages/eligible/EligiblePage'))
const ProgramDetailPage = lazy(() => import('@/pages/eligible/ProgramDetailPage'))
const ProgramExplorePage = lazy(() => import('@/pages/programs/ProgramExplorePage'))
const MyApplicationsPage = lazy(() => import('@/pages/applications/MyApplicationsPage'))
const ReviewWritePage = lazy(() => import('@/pages/applications/ReviewWritePage'))
const PreparePage = lazy(() => import('@/pages/prepare/PreparePage'))
const MyEventsPage = lazy(() => import('@/pages/events/MyEventsPage'))
const EventFormPage = lazy(() => import('@/pages/events/EventFormPage'))
const EventApplicationsPage = lazy(() => import('@/pages/events/EventApplicationsPage'))
const EventNeedsPage = lazy(() => import('@/pages/events/EventNeedsPage'))
const EventReviewsPage = lazy(() => import('@/pages/events/EventReviewsPage'))
const BlindSpotMapPage = lazy(() => import('@/pages/map/BlindSpotMapPage'))
const AppearancePage = lazy(() => import('@/pages/settings/AppearancePage'))

const page = (node: ReactNode) => <Suspense fallback={<LoadingState />}>{node}</Suspense>

/**
 * 화면 번호(Figma Frame 7) ↔ 주소
 * 17 /            18 /login        19~21 /signup
 * 01 /app/support             02 /app/support/care
 * 03 /app/eligible            09 /app/programs/:programId
 * 04 /app/programs            08 /app/prepare?programId=&groupId=
 * 05 /app/applications        15 /app/applications/:applicationId/review
 * 06 /app/events/new (수정: /app/events/:eventId/edit)
 * 11 /app/events              12 /app/events/:eventId/applications
 * 13 /app/events/:eventId/applications/:applicationId
 * 14 /app/events/:eventId/needs   16 /app/events/:eventId/reviews
 * 07 /app/map                 10 사이드바 알림 벨 (NotificationPanel)
 * 화면 설정 /app/settings/appearance (테마·모드·명암·불투명도)
 */
export const router = createBrowserRouter([
  { path: '/', element: page(<LandingPage />) },
  { path: '/login', element: page(<LoginPage />) },
  { path: '/signup', element: page(<SignUpPage />) },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/app',
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/app/eligible" replace /> },
          { path: 'support', element: page(<SupportPage />) },
          { path: 'support/care', element: page(<SupportPage />) },
          { path: 'eligible', element: page(<EligiblePage />) },
          { path: 'programs', element: page(<ProgramExplorePage />) },
          { path: 'programs/:programId', element: page(<ProgramDetailPage />) },
          { path: 'prepare', element: page(<PreparePage />) },
          { path: 'applications', element: page(<MyApplicationsPage />) },
          { path: 'applications/:applicationId/review', element: page(<ReviewWritePage />) },
          { path: 'events', element: page(<MyEventsPage />) },
          { path: 'events/new', element: page(<EventFormPage />) },
          { path: 'events/:eventId/edit', element: page(<EventFormPage />) },
          { path: 'events/:eventId', element: <Navigate to="applications" replace /> },
          { path: 'events/:eventId/applications', element: page(<EventApplicationsPage />) },
          { path: 'events/:eventId/applications/:applicationId', element: page(<EventApplicationsPage />) },
          { path: 'events/:eventId/needs', element: page(<EventNeedsPage />) },
          { path: 'events/:eventId/reviews', element: page(<EventReviewsPage />) },
          { path: 'map', element: page(<BlindSpotMapPage />) },
          { path: 'settings', element: <Navigate to="/app/settings/appearance" replace /> },
          { path: 'settings/appearance', element: page(<AppearancePage />) },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
