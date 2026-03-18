import { useCallback, useEffect, useMemo, useState } from 'react'
import { LogIn, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { WeeklyCalendar } from '@/components/calendar/WeeklyCalendar'
import { ReservationDetailModal } from '@/components/ui/ReservationDetailModal'
import { getMonday, getWeekDays, formatDateISO } from '@/lib/utils'
import type { Reservation, Profile } from '@/types/database'
import logoImg from '@/assets/logo.png'

export function PublicCalendar() {
  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()))
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

  const weekDays = useMemo(() => getWeekDays(currentMonday), [currentMonday])

  const fetchReservations = useCallback(async () => {
    const startDate = formatDateISO(weekDays[0])
    const endDate = formatDateISO(weekDays[6])

    const { data: weekRes } = await supabase
      .from('reservations')
      .select('*')
      .eq('status', 'accepted')
      .gte('date', startDate)
      .lte('date', endDate)

    if (weekRes) {
      setReservations(weekRes as Reservation[])

      const userIds = [...new Set((weekRes as Reservation[]).map((r) => r.user_id))]
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, role, is_active, created_at')
          .in('id', userIds)

        if (profilesData) {
          const profileMap: Record<string, Profile> = {}
          ;(profilesData as Profile[]).forEach((p) => { profileMap[p.id] = p })
          setProfiles(profileMap)
        }
      }
    }
  }, [weekDays])

  useEffect(() => {
    fetchReservations()
  }, [fetchReservations])

  useEffect(() => {
    const channel = supabase
      .channel('public-reservations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
        fetchReservations()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchReservations])

  const handlePrevWeek = () => {
    const prev = new Date(currentMonday)
    prev.setDate(prev.getDate() - 7)
    setCurrentMonday(prev)
  }

  const handleNextWeek = () => {
    const next = new Date(currentMonday)
    next.setDate(next.getDate() + 7)
    setCurrentMonday(next)
  }

  const handleToday = () => {
    setCurrentMonday(getMonday(new Date()))
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="border-b border-dark-500/30 bg-dark-800/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Solve" className="w-9 h-9 rounded-lg object-cover" />
            <div>
              <h1 className="text-sm font-bold text-white">Solve - Réservations</h1>
              <p className="text-[10px] text-gray-500">Consultez les réservations en cours</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://connect.solve-community.fr/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium overflow-hidden transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 active:scale-95"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-[length:200%_100%] animate-[shimmer_3s_ease-in-out_infinite]" />
              <span className="relative flex items-center gap-2">
                <ExternalLink className="w-4 h-4 transition-transform group-hover:rotate-12" />
                Aller au hub de connexion
              </span>
            </a>
            <Link
              to="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-700 border border-dark-500/50 text-sm text-gray-300 hover:text-white hover:bg-dark-600 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Se connecter
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Planning des Serveurs</h2>
          <p className="text-sm text-gray-400 mt-1">Consultez les réservations en cours</p>
        </div>

        <WeeklyCalendar
          weekDays={weekDays}
          monday={currentMonday}
          reservations={reservations}
          profiles={profiles}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onToday={handleToday}
          onReservationClick={setSelectedReservation}
        />
      </div>

      {selectedReservation && (
        <ReservationDetailModal
          reservation={selectedReservation}
          profiles={profiles}
          onClose={() => setSelectedReservation(null)}
          onUpdated={fetchReservations}
          allReservations={reservations}
        />
      )}
    </div>
  )
}
