import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { WeeklyCalendar } from '@/components/calendar/WeeklyCalendar'
import { NewReservationModal } from '@/components/ui/NewReservationModal'
import { MyReservations } from '@/components/ui/MyReservations'
import { ReservationDetailModal } from '@/components/ui/ReservationDetailModal'
import { getMonday, getWeekDays, formatDateISO } from '@/lib/utils'
import type { Reservation, Profile } from '@/types/database'

export function UserDashboard() {
  const { profile } = useAuth()
  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()))
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [myReservations, setMyReservations] = useState<Reservation[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [showModal, setShowModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

  const weekDays = useMemo(() => getWeekDays(currentMonday), [currentMonday])

  const fetchReservations = useCallback(async () => {
    if (!profile) return

    const startDate = formatDateISO(weekDays[0])
    const endDate = formatDateISO(weekDays[6])

    const { data: weekRes } = await supabase
      .from('reservations')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)

    if (weekRes) {
      setReservations(weekRes as Reservation[])

      const userIds = [...new Set((weekRes as Reservation[]).map((r) => r.user_id))]
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds)

        if (profilesData) {
          const profileMap: Record<string, Profile> = {}
          ;(profilesData as Profile[]).forEach((p) => { profileMap[p.id] = p })
          setProfiles(profileMap)
        }
      }
    }

    const { data: myRes } = await supabase
      .from('reservations')
      .select('*')
      .eq('user_id', profile.id)
      .order('date', { ascending: false })

    if (myRes) {
      setMyReservations(myRes as Reservation[])
    }
  }, [profile, weekDays])

  useEffect(() => {
    fetchReservations()
  }, [fetchReservations])

  useEffect(() => {
    const channel = supabase
      .channel('reservations-changes')
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Gérez vos réservations de serveur</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:from-blue-500 hover:to-cyan-400 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Réservation
        </button>
      </div>

      {/* Calendar */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">Planning Hebdomadaire</h2>
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

      {/* My Reservations */}
      <MyReservations
        reservations={myReservations}
        onReservationClick={setSelectedReservation}
      />

      {/* New Reservation Modal */}
      <NewReservationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={fetchReservations}
      />

      {/* Reservation Detail Modal */}
      {selectedReservation && (
        <ReservationDetailModal
          reservation={selectedReservation}
          profiles={profiles}
          onClose={() => setSelectedReservation(null)}
          onUpdated={fetchReservations}
        />
      )}
    </div>
  )
}
