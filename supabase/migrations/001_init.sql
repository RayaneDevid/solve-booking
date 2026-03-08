-- ============================================
-- Migration: Solve - Système de Réservation
-- ============================================

-- 1. Table profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Table reservations
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'refused')),
  assigned_server SMALLINT CHECK (assigned_server IN (1, 2, 3)),
  server_password TEXT,
  refusal_reason TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_reservations_date ON public.reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);

-- ============================================
-- 3. Row Level Security (RLS)
-- ============================================

-- Activer RLS sur les deux tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Fonction helper SECURITY DEFINER pour vérifier le rôle admin (bypass RLS, évite récursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- PROFILES POLICIES ----

-- Les users authentifiés peuvent lire leur propre profil
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Les admins peuvent tout lire sur profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Les admins peuvent insérer des profiles
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Les admins peuvent mettre à jour les profiles
CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- ---- RESERVATIONS POLICIES ----

-- Les users authentifiés peuvent voir les réservations acceptées (pour le calendrier)
CREATE POLICY "Users can read accepted reservations"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (status = 'accepted');

-- Les users peuvent voir leurs propres réservations (tous statuts)
CREATE POLICY "Users can read own reservations"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Les users peuvent créer leurs propres réservations
CREATE POLICY "Users can create own reservations"
  ON public.reservations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Les admins peuvent tout lire sur reservations
CREATE POLICY "Admins can read all reservations"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Les admins peuvent mettre à jour les réservations (accepter/refuser)
CREATE POLICY "Admins can update reservations"
  ON public.reservations FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- Les admins peuvent supprimer les réservations
CREATE POLICY "Admins can delete reservations"
  ON public.reservations FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================
-- 4. Sécurité du mot de passe serveur
-- ============================================
-- Le server_password ne doit être visible que par le propriétaire et les admins
-- On utilise une vue sécurisée ou on gère côté RLS + select

-- Créer une vue pour les réservations du calendrier (sans mot de passe)
CREATE OR REPLACE VIEW public.calendar_reservations AS
SELECT
  id,
  user_id,
  date,
  start_time,
  end_time,
  status,
  assigned_server,
  created_at
FROM public.reservations
WHERE status = 'accepted';

-- ============================================
-- 5. Fonction pour créer un utilisateur (appelée par l'admin)
-- ============================================
-- Cette fonction est appelée via supabase.rpc() côté admin
-- Elle utilise l'API admin de Supabase (service_role key) côté Edge Function

-- ============================================
-- 6. Activer Realtime sur reservations
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;

-- ============================================
-- 7. Fonction de validation des réservations
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_reservation()
RETURNS TRIGGER AS $$
DECLARE
  day_of_week INT;
  max_end_time TIME;
  confirmed_count INT;
BEGIN
  -- Récupérer le jour de la semaine (0 = dimanche, 1 = lundi, ... 6 = samedi)
  day_of_week := EXTRACT(DOW FROM NEW.date);

  -- Déterminer l'heure de fin maximum selon le jour
  IF day_of_week IN (5, 6, 0) THEN -- Vendredi, Samedi, Dimanche
    max_end_time := '04:00:00'::TIME;
  ELSE -- Lundi à Jeudi
    max_end_time := '03:00:00'::TIME;
  END IF;

  -- Vérifier l'heure de début >= 18:00 (sauf si c'est après minuit, auquel cas c'est invalide pour le début)
  IF NEW.start_time < '18:00:00'::TIME AND NEW.start_time >= '04:00:00'::TIME THEN
    RAISE EXCEPTION 'L''heure de début doit être >= 18:00';
  END IF;

  -- Vérifier la durée maximum de 2 heures
  -- Gestion du passage minuit
  IF NEW.end_time > NEW.start_time THEN
    -- Même jour (ex: 18:00 -> 20:00)
    IF (NEW.end_time - NEW.start_time) > INTERVAL '2 hours' THEN
      RAISE EXCEPTION 'La durée maximale est de 2 heures';
    END IF;
  ELSE
    -- Passage minuit (ex: 23:00 -> 01:00)
    IF (('24:00:00'::TIME - NEW.start_time) + NEW.end_time) > INTERVAL '2 hours' THEN
      RAISE EXCEPTION 'La durée maximale est de 2 heures';
    END IF;
  END IF;

  -- Vérifier que l'heure de fin ne dépasse pas le maximum
  IF NEW.end_time > max_end_time AND NEW.end_time <= '18:00:00'::TIME THEN
    RAISE EXCEPTION 'L''heure de fin dépasse la limite autorisée pour ce jour';
  END IF;

  -- Vérifier que le créneau n'est pas complet (3 serveurs confirmés)
  IF NEW.status = 'pending' THEN
    SELECT COUNT(*) INTO confirmed_count
    FROM public.reservations
    WHERE date = NEW.date
      AND status = 'accepted'
      AND (
        (start_time < end_time AND NEW.start_time < end_time AND NEW.end_time > start_time)
        OR
        (start_time >= end_time AND (NEW.start_time < end_time OR NEW.end_time > start_time))
      );

    IF confirmed_count >= 3 THEN
      RAISE EXCEPTION 'Ce créneau est complet (3 serveurs déjà réservés)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger de validation
DROP TRIGGER IF EXISTS validate_reservation_trigger ON public.reservations;
CREATE TRIGGER validate_reservation_trigger
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_reservation();

-- ============================================
-- 8. Edge Function : Création d'utilisateur
-- ============================================
-- À déployer séparément via Supabase CLI
-- Voir supabase/functions/create-user/index.ts
