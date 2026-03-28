import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import Layout from './src/components/Layout'
import LoginPage from './src/pages/LoginPage'
import RegisterPage from './src/pages/RegisterPage'
import ChatPage from './src/pages/ChatPage'
import PrivateChatPage from './src/pages/PrivateChatPage'
import DashboardPage from './src/pages/DashboardPage'

function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-900 grid-bg">
        <div className="glass rounded-2xl px-6 py-4 text-sm font-mono text-slate-400">
          Loading SecureAI...
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Layout />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'admin') {
    return <Navigate to="/chat" replace />
  }

  return children
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return null
  }

  return user ? <Navigate to="/chat" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />

        <Route element={<ProtectedLayout />}>
          <Route index element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/messages" element={<PrivateChatPage />} />
          <Route
            path="/dashboard"
            element={
              <AdminRoute>
                <DashboardPage />
              </AdminRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </AuthProvider>
  )
}
