import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Reservation, Profile } from '@/types/database'
import {
  JOURS,
  SERVER_COLORS,
  getAllCalendarHours,
  timeToMinutesSince18,
  durationInMinutes,
  formatWeekRange,
  formatDateISO,
  isToday,
  isWeekend,
} from '@/lib/utils'

interface WeeklyCalendarProps {
  weekDays: Date[]
  monday: Date
  reservations: Reservation[]
  profiles?: Record<string, Profile>
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
  serverFilter?: number | null // null = tous les serveurs
}

export function WeeklyCalendar({
  weekDays,
  monday,
  reservations,
  profiles = {},
  onPrevWeek,
  onNextWeek,
  onToday,
  serverFilter = null,
}: WeeklyCalendarProps) {
  const allHours = getAllCalendarHours()
  
  // Nombre total de lignes (heures) - on va jusqu'à 04:00 max
  // Chaque heure = 60px de hauteur
  const HOUR_HEIGHT = 60

  // Grouper les réservations par jour
  const reservationsByDay = useMemo(() => {
    const map: Record<string, Reservation[]> = {}
    
    for (const day of weekDays) {
      const dateStr = formatDateISO(day)
      map[dateStr] = reservations.filter((r) => {
        if (r.date !== dateStr) return false
        if (serverFilter && r.status === 'accepted' && r.assigned_server !== serverFilter) return false
        return true
      })
    }
    
    return map
  }, [weekDays, reservations, serverFilter])

  return (
    <div className="bg-dark-800/50 border border-dark-500/30 rounded-xl overflow-hidden">
      {/* Header navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-500/30">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevWeek}
            className="p-1.5 rounded-lg hover:bg-dark-600 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNextWeek}
            className="p-1.5 rounded-lg hover:bg-dark-600 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={onToday}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-dark-600 text-gray-300 hover:bg-dark-500 transition-colors"
          >
            Aujourd'hui
          </button>
        </div>
        <span className="text-sm font-medium text-white">
          {formatWeekRange(monday)}
        </span>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day headers */}
          <div className="grid grid-cols-[70px_repeat(7,1fr)] border-b border-dark-500/30">
            <div className="px-2 py-3 text-[10px] font-medium text-gray-500 uppercase text-center">
              Heure
            </div>
            {weekDays.map((day, i) => {
              const today = isToday(day)
              return (
                <div
                  key={i}
                  className={`px-2 py-3 text-center border-l border-dark-500/30 ${
                    today ? 'bg-accent/5' : ''
                  }`}
                >
                  <div className="text-[10px] font-medium text-gray-500 uppercase">
                    {JOURS[i].slice(0, 3)}
                  </div>
                  <div
                    className={`text-lg font-bold mt-0.5 ${
                      today ? 'text-accent' : 'text-white'
                    }`}
                  >
                    {day.getDate().toString().padStart(2, '0')}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time grid */}
          <div className="relative">
            {allHours.slice(0, -1).map((hour, hourIndex) => (
              <div
                key={hour}
                className="grid grid-cols-[70px_repeat(7,1fr)]"
                style={{ height: `${HOUR_HEIGHT}px` }}
              >
                {/* Time label */}
                <div className="px-2 flex items-start pt-0 justify-center border-t border-dark-500/20">
                  <span className="text-[11px] text-gray-500 -translate-y-2">
                    {hour}
                  </span>
                </div>

                {/* Day cells */}
                {weekDays.map((day, dayIndex) => {
                  const dateStr = formatDateISO(day)
                  const dayOfWeek = day.getDay()
                  const maxHour = isWeekend(dayOfWeek) ? 4 : 3
                  
                  // Déterminer si cette cellule est hors limites
                  const [hourNum] = hour.split(':').map(Number)
                  const isOutOfRange = hourNum < 18 && hourNum >= maxHour

                  return (
                    <div
                      key={dayIndex}
                      className={`relative border-l border-t border-dark-500/20 ${
                        isToday(day) ? 'bg-accent/[0.02]' : ''
                      } ${isOutOfRange ? 'bg-dark-900/50' : ''}`}
                    >
                      {/* Réservations dans cette cellule — seulement pour la première heure */}
                      {hourIndex === 0 && (
                        <ReservationBlocks
                          reservations={reservationsByDay[dateStr] || []}
                          profiles={profiles}
                          hourHeight={HOUR_HEIGHT}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center justify-center gap-6 px-4 py-3 border-t border-dark-500/30">
        {[1, 2, 3].map((server) => (
          <div key={server} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${SERVER_COLORS[server as 1|2|3].dot}`} />
            <span className="text-xs text-gray-400">{SERVER_COLORS[server as 1|2|3].label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-500 border border-dashed border-gray-400" />
          <span className="text-xs text-gray-400">En attente</span>
        </div>
      </div>
    </div>
  )
}

// Sous-composant pour afficher les blocs de réservation
function ReservationBlocks({
  reservations,
  profiles,
  hourHeight,
}: {
  reservations: Reservation[]
  profiles: Record<string, Profile>
  hourHeight: number
}) {
  if (reservations.length === 0) return null

  // Grouper les réservations par créneau qui se chevauchent
  const sortedReservations = [...reservations].sort(
    (a, b) => timeToMinutesSince18(a.start_time) - timeToMinutesSince18(b.start_time)
  )

  // Détecter les overlaps et assigner des colonnes
  const positioned = assignColumns(sortedReservations)

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {positioned.map(({ reservation, column, totalColumns }) => {
        const top = timeToMinutesSince18(reservation.start_time) * (hourHeight / 60)
        const height = durationInMinutes(reservation.start_time, reservation.end_time) * (hourHeight / 60)
        const width = `${100 / totalColumns}%`
        const left = `${(column / totalColumns) * 100}%`

        const username = profiles[reservation.user_id]?.username || '...'
        const timeLabel = `${reservation.start_time.slice(0, 5)}-${reservation.end_time.slice(0, 5)}`

        if (reservation.status === 'pending') {
          return (
            <div
              key={reservation.id}
              className="absolute rounded-md border-2 border-dashed border-gray-500/60 bg-gray-600/30 px-1.5 py-1 overflow-hidden pointer-events-auto"
              style={{ top: `${top}px`, height: `${height}px`, width, left }}
            >
              <p className="text-[10px] font-medium text-gray-300 truncate">{username}</p>
              <p className="text-[9px] text-gray-500">{timeLabel}</p>
              <span className="text-[9px] text-yellow-400">En attente</span>
            </div>
          )
        }

        if (reservation.status === 'refused') {
          return (
            <div
              key={reservation.id}
              className="absolute rounded-md bg-red-900/40 border border-red-800/50 px-1.5 py-1 overflow-hidden opacity-40 pointer-events-auto"
              style={{ top: `${top}px`, height: `${height}px`, width, left }}
            >
              <p className="text-[10px] font-medium text-red-300 line-through truncate">{username}</p>
              <p className="text-[9px] text-red-400">{timeLabel}</p>
              <span className="text-[9px] text-red-400 font-medium">Refusée</span>
            </div>
          )
        }

        // Accepted
        const server = reservation.assigned_server as 1 | 2 | 3
        const colors = SERVER_COLORS[server] || SERVER_COLORS[1]

        // Vérifier si complet (3 serveurs réservés au même créneau)
        const overlapping = reservations.filter(
          (r) =>
            r.status === 'accepted' &&
            r.id !== reservation.id &&
            timeToMinutesSince18(r.start_time) < timeToMinutesSince18(reservation.end_time) &&
            timeToMinutesSince18(r.end_time) > timeToMinutesSince18(reservation.start_time)
        )
        const isComplete = overlapping.length >= 2

        return (
          <div
            key={reservation.id}
            className={`absolute rounded-md ${colors.bg} ${colors.border} border px-1.5 py-1 overflow-hidden pointer-events-auto`}
            style={{ top: `${top}px`, height: `${height}px`, width, left }}
          >
            {isComplete && (
              <span className="absolute top-0.5 right-0.5 text-[8px] bg-red-500 text-white px-1 rounded font-bold">
                COMPLET
              </span>
            )}
            <p className="text-[10px] font-bold text-white truncate">{username}</p>
            <p className="text-[9px] text-white/80">{timeLabel}</p>
            <p className="text-[9px] text-white/70">S{server}</p>
          </div>
        )
      })}
    </div>
  )
}

// Algorithme d'assignation de colonnes pour les réservations qui se chevauchent
function assignColumns(reservations: Reservation[]) {
  const result: { reservation: Reservation; column: number; totalColumns: number }[] = []
  const groups: Reservation[][] = []

  // Regrouper les réservations qui se chevauchent
  for (const res of reservations) {
    let placed = false
    for (const group of groups) {
      const overlaps = group.some(
        (r) =>
          timeToMinutesSince18(r.start_time) < timeToMinutesSince18(res.end_time) &&
          timeToMinutesSince18(r.end_time) > timeToMinutesSince18(res.start_time)
      )
      if (overlaps) {
        group.push(res)
        placed = true
        break
      }
    }
    if (!placed) {
      groups.push([res])
    }
  }

  // Pour chaque groupe, assigner des colonnes
  for (const group of groups) {
    const totalColumns = group.length
    group.forEach((reservation, index) => {
      result.push({ reservation, column: index, totalColumns })
    })
  }

  return result
}
