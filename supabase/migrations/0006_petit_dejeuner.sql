-- 0006 — Petit-déjeuner (6e service de la page d'accueil).
-- Laisser les deux horaires vides dans l'admin masque le service.
alter table public.settings add column if not exists breakfast_start text default '07:00';
alter table public.settings add column if not exists breakfast_end   text default '10:00';
update public.settings set breakfast_start = coalesce(breakfast_start, '07:00'), breakfast_end = coalesce(breakfast_end, '10:00') where id = 1;
