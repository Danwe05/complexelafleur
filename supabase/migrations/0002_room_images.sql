-- Several photos per room (shown as a slider on the public site).
alter table public.rooms add column if not exists images text[] not null default '{}';
