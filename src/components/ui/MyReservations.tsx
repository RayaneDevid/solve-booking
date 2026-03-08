import { useState } from 'react'
import type { Reservation } from '@/types/database'
import { SERVER_COLORS } from '@/lib/utils'
import { Clock, Calendar, MessageSquare, Key, Server } from 'lucide-react'

interface MyReservationsProps {
  reservations: Reservation[]
}

type FilterTab = 'pending' | 'accepted' | 'past'

export function MyReservations({ reservations }: MyReservationsProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('pending')

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  const pending = reservations.filter((r) => r.status === 'pending')
  const accepted = reservations.filter((r) => r.status === 'accepted' && r.date >= todayStr)
  const past = reservations.filter(
    (r) => r.date < todayStr || r.status === 'refused'
  )

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'pending', label: 'En attente', count: pending.length },
    { key: 'accepted', label: 'Acceptées', count: accepted.length },
    { key: 'past', label: 'Passées', count: past.length },
  ]

  const displayed = activeTab === 'pending' ? pending : activeTab === 'accepted' ? accepted : past

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-white mb-4">Mes Réservations</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-accent/20 text-accent border border-accent/40'
                : 'bg-dark-700 text-gray-400 border border-dark-500/50 hover:text-gray-200'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {displayed.length === 0 ? (
          <div className="bg-dark-800/50 border border-dark-500/30 rounded-xl px-6 py-8 text-center">
            <p className="text-sm text-gray-500">Aucune réservation dans cette catégorie</p>
          </div>
        ) : (
          displayed.map((res) => (
            <ReservationCard key={res.id} reservation={res} />
          ))
        )}
      </div>
    </div>
  )
}

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const statusConfig = {
    pending: { label: 'En attente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
    accepted: { label: 'Acceptée', color: 'bg-green-500/20 text-green-400 border-green-500/40' },
    refused: { label: 'Refusée', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
  }

  const status = statusConfig[reservation.status]

  return (
    <div className="bg-dark-800/70 border border-dark-500/30 rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{reservation.date}</p>
            <p className="text-xs text-gray-400">
              {reservation.start_time.slice(0, 5)} – {reservation.end_time.slice(0, 5)}
            </p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${status.color}`}>
          {status.label}
        </span>
      </div>

      {/* Server info (si accepté) */}
      {reservation.status === 'accepted' && reservation.assigned_server && (
        <div className="flex gap-3 mb-3">
          <div className="flex items-center gap-2 bg-dark-700 rounded-lg px-3 py-2">
            <Server className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-300">
              Serveur {reservation.assigned_server}
            </span>
          </div>
          {reservation.server_password && (
            <div className="flex items-center gap-2 bg-dark-700 rounded-lg px-3 py-2">
              <Key className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-300 font-mono">
                {reservation.server_password}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Motif de refus */}
      {reservation.status === 'refused' && reservation.refusal_reason && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-red-400">
            <span className="font-medium">Motif :</span> {reservation.refusal_reason}
          </p>
        </div>
      )}

      {/* Note */}
      {reservation.note && (
        <div className="bg-dark-700/50 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-400">{reservation.note}</p>
        </div>
      )}
    </div>
  )
}
