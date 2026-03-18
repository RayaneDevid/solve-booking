import { useMemo, useState, type FormEvent } from 'react'
import { X, Calendar, Clock, FileText, Info, MapPin, Server } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getEndTimeOptions, getEndTimeOptionsAdmin, getStartTimeOptions, timeToMinutesSince18, MAPS } from '@/lib/utils'
import type { Reservation } from '@/types/database'

interface NewReservationModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  reservations: Reservation[]
}

export function NewReservationModal({ isOpen, onClose, onCreated, reservations }: NewReservationModalProps) {
  const { profile } = useAuth()
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [requestedMap, setRequestedMap] = useState('')
  const [assignedServer, setAssignedServer] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Serveurs déjà pris sur le créneau sélectionné
  const takenServers = useMemo(() => {
    if (!date || !startTime || !endTime) return new Set<number>()
    const newStart = timeToMinutesSince18(startTime)
    const newEnd = timeToMinutesSince18(endTime)
    const taken = new Set<number>()
    for (const r of reservations) {
      if (r.date !== date || !r.assigned_server) continue
      if (r.status === 'refused') continue
      const rStart = timeToMinutesSince18(r.start_time)
      const rEnd = timeToMinutesSince18(r.end_time)
      if (rStart < newEnd && rEnd > newStart) {
        taken.add(r.assigned_server)
      }
    }
    return taken
  }, [date, startTime, endTime, reservations])

  if (!isOpen) return null

  // Reset le serveur si le créneau change et qu'il est devenu indisponible
  if (assignedServer && takenServers.has(Number(assignedServer))) {
    setAssignedServer('')
  }

  const isAdmin = profile?.role === 'admin'
  const selectedDayOfWeek = date ? new Date(date).getDay() : null
  const startTimeOptions = getStartTimeOptions()
  const endTimeOptions = startTime && selectedDayOfWeek !== null
    ? (isAdmin ? getEndTimeOptionsAdmin(startTime, selectedDayOfWeek) : getEndTimeOptions(startTime, selectedDayOfWeek))
    : []

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setError('')
    setLoading(true)

    try {
      // Validation côté client
      if (!date || !startTime || !endTime) {
        throw new Error('Veuillez remplir tous les champs obligatoires')
      }

      const { error: insertError } = await supabase
        .from('reservations')
        .insert({
          user_id: profile.id,
          date,
          start_time: startTime,
          end_time: endTime,
          requested_map: requestedMap || null,
          assigned_server: assignedServer ? Number(assignedServer) : null,
          note: note || null,
          ...(isAdmin ? {
            status: 'accepted' as const,
            reviewed_by: profile.id,
            reviewed_at: new Date().toISOString(),
          } : {}),
        })

      if (insertError) {
        throw new Error(insertError.message)
      }

      // Succès
      setDate('')
      setStartTime('')
      setEndTime('')
      setRequestedMap('')
      setAssignedServer('')
      setNote('')
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-dark-800 border border-dark-500/50 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-500/30">
          <h2 className="text-lg font-semibold text-white">Nouvelle Réservation</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-dark-600 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Date */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Calendar className="w-4 h-4" />
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setStartTime('')
                setEndTime('')
              }}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
              required
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Clock className="w-4 h-4" />
              Heure de début
            </label>
            <select
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value)
                setEndTime('')
              }}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
              required
              disabled={!date}
            >
              <option value="">Sélectionner</option>
              {startTimeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* End Time */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Clock className="w-4 h-4" />
              Heure de fin{!isAdmin && ' (max 2 heures)'}
            </label>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
              required
              disabled={!startTime}
            >
              <option value="">Sélectionner</option>
              {endTimeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Map */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <MapPin className="w-4 h-4" />
              Map demandée
            </label>
            <select
              value={requestedMap}
              onChange={(e) => setRequestedMap(e.target.value)}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
            >
              <option value="">Aucune</option>
              {MAPS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Server */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Server className="w-4 h-4" />
              Serveur demandé
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

          {/* Note */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <FileText className="w-4 h-4" />
              Raison de la réservation (obligatoire)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Informations supplémentaires..."
              rows={3}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors resize-none"
            />
          </div>

          {/* Info */}
          {!isAdmin && (
            <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-300">
                L'attribution du serveur sera confirmée par un admin dans les 24 à 72 heures.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg bg-dark-600 text-gray-300 text-sm font-medium hover:bg-dark-500 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:from-blue-500 hover:to-cyan-400 transition-all disabled:opacity-50"
            >
              {loading ? 'Envoi...' : isAdmin ? 'Créer la réservation' : 'Demander la réservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
