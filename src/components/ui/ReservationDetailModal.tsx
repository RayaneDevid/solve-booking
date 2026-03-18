import { useMemo, useState, type FormEvent } from 'react'
import { X, Calendar, Clock, Server as ServerIcon, Key, MapPin, FileText, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { MAPS, getStartTimeOptions, getEndTimeOptions, getEndTimeOptionsAdmin, isWeekend, timeToMinutesSince18 } from '@/lib/utils'
import type { Reservation, Profile } from '@/types/database'

interface ReservationDetailModalProps {
  reservation: Reservation
  profiles?: Record<string, Profile>
  onClose: () => void
  onUpdated: () => void
  allReservations: Reservation[]
}

export function ReservationDetailModal({ reservation, profiles = {}, onClose, onUpdated, allReservations }: ReservationDetailModalProps) {
  const { profile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const username = profiles[reservation.user_id]?.username || '...'
  const isAdmin = profile?.role === 'admin'
  const isOwner = profile?.id === reservation.user_id
  const canModify = isAdmin || (isOwner && reservation.status === 'pending')
  const canDelete = isOwner || isAdmin

  if (editing) {
    return (
      <EditReservationModal
        reservation={reservation}
        allReservations={allReservations}
        onClose={() => setEditing(false)}
        onUpdated={() => { onUpdated(); onClose() }}
      />
    )
  }

  const handleDelete = async () => {
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', reservation.id)

    if (!error) {
      onUpdated()
      onClose()
    }
  }

  const statusConfig = {
    pending: { label: 'En attente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
    accepted: { label: 'Acceptée', color: 'bg-green-500/20 text-green-400 border-green-500/40' },
    refused: { label: 'Refusée', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
  }
  const status = statusConfig[reservation.status]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-dark-800 border border-dark-500/50 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-500/30">
          <h2 className="text-lg font-semibold text-white">Détails de la réservation</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-dark-600 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Statut</span>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${status.color}`}>
              {status.label}
            </span>
          </div>

          {/* User */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Utilisateur</span>
            <span className="text-sm text-white font-medium">{username}</span>
          </div>

          {/* Date */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Date
            </span>
            <span className="text-sm text-white">{reservation.date}</span>
          </div>

          {/* Time */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Horaire
            </span>
            <span className="text-sm text-white">
              {reservation.start_time.slice(0, 5)} – {reservation.end_time.slice(0, 5)}
            </span>
          </div>

          {/* Map */}
          {reservation.requested_map && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> Map
              </span>
              <span className="text-sm text-white">{reservation.requested_map}</span>
            </div>
          )}

          {/* Requested server */}
          {reservation.assigned_server && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400 flex items-center gap-2">
                <ServerIcon className="w-3.5 h-3.5" /> Serveur demandé
              </span>
              <span className="text-sm text-white">Server Event {reservation.assigned_server}</span>
            </div>
          )}

          {/* Password (if accepted, only for owner or admin) */}
          {reservation.status === 'accepted' && reservation.server_password && (isOwner || isAdmin) && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400 flex items-center gap-2">
                <Key className="w-3.5 h-3.5" /> Mot de passe
              </span>
              <span className="text-sm text-white font-mono">{reservation.server_password}</span>
            </div>
          )}

          {/* Refusal reason */}
          {reservation.status === 'refused' && reservation.refusal_reason && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <p className="text-xs text-red-400">
                <span className="font-medium">Motif :</span> {reservation.refusal_reason}
              </p>
            </div>
          )}

          {/* Note */}
          {reservation.note && (
            <div className="bg-dark-700/50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                <FileText className="w-3 h-3" /> Note
              </p>
              <p className="text-sm text-gray-300">{reservation.note}</p>
            </div>
          )}

          {/* Actions */}
          {(canModify || canDelete) && (
            <div className="flex gap-3 pt-2 border-t border-dark-500/30">
              {canModify && (
                <button
                  onClick={() => setEditing(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent/20 text-accent text-sm font-medium hover:bg-accent/30 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Modifier
                </button>
              )}
              {canDelete && !deleting && (
                <button
                  onClick={() => setDeleting(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-600/20 text-red-400 text-sm font-medium hover:bg-red-600/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Annuler
                </button>
              )}
              {deleting && (
                <div className="flex-1 flex gap-2">
                  <button
                    onClick={() => setDeleting(false)}
                    className="flex-1 py-2.5 rounded-lg bg-dark-600 text-gray-300 text-xs font-medium hover:bg-dark-500 transition-colors"
                  >
                    Non
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-500 transition-colors"
                  >
                    Confirmer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EditReservationModal({ reservation, allReservations, onClose, onUpdated }: { reservation: Reservation; allReservations: Reservation[]; onClose: () => void; onUpdated: () => void }) {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [date, setDate] = useState(reservation.date)
  const [startTime, setStartTime] = useState(reservation.start_time.slice(0, 5))
  const [endTime, setEndTime] = useState(reservation.end_time.slice(0, 5))
  const [requestedMap, setRequestedMap] = useState(reservation.requested_map || '')
  const [assignedServer, setAssignedServer] = useState(reservation.assigned_server ? String(reservation.assigned_server) : '')
  const [note, setNote] = useState(reservation.note || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedDayOfWeek = date ? new Date(date).getDay() : null
  const startTimeOptions = getStartTimeOptions()
  const endTimeOptions = startTime && selectedDayOfWeek !== null
    ? (isAdmin ? getEndTimeOptionsAdmin(startTime, selectedDayOfWeek) : getEndTimeOptions(startTime, selectedDayOfWeek))
    : []

  // Serveurs déjà pris sur le créneau sélectionné (exclure la résa en cours d'édition)
  const takenServers = useMemo(() => {
    if (!date || !startTime || !endTime) return new Set<number>()
    const newStart = timeToMinutesSince18(startTime)
    const newEnd = timeToMinutesSince18(endTime)
    const taken = new Set<number>()
    for (const r of allReservations) {
      if (r.id === reservation.id) continue
      if (r.date !== date || !r.assigned_server) continue
      if (r.status === 'refused') continue
      const rStart = timeToMinutesSince18(r.start_time)
      const rEnd = timeToMinutesSince18(r.end_time)
      if (rStart < newEnd && rEnd > newStart) {
        taken.add(r.assigned_server)
      }
    }
    return taken
  }, [date, startTime, endTime, allReservations, reservation.id])

  if (assignedServer && takenServers.has(Number(assignedServer))) {
    setAssignedServer('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!date || !startTime || !endTime) {
        throw new Error('Veuillez remplir tous les champs obligatoires')
      }

      const { error: updateError } = await supabase
        .from('reservations')
        .update({
          date,
          start_time: startTime,
          end_time: endTime,
          requested_map: requestedMap || null,
          assigned_server: assignedServer ? Number(assignedServer) : null,
          note: note || null,
        })
        .eq('id', reservation.id)

      if (updateError) throw new Error(updateError.message)

      onUpdated()
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
          <h2 className="text-lg font-semibold text-white">Modifier la réservation</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-dark-600 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Calendar className="w-4 h-4" /> Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setStartTime(''); setEndTime('') }}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Clock className="w-4 h-4" /> Heure de début
            </label>
            <select
              value={startTime}
              onChange={(e) => { setStartTime(e.target.value); setEndTime('') }}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
              required
              disabled={!date}
            >
              <option value="">Sélectionner</option>
              {startTimeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Clock className="w-4 h-4" /> Heure de fin
            </label>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
              required
              disabled={!startTime}
            >
              <option value="">Sélectionner</option>
              {endTimeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <MapPin className="w-4 h-4" /> Map demandée
            </label>
            <select
              value={requestedMap}
              onChange={(e) => setRequestedMap(e.target.value)}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
            >
              <option value="">Aucune</option>
              {MAPS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <ServerIcon className="w-4 h-4" /> Serveur demandé
            </label>
            <select
              value={assignedServer}
              onChange={(e) => setAssignedServer(e.target.value)}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
            >
              <option value="">Aucun</option>
              {[1, 2, 3].map((s) => (
                <option key={s} value={s} disabled={takenServers.has(s)}>
                  Server Event {s}{takenServers.has(s) ? ' (indisponible)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <FileText className="w-4 h-4" /> Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Informations supplémentaires..."
              rows={3}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors resize-none"
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
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:from-blue-500 hover:to-cyan-400 transition-all disabled:opacity-50">
              {loading ? 'Mise à jour...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
