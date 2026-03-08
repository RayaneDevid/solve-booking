import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute, AdminRoute, PublicRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { PublicCalendar } from '@/pages/PublicCalendar'
import { UserDashboard } from '@/pages/user/UserDashboard'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { UserManagement } from '@/pages/admin/UserManagement'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Vue publique calendrier */}
          <Route path="/" element={<PublicCalendar />} />

          {/* Public routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* User routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<UserDashboard />} />
            </Route>
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<UserManagement />} />
              </Route>
            </Route>
          </Route>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
