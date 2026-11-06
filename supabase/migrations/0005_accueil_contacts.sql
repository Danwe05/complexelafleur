-- 0005 — Page d'accueil : nom harmonisé, numéros, horaires d'ouverture.
-- A exécuter dans Supabase : SQL Editor > New query > coller > Run.

-- Deuxième numéro de réservation + horaires d'ouverture (modifiables dans l'admin > Paramètres)
alter table public.settings add column if not exists phone3 text;
alter table public.settings add column if not exists open_time text not null default '10:00';
alter table public.settings add column if not exists close_time text not null default '19:00';

alter table public.settings alter column hotel_name set default 'Complexe La Fleur - Obala';

-- phone  = réception
-- phone2 = réservation (aussi le numéro WhatsApp)
-- phone3 = réservation (deuxième ligne)
insert into public.settings (id) values (1) on conflict (id) do nothing;
update public.settings set
  hotel_name = 'Complexe La Fleur - Obala',
  phone      = '+237 6 20 21 18 22',
  phone2     = '+237 6 51 60 13 55',
  phone3     = '+237 6 59 67 61 97',
  whatsapp   = '+237 6 51 60 13 55',
  open_time  = '10:00',
  close_time = '19:00'
where id = 1;
