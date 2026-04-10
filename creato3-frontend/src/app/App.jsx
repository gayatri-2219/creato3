import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Skeleton } from '../shared/Skeleton'

const lazyPage = (loader, exportName) =>
  lazy(() => loader().then((module) => ({ default: module[exportName] })))

const LandingPage = lazyPage(() => import('./pages/LandingPage.jsx'), 'LandingPage')
const DiscoverPage = lazyPage(() => import('./pages/DiscoverPage.jsx'), 'DiscoverPage')
const ArchitectureStoryPage = lazyPage(
  () => import('./pages/ArchitectureStoryPage.jsx'),
  'ArchitectureStoryPage'
)
const CreateProfilePage = lazyPage(
  () => import('./pages/CreateProfilePage.jsx'),
  'CreateProfilePage'
)
const LaunchPage = lazyPage(() => import('./pages/LaunchPage.jsx'), 'LaunchPage')
const CreatorPage = lazyPage(() => import('./pages/CreatorPage.jsx'), 'CreatorPage')
const SubscribePage = lazyPage(() => import('./pages/SubscribePage.jsx'), 'SubscribePage')
const MySubscriptionsPage = lazyPage(
  () => import('./pages/MySubscriptionsPage.jsx'),
  'MySubscriptionsPage'
)
const ProfilePage = lazyPage(() => import('./pages/ProfilePage.jsx'), 'ProfilePage')
const HackathonGuidePage = lazyPage(
  () => import('./pages/HackathonGuidePage.jsx'),
  'HackathonGuidePage'
)
const AgentsPage = lazyPage(() => import('./pages/AgentsPage.jsx'), 'AgentsPage')

function RouteFallback() {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-6xl flex-col gap-4 px-6 py-16">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-32 w-full rounded-[2rem]" />
      <Skeleton className="h-64 w-full rounded-[2rem]" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<Layout />} path="/">
            <Route element={<LandingPage />} index />
            <Route element={<DiscoverPage />} path="discover" />
            <Route element={<ArchitectureStoryPage />} path="architecture" />
            <Route element={<CreateProfilePage />} path="create-profile" />
            <Route element={<LaunchPage />} path="launch" />
            <Route element={<ProfilePage />} path="profile" />
            <Route element={<CreatorPage />} path="creator/:id" />
            <Route element={<SubscribePage />} path="subscribe" />
            <Route element={<MySubscriptionsPage />} path="subscriptions" />
            <Route element={<AgentsPage />} path="agents" />
            <Route element={<Navigate replace to="/create-profile" />} path="dashboard" />
            <Route element={<HackathonGuidePage />} path="build-guide" />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
