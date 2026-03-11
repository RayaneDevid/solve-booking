-- ============================================
-- Migration 002: Fix RLS for users
-- ============================================

-- 1. Allow authenticated users to read all profiles (for calendar username display)
--    Currently only anon can read all profiles; authenticated users can only read their own.
CREATE POLICY "Authenticated can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 2. Allow users to UPDATE their own pending reservations
CREATE POLICY "Users can update own pending reservations"
  ON public.reservations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid());

-- 3. Allow users to DELETE their own reservations
CREATE POLICY "Users can delete own reservations"
  ON public.reservations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
