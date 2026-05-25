-- ============================================
-- Migration 004: Ensure reservations realtime is enabled
-- ============================================

ALTER TABLE public.reservations REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
