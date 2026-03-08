import { useState, type FormEvent } from 'react'
import { X, Server, Key, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Reservation, Profile } from '@/types/database'

interface AcceptModalProps {
  reservation: Reservation
  profiles: Record<string, Profile>
  existingServers: number[] // Serveurs déjà réservés sur ce créneau
  onClose: () => void
  onDone: () => void
}

export function AcceptModal({ reservation, profiles, existingServers, onClose, onDone }: AcceptModalProps) {
  const { profile } = useAuth()
  const [server, setServer] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const username = profiles[reservation.user_id]?.username || '...'
  const availableServers = [1, 2, 3].filter((s) => !existingServers.includes(s))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setError('')
    setLoading(true)

    try {
      if (!server || !password) {
        throw new Error('Veuillez remplir tous les champs')
      }

      const { error: updateError } = await supabase
        .from('reservations')
        .update({
          status: 'accepted',
          assigned_server: Number(server),
          server_password: password,
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reservation.id)

      if (updateError) throw new Error(updateError.message)

      onDone()
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
          <h2 className="text-lg font-semibold text-white">Accepter la demande</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-dark-600 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="bg-dark-700/50 rounded-lg p-3 mb-4">
            <p className="text-sm text-white font-medium">{username}</p>
            <p className="text-xs text-gray-400">{reservation.date} · {reservation.start_time.slice(0, 5)} – {reservation.end_time.slice(0, 5)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Server className="w-4 h-4" />
              Serveur à attribuer
            </label>
            <select
              value={server}
              onChange={(e) => setServer(e.target.value)}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
              required
            >
              <option value="">Sélectionner un serveur</option>
              {[1, 2, 3].map((s) => (
                <option key={s} value={s} disabled={existingServers.includes(s)}>
                  Serveur {s} {existingServers.includes(s) ? '(occupé)' : '(disponible)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Key className="w-4 h-4" />
              Mot de passe du serveur
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe à communiquer"
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
              required
            />
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
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-500 transition-all disabled:opacity-50">
              {loading ? 'Validation...' : 'Accepter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface RefuseModalProps {
  reservation: Reservation
  profiles: Record<string, Profile>
  onClose: () => void
  onDone: () => void
}

export function RefuseModal({ reservation, profiles, onClose, onDone }: RefuseModalProps) {
  const { profile } = useAuth()
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const username = profiles[reservation.user_id]?.username || '...'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setError('')
    setLoading(true)

    try {
      if (!reason.trim()) {
        throw new Error('Le motif de refus est obligatoire')
      }

      const { error: updateError } = await supabase
        .from('reservations')
        .update({
          status: 'refused',
          refusal_reason: reason,
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reservation.id)

      if (updateError) throw new Error(updateError.message)

      onDone()
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
          <h2 className="text-lg font-semibold text-white">Refuser la demande</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-dark-600 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="bg-dark-700/50 rounded-lg p-3 mb-4">
            <p className="text-sm text-white font-medium">{username}</p>
            <p className="text-xs text-gray-400">{reservation.date} · {reservation.start_time.slice(0, 5)} – {reservation.end_time.slice(0, 5)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <MessageSquare className="w-4 h-4" />
              Motif du refus
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indiquez la raison du refus..."
              rows={3}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors resize-none"
              required
            />
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
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-all disabled:opacity-50">
              {loading ? 'Envoi...' : 'Refuser'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
