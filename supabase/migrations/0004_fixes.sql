-- 0004 — Corrections (diagnostic du 06/11/2026)
-- A exécuter dans Supabase : SQL Editor > New query > coller > Run.
-- Peut être relancé sans risque.

-- ------------------------------------------------------------------
-- 1. Colonnes updated_at manquantes (l'admin les écrivait : les mises à jour
--    des chambres et des demandes échouaient sans message).
-- ------------------------------------------------------------------
alter table public.rooms     add column if not exists updated_at timestamptz not null default now();
alter table public.inquiries add column if not exists updated_at timestamptz not null default now();

-- ------------------------------------------------------------------
-- 2. Références de réservation plus longues (LF- + 10 caractères au lieu de 6)
--    pour qu'on ne puisse pas deviner celles des autres clients.
--    Les anciennes références restent valides.
-- ------------------------------------------------------------------
create or replace function public.create_booking(
  p_room uuid, p_in date, p_out date, p_guests int,
  p_name text, p_phone text, p_email text, p_notes text, p_locale text,
  p_deposit_percent int, p_hold_hours int
) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  r public.rooms;
  v_nights int;
  v_total int;
  v_deposit int;
  v_remaining int;
  v_status public.booking_status;
  b public.bookings;
begin
  if p_out <= p_in then raise exception 'invalid_dates'; end if;
  if p_in < current_date then raise exception 'past_date'; end if;

  perform pg_advisory_xact_lock(hashtext(p_room::text));

  update bookings set status = 'expired', updated_at = now()
   where status = 'awaiting_payment' and hold_expires_at <= now();

  select * into r from rooms where id = p_room and active;
  if not found then raise exception 'room_not_found'; end if;
  if p_guests > r.capacity then raise exception 'too_many_guests'; end if;

  select a.remaining into v_remaining from room_availability(p_in, p_out) a where a.room_id = p_room;
  if coalesce(v_remaining, 0) <= 0 then raise exception 'unavailable'; end if;

  v_nights := p_out - p_in;
  v_total := v_nights * r.price_per_night;
  v_deposit := ceil(v_total * p_deposit_percent / 100.0)::int;
  v_status := case when v_deposit > 0 then 'awaiting_payment' else 'pending' end;

  insert into bookings (
    reference, room_id, check_in, check_out, nights, guests,
    guest_name, guest_phone, guest_email, notes, locale,
    total_amount, deposit_amount, status, payment_status, hold_expires_at
  ) values (
    'LF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    p_room, p_in, p_out, v_nights, p_guests,
    p_name, p_phone, nullif(p_email, ''), nullif(p_notes, ''), p_locale,
    v_total, v_deposit, v_status,
    case when v_deposit > 0 then 'pending' else 'none' end,
    case when v_deposit > 0 then now() + make_interval(hours => p_hold_hours) else null end
  ) returning * into b;

  return b;
end $$;

revoke all on function public.create_booking from public, anon, authenticated;
grant execute on function public.create_booking to service_role;

-- ------------------------------------------------------------------
-- 3. Enregistrement atomique d'un acompte payé (appelé par le webhook).
--    Evite la double réservation quand le paiement arrive après la fin du
--    blocage et que la chambre a été reprise entre-temps.
--    Retour :
--      'pending'    -> acompte accepté, la réservation attend la réception
--      'paid'       -> acompte ajouté à une réservation déjà validée/en attente
--      'refund_due' -> la réservation n'est plus tenable : à rembourser
--      'noop'       -> déjà traité
-- ------------------------------------------------------------------
create or replace function public.mark_booking_paid(p_booking uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
  v_remaining int;
begin
  select * into b from bookings where id = p_booking;
  if not found then raise exception 'booking_not_found'; end if;

  -- Même verrou que create_booking : personne ne peut réserver cette chambre pendant ce temps.
  perform pg_advisory_xact_lock(hashtext(b.room_id::text));
  select * into b from bookings where id = p_booking for update;

  if b.payment_status in ('paid', 'refund_due', 'refunded') then
    return 'noop';
  end if;

  -- Réservation déjà en attente de validation ou validée par la réception
  if b.status in ('pending', 'confirmed') then
    update bookings set payment_status = 'paid', hold_expires_at = null, updated_at = now()
     where id = b.id;
    return 'paid';
  end if;

  -- Encore dans le délai de blocage : la chambre est garantie
  if b.status = 'awaiting_payment' and b.hold_expires_at > now() then
    update bookings set status = 'pending', payment_status = 'paid', hold_expires_at = null, updated_at = now()
     where id = b.id;
    return 'pending';
  end if;

  -- Blocage dépassé (statut awaiting_payment ou expired) : on reprend la réservation
  -- seulement si la chambre est encore libre sur ces dates.
  if b.status in ('awaiting_payment', 'expired') then
    select a.remaining into v_remaining
      from room_availability(b.check_in, b.check_out) a where a.room_id = b.room_id;
    if coalesce(v_remaining, 0) > 0 then
      update bookings set status = 'pending', payment_status = 'paid', hold_expires_at = null, updated_at = now()
       where id = b.id;
      return 'pending';
    end if;
    update bookings set status = 'expired', payment_status = 'refund_due', hold_expires_at = null,
           admin_note = coalesce(admin_note || E'\n', '') || 'Acompte reçu après expiration, chambre plus disponible : à rembourser.',
           updated_at = now()
     where id = b.id;
    return 'refund_due';
  end if;

  -- Refusée ou annulée : l'argent est à rendre
  update bookings set payment_status = 'refund_due', updated_at = now() where id = b.id;
  return 'refund_due';
end $$;

revoke all on function public.mark_booking_paid from public, anon, authenticated;
grant execute on function public.mark_booking_paid to service_role;

-- ------------------------------------------------------------------
-- 4. Stockage des photos de chambres (bucket public en lecture).
--    L'envoi passe par des URL signées créées côté serveur pour un admin.
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('room-photos', 'room-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
