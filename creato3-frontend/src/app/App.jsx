import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LandingPage } from './pages/LandingPage'
import { DiscoverPage } from './pages/DiscoverPage'
import { ArchitectureStoryPage } from './pages/ArchitectureStoryPage'
import { CreateProfilePage } from './pages/CreateProfilePage'
import { LaunchPage } from './pages/LaunchPage'
import { CreatorPage } from './pages/CreatorPage'
import { SubscribePage } from './pages/SubscribePage'
import { HackathonGuidePage } from '../components/HackathonGuidePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />} path="/">
          <Route element={<LandingPage />} index />
          <Route element={<DiscoverPage />} path="discover" />
          <Route element={<ArchitectureStoryPage />} path="architecture" />
          <Route element={<CreateProfilePage />} path="create-profile" />
          <Route element={<LaunchPage />} path="launch" />
          <Route element={<CreatorPage />} path="creator/:id" />
          <Route element={<SubscribePage />} path="subscribe" />
          <Route element={<Navigate replace to="/create-profile" />} path="dashboard" />
          <Route element={<HackathonGuidePage />} path="build-guide" />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
