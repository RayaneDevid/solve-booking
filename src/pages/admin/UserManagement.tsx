import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { UserPlus, X, Users, Shield, User } from 'lucide-react'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import type { Profile } from '@/types/database'

export function UserManagement() {
  const [users, setUsers] = useState<Profile[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })

    if (data) {
      setUsers(data as Profile[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleDeactivate = async (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !user.is_active })
      .eq('id', userId)

    if (!error) {
      fetchUsers()
    }
  }

  const activeUsers = users.filter((u) => u.is_active)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestion des Utilisateurs</h1>
          <p className="text-sm text-gray-400 mt-1">Créez et gérez les comptes utilisateurs</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:from-blue-500 hover:to-cyan-400 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Créer un utilisateur
        </button>
      </div>

      {/* Active Users */}
      <h2 className="text-base font-semibold text-white mb-4">
        Utilisateurs actifs ({activeUsers.length})
      </h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onDeactivate={() => handleDeactivate(user.id)}
            />
          ))}
        </div>
      )}

      {/* Create User Modal */}
      {showModal && (
        <CreateUserModal
          onClose={() => setShowModal(false)}
          onCreated={fetchUsers}
        />
      )}
    </div>
  )
}

function UserCard({ user, onDeactivate }: { user: Profile; onDeactivate: () => void }) {
  const initial = user.username.charAt(0).toUpperCase()
  const roleColor = user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
  const roleIcon = user.role === 'admin' ? Shield : User

  return (
    <div className={`bg-dark-800/70 border rounded-xl p-4 ${
      user.is_active ? 'border-dark-500/30' : 'border-red-500/20 opacity-60'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
            user.role === 'admin' ? 'bg-purple-500/30 text-purple-400' : 'bg-accent/30 text-accent'
          }`}>
            {initial}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{user.username}</p>
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${roleColor}`}>
              {user.role === 'admin' ? 'Admin' : 'User'}
            </span>
          </div>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
          user.is_active
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'
        }`}>
          {user.is_active ? 'Actif' : 'Inactif'}
        </span>
      </div>

      {user.role !== 'admin' && (
        <button
          onClick={onDeactivate}
          className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${
            user.is_active
              ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
              : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
          }`}
        >
          {user.is_active ? 'Désactiver' : 'Réactiver'}
        </button>
      )}
    </div>
  )
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!username.trim() || !password.trim()) {
        throw new Error('Veuillez remplir tous les champs')
      }

      // Créer l'utilisateur via le client isolé (ne touche pas à la session admin)
      const { error: signUpError } = await supabaseAdmin.auth.signUp({
        email: username.trim().toLowerCase(),
        password,
        options: {
          data: {
            username: username.trim(),
            role: 'user',
          },
        },
      })

      if (signUpError) {
        throw new Error(signUpError.message)
      }

      onCreated()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-dark-800 border border-dark-500/50 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-dark-500/30">
          <h2 className="text-lg font-semibold text-white">Créer un utilisateur</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-dark-600 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nom d'utilisateur</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Entrez le nom d'utilisateur"
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Mot de passe</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Entrez le mot de passe"
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
              required
            />
          </div>

          <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3">
            <span className="text-xs text-blue-300">
              Les nouveaux utilisateurs seront créés avec le rôle 'user' et le statut actif.
            </span>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-lg bg-dark-600 text-gray-300 text-sm font-medium hover:bg-dark-500 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:from-blue-500 hover:to-cyan-400 transition-all disabled:opacity-50">
              {loading ? 'Création...' : 'Créer l\'utilisateur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
