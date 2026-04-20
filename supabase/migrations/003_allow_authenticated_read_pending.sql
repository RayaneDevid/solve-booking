-- ============================================
-- Migration 003: Allow authenticated users to read pending reservations
-- ============================================

-- Users already can read accepted reservations and their own reservations.
-- Add a dedicated policy so non-admin authenticated users can also view pending reservations.
CREATE POLICY "Users can read pending reservations"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (status = 'pending');
