-- Migration 005: Enforce a 15 minute buffer between reservations on the same Server Event

CREATE OR REPLACE FUNCTION public.reservation_minutes_since_18(slot_time TIME)
RETURNS INT AS $$
BEGIN
  RETURN (((EXTRACT(HOUR FROM slot_time)::INT - 18 + 24) % 24) * 60)
    + EXTRACT(MINUTE FROM slot_time)::INT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.validate_reservation()
RETURNS TRIGGER AS $$
DECLARE
  day_of_week INT;
  max_end_minutes INT;
  new_start_minutes INT;
  new_end_minutes INT;
  confirmed_count INT;
  conflicting_reservation RECORD;
BEGIN
  day_of_week := EXTRACT(DOW FROM NEW.date);
  max_end_minutes := CASE WHEN day_of_week IN (5, 6, 0) THEN 10 * 60 ELSE 9 * 60 END;
  new_start_minutes := public.reservation_minutes_since_18(NEW.start_time);
  new_end_minutes := public.reservation_minutes_since_18(NEW.end_time);

  IF (EXTRACT(MINUTE FROM NEW.start_time)::INT % 15) <> 0
    OR EXTRACT(SECOND FROM NEW.start_time) <> 0
    OR (EXTRACT(MINUTE FROM NEW.end_time)::INT % 15) <> 0
    OR EXTRACT(SECOND FROM NEW.end_time) <> 0 THEN
    RAISE EXCEPTION 'Les horaires doivent être alignés sur des créneaux de 15 minutes';
  END IF;

  IF NEW.start_time < '18:00:00'::TIME AND NEW.start_time >= '04:00:00'::TIME THEN
    RAISE EXCEPTION 'L''heure de début doit être >= 18:00';
  END IF;

  IF new_start_minutes >= max_end_minutes THEN
    RAISE EXCEPTION 'L''heure de début dépasse la limite autorisée pour ce jour';
  END IF;

  IF new_end_minutes <= new_start_minutes THEN
    RAISE EXCEPTION 'L''heure de fin doit être après l''heure de début';
  END IF;

  IF new_end_minutes - new_start_minutes > 120 THEN
    RAISE EXCEPTION 'La durée maximale est de 2 heures';
  END IF;

  IF new_end_minutes > max_end_minutes THEN
    RAISE EXCEPTION 'L''heure de fin dépasse la limite autorisée pour ce jour';
  END IF;

  -- Sur un même Server Event, il faut 15 minutes libres avant et après chaque réservation.
  IF NEW.status <> 'refused' AND NEW.assigned_server IS NOT NULL THEN
    SELECT r.* INTO conflicting_reservation
    FROM public.reservations r
    WHERE r.date = NEW.date
      AND r.status <> 'refused'
      AND r.assigned_server = NEW.assigned_server
      AND (TG_OP = 'INSERT' OR r.id <> NEW.id)
      AND new_start_minutes < public.reservation_minutes_since_18(r.end_time) + 15
      AND new_end_minutes > public.reservation_minutes_since_18(r.start_time) - 15
    LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION 'Ce Server Event doit rester libre 15 minutes entre deux réservations';
    END IF;
  END IF;

  -- Vérifier que le créneau n'est pas complet (3 serveurs confirmés).
  IF NEW.status = 'pending' THEN
    SELECT COUNT(*) INTO confirmed_count
    FROM public.reservations r
    WHERE r.date = NEW.date
      AND r.status = 'accepted'
      AND (TG_OP = 'INSERT' OR r.id <> NEW.id)
      AND new_start_minutes < public.reservation_minutes_since_18(r.end_time)
      AND new_end_minutes > public.reservation_minutes_since_18(r.start_time);

    IF confirmed_count >= 3 THEN
      RAISE EXCEPTION 'Ce créneau est complet (3 serveurs déjà réservés)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_reservation_trigger ON public.reservations;
CREATE TRIGGER validate_reservation_trigger
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_reservation();
