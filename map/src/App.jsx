import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import BlogList from './pages/BlogList'
import BlogDetail from './pages/BlogDetail'
import About from './pages/About'
import ForgotPassword from './pages/ForgotPassword'

const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))
const Editor = lazy(() => import('./pages/Editor'))
const Admin = lazy(() => import('./pages/Admin'))
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'))
const MediaLibrary = lazy(() => import('./pages/MediaLibrary'))

function Lazy({ children }) {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      {children}
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="blogs" element={<BlogList />} />
            <Route path="blog/:id" element={<BlogDetail />} />
            <Route path="editor" element={<Lazy><Editor /></Lazy>} />
            <Route path="editor/:id" element={<Lazy><Editor /></Lazy>} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="profile/:id" element={<Lazy><Profile /></Lazy>} />
            <Route path="settings" element={<Lazy><Settings /></Lazy>} />
            <Route path="about" element={<About />} />
            <Route path="admin" element={<Lazy><Admin /></Lazy>} />
            <Route path="oauth-callback" element={<Lazy><OAuthCallback /></Lazy>} />
            <Route path="media" element={<Lazy><MediaLibrary /></Lazy>} />
          </Route>
        </Routes>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
