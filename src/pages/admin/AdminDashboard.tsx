import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, X, Clock, Server, ClipboardList, Plus, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { WeeklyCalendar } from '@/components/calendar/WeeklyCalendar'
import { AcceptModal, RefuseModal } from '@/components/ui/AdminModals'
import { NewReservationModal } from '@/components/ui/NewReservationModal'
import { ReservationDetailModal } from '@/components/ui/ReservationDetailModal'
import { getMonday, getWeekDays, formatDateISO, timeToMinutesSince18 } from '@/lib/utils'
import type { Reservation, Profile } from '@/types/database'

export function AdminDashboard() {
  const { profile } = useAuth()
  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()))
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [allReservations, setAllReservations] = useState<Reservation[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [serverFilter, setServerFilter] = useState<number | null>(null)

  // Modals
  const [acceptingRes, setAcceptingRes] = useState<Reservation | null>(null)
  const [refusingRes, setRefusingRes] = useState<Reservation | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

  const weekDays = useMemo(() => getWeekDays(currentMonday), [currentMonday])

  const fetchData = useCallback(async () => {
    const startDate = formatDateISO(weekDays[0])
    const endDate = formatDateISO(weekDays[6])

    const { data: weekRes } = await supabase
      .from('reservations')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)

    if (weekRes) {
      setReservations(weekRes as Reservation[])
    }

    const { data: allRes } = await supabase
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false })

    if (allRes) {
      setAllReservations(allRes as Reservation[])
    }

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')

    if (profilesData) {
      const profileMap: Record<string, Profile> = {}
      ;(profilesData as Profile[]).forEach((p) => { profileMap[p.id] = p })
      setProfiles(profileMap)
    }
  }, [weekDays])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const channel = supabase
      .channel('admin-reservations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

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

  const pendingReservations = allReservations.filter((r) => r.status === 'pending')

  // Stats
  const acceptedCount = allReservations.filter((r) => r.status === 'accepted').length
  const server1Count = allReservations.filter((r) => r.status === 'accepted' && r.assigned_server === 1).length
  const server2Count = allReservations.filter((r) => r.status === 'accepted' && r.assigned_server === 2).length
  const server3Count = allReservations.filter((r) => r.status === 'accepted' && r.assigned_server === 3).length

  const getExistingServers = (res: Reservation): number[] => {
    return reservations
      .filter(
        (r) =>
          r.status === 'accepted' &&
          r.date === res.date &&
          timeToMinutesSince18(r.start_time) < timeToMinutesSince18(res.end_time) &&
          timeToMinutesSince18(r.end_time) > timeToMinutesSince18(res.start_time)
      )
      .map((r) => r.assigned_server!)
      .filter(Boolean)
  }

  const serverTabs = [
    { label: 'Tous les serveurs', value: null },
    { label: 'Serveur 1', value: 1 },
    { label: 'Serveur 2', value: 2 },
    { label: 'Serveur 3', value: 3 },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Gérez les réservations et les utilisateurs</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:from-blue-500 hover:to-cyan-400 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Réservation
        </button>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-[300px_1fr] gap-6">
        {/* Pending Requests */}
        <div>
          <h2 className="text-base font-semibold text-white mb-3">Demandes en attente</h2>
          <div className="text-xs text-gray-500 mb-3">{pendingReservations.length} en attente</div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {pendingReservations.length === 0 ? (
              <div className="bg-dark-800/50 border border-dark-500/30 rounded-xl px-4 py-8 text-center">
                <ClipboardList className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Aucune demande en attente</p>
              </div>
            ) : (
              pendingReservations.map((res) => {
                const username = profiles[res.user_id]?.username || '...'
                return (
                  <div key={res.id} className="bg-dark-800/70 border border-dark-500/30 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{username}</span>
                      <span className="text-[10px] text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                        En attente
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-1">
                      {res.date} · {res.start_time.slice(0, 5)} – {res.end_time.slice(0, 5)}
                    </p>
                    {res.requested_map && (
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {res.requested_map}
                      </p>
                    )}
                    {res.assigned_server && (
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <Server className="w-3 h-3" /> Server Event {res.assigned_server}
                      </p>
                    )}
                    {res.note && (
                      <p className="text-xs text-gray-500 mb-3 bg-dark-700/50 rounded px-2 py-1">{res.note}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAcceptingRes(res)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-600/20 text-green-400 text-xs font-medium hover:bg-green-600/30 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accepter
                      </button>
                      <button
                        onClick={() => setRefusingRes(res)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-600/20 text-red-400 text-xs font-medium hover:bg-red-600/30 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Refuser
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Calendar */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-white">Vue Calendrier</h2>
            <div className="flex gap-1">
              {serverTabs.map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => setServerFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    serverFilter === tab.value
                      ? 'bg-accent/20 text-accent border border-accent/40'
                      : 'bg-dark-700 text-gray-400 border border-dark-500/50 hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <WeeklyCalendar
            weekDays={weekDays}
            monday={currentMonday}
            reservations={reservations}
            profiles={profiles}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
            onToday={handleToday}
            serverFilter={serverFilter}
            onReservationClick={setSelectedReservation}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mt-6">
        {[
          { label: 'En attente', value: pendingReservations.length, icon: Clock, color: 'text-yellow-400' },
          { label: 'Acceptées', value: acceptedCount, icon: ClipboardList, color: 'text-green-400' },
          { label: 'Serveur 1', value: server1Count, icon: Server, color: 'text-blue-400' },
          { label: 'Serveur 2', value: server2Count, icon: Server, color: 'text-green-400' },
          { label: 'Serveur 3', value: server3Count, icon: Server, color: 'text-orange-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-dark-800/50 border border-dark-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {acceptingRes && (
        <AcceptModal
          reservation={acceptingRes}
          profiles={profiles}
          existingServers={getExistingServers(acceptingRes)}
          onClose={() => setAcceptingRes(null)}
          onDone={fetchData}
        />
      )}
      {refusingRes && (
        <RefuseModal
          reservation={refusingRes}
          profiles={profiles}
          onClose={() => setRefusingRes(null)}
          onDone={fetchData}
        />
      )}

      <NewReservationModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={fetchData}
        reservations={reservations}
      />

      {selectedReservation && (
        <ReservationDetailModal
          reservation={selectedReservation}
          profiles={profiles}
          onClose={() => setSelectedReservation(null)}
          onUpdated={fetchData}
          allReservations={reservations}
        />
      )}
    </div>
  )
}
