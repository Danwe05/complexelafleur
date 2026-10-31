-- Fix: create_booking failed with "function gen_random_bytes(integer) does not exist".
-- pgcrypto lives in the `extensions` schema on Supabase and is not on the function's search_path.
-- gen_random_uuid() is built in, so the reference is derived from it instead.
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
    'LF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
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
