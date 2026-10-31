-- Données d'exemple tirées de la maquette. Tarifs et quantités sont à vérifier
-- avec le complexe (ou à modifier directement depuis l'espace admin).

insert into public.rooms
  (slug, name_fr, name_en, description_fr, description_en, price_per_night, capacity, quantity, amenities, sort_order)
values
  ('standard', 'Chambre Standard', 'Standard room',
   'Une chambre moderne et confortable, climatisée, pour un séjour agréable.',
   'A modern, comfortable air-conditioned room for a pleasant stay.',
   35000, 2, 8, array['Climatisation', 'Wi-Fi gratuit', 'Télévision', 'Eau chaude'], 1),
  ('deluxe', 'Chambre Deluxe', 'Deluxe room',
   'Plus d''espace et une literie soignée, dans une ambiance chaleureuse.',
   'More space and carefully chosen bedding in a warm setting.',
   55000, 2, 5, array['Climatisation', 'Wi-Fi gratuit', 'Télévision', 'Eau chaude'], 2),
  ('suite-prestige', 'Suite Prestige', 'Prestige suite',
   'Une suite avec salon privé, pour recevoir ou se détendre en famille.',
   'A suite with a private lounge, to host guests or relax as a family.',
   85000, 4, 2, array['Salon privé', 'Wi-Fi gratuit', 'Climatisation', 'Télévision', 'Eau chaude'], 3)
on conflict (slug) do nothing;
