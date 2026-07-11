-- Landing page media slots (images / videos) — admin upload, public read

CREATE TABLE IF NOT EXISTS public.landing_media (
  slot_key text PRIMARY KEY,
  section text NOT NULL DEFAULT 'Général',
  title text NOT NULL,
  caption text NOT NULL DEFAULT '',
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  media_url text,
  storage_path text,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS landing_media_public_read ON public.landing_media;
CREATE POLICY landing_media_public_read ON public.landing_media
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS landing_media_admin_all ON public.landing_media;
CREATE POLICY landing_media_admin_all ON public.landing_media
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.landing_media (slot_key, section, title, caption, media_type, sort_order) VALUES
  ('hero_video', 'Hero', 'Vidéo de présentation', 'Vidéo principale affichée juste sous le hero (MP4 ou WebM, paysage recommandé).', 'video', 1),
  ('hero_dashboard', 'Hero', 'Capture hero — Dashboard', 'Capture d''écran du dashboard, affichée à droite du titre principal sur desktop.', 'image', 2),
  ('dashboard_main', 'Dashboard', 'Dashboard — vue principale', 'Capture du tableau de bord : stats, palier, lien de parrainage.', 'image', 10),
  ('dashboard_withdraw', 'Dashboard', 'Dashboard — retraits', 'Capture de la page retraits Mobile Money.', 'image', 11),
  ('dashboard_leaderboard', 'Dashboard', 'Dashboard — classement', 'Capture du classement des ambassadeurs.', 'image', 12),
  ('kit_overview', 'Kit', 'Kit — vue d''ensemble', 'Photo ou capture présentant le kit ambassadeur complet.', 'image', 20),
  ('kit_tshirt', 'Kit', 'Kit — T-shirt officiel', 'Photo du t-shirt VSM Collection (porté ou à plat).', 'image', 21),
  ('kit_card', 'Kit', 'Kit — Carte ambassadeur', 'Photo de la carte ambassadeur avec QR code personnel.', 'image', 22),
  ('qr_tracking', 'Kit', 'QR Code — parcours client', 'Infographie ou capture : scan QR → site VSM → vente attribuée.', 'image', 23),
  ('queue_validation', 'Processus', 'Validation candidature', 'Visuel ou capture du parcours : inscription → validation → kit.', 'image', 30),
  ('commissions_flow', 'Commissions', 'Flux des commissions', 'Schéma ou capture expliquant comment les commissions sont calculées.', 'image', 40),
  ('apply_form', 'Inscription', 'Formulaire de candidature', 'Capture du formulaire d''inscription en 4 étapes.', 'image', 50),
  ('academy_main', 'Académie', 'Académie — tableau de bord', 'Capture du dashboard VSM Ambassador Academy.', 'image', 60),
  ('academy_community', 'Académie', 'Académie — communauté', 'Capture de la communauté privée des ambassadeurs.', 'image', 61),
  ('academy_challenges', 'Académie', 'Académie — défis & récompenses', 'Capture des défis, badges et concours.', 'image', 62),
  ('academy_courses_wide', 'Académie', 'Académie — catalogue formations', 'Capture large du catalogue de cours (format desktop).', 'image', 63),
  ('academy_screen_dashboard', 'Académie — galerie', 'Galerie — Tableau de bord', 'Capture écran Academy : accueil / dashboard.', 'image', 70),
  ('academy_screen_courses', 'Académie — galerie', 'Galerie — Formations', 'Capture écran Academy : liste des formations.', 'image', 71),
  ('academy_screen_videos', 'Académie — galerie', 'Galerie — Vidéos & cours', 'Capture écran Academy : lecteur vidéo ou module.', 'image', 72),
  ('academy_screen_community', 'Académie — galerie', 'Galerie — Communauté', 'Capture écran Academy : espace communauté.', 'image', 73),
  ('academy_screen_feed', 'Académie — galerie', 'Galerie — Fil d''actualité', 'Capture écran Academy : fil d''actualité.', 'image', 74),
  ('academy_screen_stories', 'Académie — galerie', 'Galerie — Stories', 'Capture écran Academy : stories.', 'image', 75),
  ('academy_screen_challenges', 'Académie — galerie', 'Galerie — Défis', 'Capture écran Academy : défis actifs.', 'image', 76),
  ('academy_screen_badges', 'Académie — galerie', 'Galerie — Badges', 'Capture écran Academy : badges et accomplissements.', 'image', 77)
ON CONFLICT (slot_key) DO NOTHING;
