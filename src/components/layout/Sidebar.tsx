import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LayoutDashboard, Users, LogOut, KeyRound } from 'lucide-react'
import { ChangePasswordModal } from '@/components/ui/ChangePasswordModal'
import logoImg from '@/assets/logo.png'

export function Sidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isAdmin = profile?.role === 'admin'

  const navItems = isAdmin
    ? [
        { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/admin/users', icon: Users, label: 'Gestion Utilisateurs' },
      ]
    : [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-dark-800 border-r border-dark-500/50 flex flex-col z-40">
      {/* Logo */}
      <div className="p-4 border-b border-dark-500/50">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="Solve" className="w-9 h-9 rounded-lg object-cover" />
          <div>
            <h1 className="text-sm font-bold text-white">Solve - Réservations</h1>
            <p className="text-[10px] text-gray-500">Server booking system</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-accent/20 text-accent font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-dark-600'
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User info + Actions */}
      <div className="p-3 border-t border-dark-500/50">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center text-sm font-bold text-accent uppercase">
            {profile?.username?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.username}</p>
            <p className="text-[11px] text-gray-500 capitalize">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-dark-600 transition-colors"
        >
          <KeyRound className="w-4 h-4" />
          Modifier le mot de passe
        </button>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-dark-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </aside>
  )
}
