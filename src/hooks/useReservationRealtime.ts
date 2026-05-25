import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type RefreshReservations = () => void | Promise<void>

interface UseReservationRealtimeOptions {
  channelName: string
  enabled?: boolean
  pollIntervalMs?: number
}

export function useReservationRealtime(
  refreshReservations: RefreshReservations,
  {
    channelName,
    enabled = true,
    pollIntervalMs = 15_000,
  }: UseReservationRealtimeOptions
) {
  const refreshRef = useRef(refreshReservations)

  useEffect(() => {
    refreshRef.current = refreshReservations
  }, [refreshReservations])

  useEffect(() => {
    if (!enabled) return

    const refresh = () => {
      void refreshRef.current()
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, refresh)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          refresh()
        }
      })

    const pollInterval = window.setInterval(refresh, pollIntervalMs)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      window.clearInterval(pollInterval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      void supabase.removeChannel(channel)
    }
  }, [channelName, enabled, pollIntervalMs])
}
