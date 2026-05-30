import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import BlogList from './pages/BlogList'
import BlogDetail from './pages/BlogDetail'
import Editor from './pages/Editor'
import About from './pages/About'
import ForgotPassword from './pages/ForgotPassword'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="blogs" element={<BlogList />} />
            <Route path="blog/:id" element={<BlogDetail />} />
            <Route path="editor" element={<Editor />} />
            <Route path="editor/:id" element={<Editor />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="profile/:id" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="about" element={<About />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
