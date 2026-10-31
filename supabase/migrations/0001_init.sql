-- Complexe La Fleur — schema initial
-- A exécuter dans Supabase : SQL Editor > New query > coller > Run.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------
-- Paramètres du complexe (une seule ligne)
-- ------------------------------------------------------------------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  hotel_name text not null default 'Complexe Lafleur Obala',
  phone text default '+237 694 744 321',
  phone2 text default '+237 655 243 107',
  whatsapp text default '',
  email text default 'complexelafleur@gmail.com',
  address text default 'Quartier Chauffeur – Obala, Cameroun',
  facebook_url text default '',
  instagram_url text default '',
  youtube_url text default '',
  maps_url text default '',
  checkin_time text not null default '14:00',
  checkout_time text not null default '12:00',
  -- 0 = pas de paiement en ligne, 100 = paiement intégral
  deposit_percent int not null default 30 check (deposit_percent between 0 and 100),
  -- durée pendant laquelle une réservation non payée bloque la chambre
  hold_hours int not null default 2 check (hold_hours between 1 and 168),
  manager_email text default '',
  cancellation_policy_fr text default 'Annulation gratuite jusqu''à 48 h avant l''arrivée. Ensuite, l''acompte reste acquis au complexe.',
  cancellation_policy_en text default 'Free cancellation up to 48 hours before arrival. After that, the deposit is retained by the property.'
);
insert into public.settings (id) values (1) on conflict do nothing;

-- ------------------------------------------------------------------
-- Catégories de chambres
-- ------------------------------------------------------------------
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_fr text not null,
  name_en text not null,
  description_fr text not null default '',
  description_en text not null default '',
  price_per_night int not null check (price_per_night >= 0),
  capacity int not null default 2 check (capacity > 0),
  quantity int not null default 1 check (quantity > 0),
  amenities text[] not null default '{}',
  image_url text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Réservations
-- ------------------------------------------------------------------
do $$ begin
  create type public.booking_status as enum
    ('awaiting_payment', 'pending', 'confirmed', 'declined', 'cancelled', 'expired');
exception when duplicate_object then null; end $$;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  room_id uuid not null references public.rooms(id),
  check_in date not null,
  check_out date not null,
  nights int not null,
  guests int not null,
  guest_name text not null,
  guest_phone text not null,
  guest_email text,
  notes text,
  locale text not null default 'fr',
  total_amount int not null,
  deposit_amount int not null default 0,
  status public.booking_status not null,
  payment_status text not null default 'none'
    check (payment_status in ('none', 'pending', 'paid', 'failed', 'refund_due', 'refunded')),
  hold_expires_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in)
);
create index if not exists bookings_room_dates on public.bookings (room_id, check_in, check_out);
create index if not exists bookings_status on public.bookings (status, created_at desc);

-- ------------------------------------------------------------------
-- Paiements (CamerPay)
-- ------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider text not null default 'camerpay',
  transaction_uuid text unique,
  amount int not null,
  currency text not null default 'XAF',
  status text not null default 'pending',
  pay_url text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_booking on public.payments (booking_id);

-- ------------------------------------------------------------------
-- Administrateurs (liés à Supabase Auth)
-- ------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ------------------------------------------------------------------
-- Sécurité : RLS activée partout. Le site lit/écrit via le serveur
-- (clé service_role). Seules les chambres actives sont publiques.
-- ------------------------------------------------------------------
alter table public.settings enable row level security;
alter table public.rooms enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.admins enable row level security;

drop policy if exists "rooms are public" on public.rooms;
create policy "rooms are public" on public.rooms
  for select using (active = true);

drop policy if exists "admins read themselves" on public.admins;
create policy "admins read themselves" on public.admins
  for select using (user_id = auth.uid());

-- ------------------------------------------------------------------
-- Disponibilité : chambres restantes pour chaque catégorie sur une période
-- Une réservation bloque une chambre si elle est en attente, confirmée,
-- ou en attente de paiement avec un blocage non expiré.
-- ------------------------------------------------------------------
create or replace function public.room_availability(p_in date, p_out date)
returns table (room_id uuid, remaining int)
language sql stable security definer set search_path = public as $$
  select r.id,
         greatest(r.quantity - coalesce(max(n.taken), 0), 0)::int
  from rooms r
  left join lateral (
    select count(b.id) as taken
    from generate_series(p_in, p_out - 1, interval '1 day') d
    left join bookings b
      on b.room_id = r.id
     and b.check_in <= d::date and b.check_out > d::date
     and (b.status in ('pending', 'confirmed')
          or (b.status = 'awaiting_payment' and b.hold_expires_at > now()))
    group by d
  ) n on true
  where r.active
  group by r.id, r.quantity;
$$;

-- ------------------------------------------------------------------
-- Création atomique d'une réservation (évite la double réservation)
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
revoke all on function public.room_availability from public, anon, authenticated;
grant execute on function public.create_booking to service_role;
grant execute on function public.room_availability to service_role;

-- ------------------------------------------------------------------
-- Demandes de devis / privatisation / contact
-- ------------------------------------------------------------------
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'contact' check (kind in ('contact', 'quote', 'spa')),
  name text not null,
  phone text,
  email text,
  event_type text,
  event_date date,
  guests int,
  message text,
  locale text not null default 'fr',
  handled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.inquiries enable row level security;
