import { TIERS } from '@/lib/ambassador';

export const LANDING_PATH = '/ambassadeur';

export const ACADEMY_URL = 'https://vsm-ambassador-hub.vercel.app/login';

export const KIT_TSHIRT_IMAGE_FALLBACK =
  'https://ehmgjgrekjoaohnnlfmw.supabase.co/storage/v1/object/public/images/products/1774003850427-sumpdb.png';

export const KIT_PRICE = 30;

export const SEO = {
  title: 'Programme Ambassadeur VSM Collection — Gagnez des commissions',
  description:
    'Rejoignez l\'écosystème Ambassadeur VSM Collection : Kit officiel, Académie, communauté, défis et commissions jusqu\'à 20 %. Inscription gratuite, formation continue, retraits Mobile Money.',
  url: 'https://ambassadeur-programme.vercel.app/ambassadeur',
  image: 'https://ambassadeur-programme.vercel.app/icons/logo-original.png',
};

export const KIT_ITEMS = [
  {
    icon: 'Shirt',
    title: 'T-shirt officiel VSM',
    desc: 'Identité visuelle premium pour vos contenus et événements.',
  },
  {
    icon: 'CreditCard',
    title: 'Carte Ambassadeur',
    desc: 'Preuve officielle avec QR Code personnel au verso.',
  },
  {
    icon: 'FileSignature',
    title: 'Charte d\'engagement',
    desc: 'Signature de votre intégration officielle au programme.',
  },
];

export const TSHIRT_BENEFITS = [
  { icon: 'BadgeCheck', text: 'Identité officielle reconnue par VSM Collection' },
  { icon: 'Camera', text: 'Contenus professionnels pour réseaux sociaux' },
  { icon: 'Sparkles', text: 'Crédibilité auprès de vos prospects' },
  { icon: 'Heart', text: 'Inspirer confiance — vous portez la marque' },
  { icon: 'Megaphone', text: 'Promouvoir une marque que vous représentez réellement' },
];

export const CARD_BENEFITS = [
  { icon: 'ShieldCheck', text: 'Identifié comme ambassadeur officiel VSM' },
  { icon: 'Users', text: 'Rassurer les clients lors de vos échanges' },
  { icon: 'Calendar', text: 'Représenter la marque lors d\'événements' },
];

export const QR_FLOW = [
  { icon: 'ScanLine', label: 'Scan QR', sub: 'Client scanne votre code' },
  { icon: 'Globe', label: 'Redirection', sub: 'Vers vsmcollection.com' },
  { icon: 'Link2', label: 'Tracking', sub: 'Lien ambassadeur appliqué' },
  { icon: 'ShoppingBag', label: 'Achat', sub: 'En ligne ou en boutique' },
  { icon: 'Coins', label: 'Commission', sub: 'Attribuée automatiquement' },
];

export const QR_CHANNELS = [
  { icon: 'Globe', title: 'Site Internet', desc: 'Code promo et lien /r/VSM-XXXX sur chaque commande en ligne.' },
  { icon: 'Store', title: 'Points de vente', desc: 'Le même code fonctionne en boutique physique VSM.' },
  { icon: 'Smartphone', title: 'QR Code personnel', desc: 'Un scan = une vente rattachée à votre compte.' },
];

export const TRAINING_MODULES = [
  { icon: 'Rocket', title: 'Formation d\'intégration', desc: 'Premiers pas dans le programme ambassadeur.' },
  { icon: 'BookOpen', title: 'Comment fonctionne le programme', desc: 'Règles, commissions et niveaux expliqués.' },
  { icon: 'LayoutDashboard', title: 'Utilisation du tableau de bord', desc: 'Maîtrisez stats, liens et retraits.' },
  { icon: 'TrendingUp', title: 'Génération de ventes', desc: 'Stratégies pour convertir votre audience.' },
  { icon: 'Sparkles', title: 'Marketing d\'influence', desc: 'Techniques d\'influence authentique.' },
  { icon: 'Clapperboard', title: 'Création de contenu', desc: 'Photos, vidéos et stories qui vendent.' },
  { icon: 'Share2', title: 'Réseaux sociaux', desc: 'Instagram, TikTok, WhatsApp et plus.' },
  { icon: 'UserCircle', title: 'Personal Branding', desc: 'Construisez votre image d\'ambassadeur.' },
  { icon: 'Briefcase', title: 'Développement commercial', desc: 'Prospection et closing efficaces.' },
  { icon: 'MessageCircle', title: 'Communication', desc: 'Messages percutants et relation client.' },
  { icon: 'Target', title: 'Techniques de vente', desc: 'Convaincre sans forcer.' },
  { icon: 'Repeat', title: 'Fidélisation des clients', desc: 'Transformez un acheteur en client fidèle.' },
];

export const COMMUNITY_FEATURES = [
  { icon: 'MessageSquare', title: 'Publications', desc: 'Partagez vos victoires et conseils.' },
  { icon: 'CircleDot', title: 'Stories', desc: 'Moments forts en format éphémère.' },
  { icon: 'MessagesSquare', title: 'Commentaires', desc: 'Échangez avec la communauté.' },
  { icon: 'Handshake', title: 'Entraide', desc: 'Demandez de l\'aide, recevez des conseils.' },
  { icon: 'Users', title: 'Réseau actif', desc: 'Connectez-vous avec d\'autres ambassadeurs.' },
  { icon: 'Lightbulb', title: 'Bonnes pratiques', desc: 'Inspirez-vous des meilleurs.' },
];

export const CHALLENGES_FEATURES = [
  { icon: 'Flame', title: 'Défis mensuels', desc: 'Relevez des challenges de ventes et d\'engagement.' },
  { icon: 'Trophy', title: 'Concours', desc: 'Compétitions entre ambassadeurs avec classement.' },
  { icon: 'Gift', title: 'Récompenses', desc: 'Bonus, avantages et surprises exclusives.' },
  { icon: 'Unlock', title: 'Déblocages', desc: 'Accédez à des perks en progressant.' },
  { icon: 'Medal', title: 'Badges', desc: 'Collectionnez vos accomplissements.' },
  { icon: 'Zap', title: 'Bonus commissions', desc: 'Gains supplémentaires sur objectifs atteints.' },
];

export const ACADEMY_SCREENSHOTS = [
  { key: 'dashboard', label: 'Tableau de bord', icon: 'LayoutDashboard' },
  { key: 'courses', label: 'Formations', icon: 'GraduationCap' },
  { key: 'videos', label: 'Vidéos & cours', icon: 'PlayCircle' },
  { key: 'community', label: 'Communauté', icon: 'Users' },
  { key: 'feed', label: 'Fil d\'actualité', icon: 'Newspaper' },
  { key: 'stories', label: 'Stories', icon: 'CircleDot' },
  { key: 'challenges', label: 'Défis', icon: 'Flame' },
  { key: 'badges', label: 'Badges', icon: 'Award' },
];

export const BENEFITS = [
  { icon: 'Wallet', title: 'Générer des revenus', desc: 'Commissions sur chaque vente confirmée via votre lien ou code promo.' },
  { icon: 'Globe', title: 'Travailler où vous voulez', desc: 'Depuis votre téléphone, où que vous soyez en RDC ou ailleurs.' },
  { icon: 'Package', title: 'Kit Ambassadeur pro', desc: 'T-shirt, carte officielle et charte — votre identité VSM.' },
  { icon: 'GraduationCap', title: 'Académie incluse', desc: 'Formations, communauté et défis pour évoluer.' },
  { icon: 'LayoutDashboard', title: 'Tableau de bord pro', desc: 'Statistiques, ventes et gains en temps réel.' },
  { icon: 'Activity', title: 'Suivi en temps réel', desc: 'Chaque clic et chaque commande est tracé automatiquement.' },
  { icon: 'Shield', title: 'Paiements sécurisés', desc: 'Retraits Mobile Money (Airtel, M-Pesa, Orange).' },
  { icon: 'TrendingUp', title: 'Évolution par niveaux', desc: 'Plus vous vendez, plus votre taux de commission augmente.' },
  { icon: 'Zap', title: 'Commissions automatiques', desc: 'Calcul transparent dès qu\'une commande est confirmée.' },
];

export const STEPS = [
  { n: 1, title: 'Je crée mon compte', desc: 'Formulaire simple en quelques minutes.', icon: 'UserPlus' },
  { n: 2, title: 'Je suis validé', desc: 'Notre équipe examine votre candidature.', icon: 'Clock' },
  { n: 3, title: 'J\'obtiens mon Kit', desc: 'T-shirt, carte et charte — 30 $.', icon: 'Package' },
  { n: 4, title: 'Je récupère mon lien', desc: 'Lien personnel + code promo + QR code.', icon: 'Link2' },
  { n: 5, title: 'Je partage', desc: 'Réseaux sociaux, WhatsApp, stories…', icon: 'Share2' },
  { n: 6, title: 'Je génère des ventes', desc: 'Vos abonnés achètent sur VSM Collection.', icon: 'ShoppingBag' },
  { n: 7, title: 'Je gagne & retire', desc: 'Commissions + Mobile Money.', icon: 'Smartphone' },
];

export const DASHBOARD_FEATURES = [
  { icon: 'BarChart3', title: 'Statistiques', desc: 'Ventes, CA, clics et visiteurs uniques.' },
  { icon: 'Award', title: 'Progression', desc: 'Barre de niveau Starter → Elite.' },
  { icon: 'Wallet', title: 'Commissions', desc: 'Gains disponibles et historique détaillé.' },
  { icon: 'History', title: 'Historique', desc: 'Toutes vos commandes et statuts.' },
  { icon: 'Banknote', title: 'Retraits', desc: 'Demande en quelques clics.' },
  { icon: 'Image', title: 'Ressources marketing', desc: 'Visuels et textes prêts à publier.' },
  { icon: 'MousePointerClick', title: 'Suivi des clics', desc: 'Performance de chaque lien partagé.' },
  { icon: 'Trophy', title: 'Classement', desc: 'Leaderboard mensuel des meilleurs vendeurs.' },
];

export const APPLY_FIELDS = [
  { label: 'Nom complet', desc: 'Votre identité officielle' },
  { label: 'Téléphone', desc: 'Contact & Mobile Money' },
  { label: 'Email', desc: 'Connexion à votre espace' },
  { label: 'Mot de passe', desc: 'Sécurise votre compte' },
  { label: 'Ville & âge', desc: 'Profil ambassadeur' },
  { label: 'Réseaux sociaux', desc: 'Instagram, TikTok, Facebook…' },
  { label: 'Motivation', desc: 'Pourquoi vous rejoignez VSM' },
];

export const FAQ = [
  { q: 'Comment devenir ambassadeur ?', a: 'Cliquez sur « Devenir Ambassadeur », remplissez le formulaire en 4 étapes. Une fois validé, vous obtenez votre Kit Ambassadeur (30 $), puis accédez à votre lien, QR code et tableau de bord.' },
  { q: 'Qu\'est-ce que le Kit Ambassadeur ?', a: 'C\'est votre pack d\'intégration officiel : T-shirt VSM Collection, Carte Ambassadeur avec QR Code personnel et signature de la Charte d\'engagement. Coût : 30 $. C\'est l\'étape qui confirme votre entrée dans le programme.' },
  { q: 'Comment fonctionne mon QR Code ?', a: 'Chaque scan redirige le client vers le site VSM avec votre lien de suivi appliqué automatiquement. Le même code promo fonctionne en ligne et en points de vente physiques.' },
  { q: 'Qu\'est-ce que l\'Académie Ambassadeur ?', a: 'Une plateforme complète incluse : formations vidéo, modules marketing, communauté privée, défis et badges. Vous apprenez, progressez et échangez avec les autres ambassadeurs.' },
  { q: 'Comment suis-je payé ?', a: 'Les commissions s\'accumulent sur votre solde disponible. Vous demandez un retrait via Mobile Money (Airtel, M-Pesa ou Orange).' },
  { q: 'Quand puis-je retirer mes gains ?', a: 'Après avoir réalisé au minimum 10 nouvelles ventes confirmées depuis votre dernier retrait actif.' },
  { q: 'Comment fonctionne le suivi ?', a: 'Chaque clic sur votre lien /r/VSM-XXXX est enregistré. Les commandes avec votre code promo ou lien vous sont attribuées automatiquement.' },
  { q: 'Comment partager mon lien ?', a: 'Copiez votre lien depuis le dashboard, partagez-le en story, bio, WhatsApp ou utilisez le QR code intégré.' },
  { q: 'Combien puis-je gagner ?', a: 'De 10 % à 20 % de commission selon votre niveau (Starter à Elite). Plus vous vendez, plus le taux augmente.' },
  { q: 'Y a-t-il des frais ?', a: 'L\'inscription au programme est gratuite. Le Kit Ambassadeur (30 $) est l\'unique investissement pour obtenir votre identité officielle, votre carte et votre accès complet au lien de parrainage.' },
  { q: 'Puis-je arrêter quand je veux ?', a: 'Oui. Aucun engagement. Vous pouvez cesser de partager votre lien à tout moment.' },
  { q: 'Comment monter de niveau ?', a: 'Vos ventes confirmées cumulées déterminent votre palier. Consultez la barre de progression dans votre dashboard.' },
];

export const TRUST_POINTS = [
  'Plateforme sécurisée Supabase',
  'Suivi transparent des ventes',
  'Calcul automatique des commissions',
  'Historique consultable 24h/24',
  'Paiements Mobile Money fiables',
  'Données personnelles protégées',
];

export const TESTIMONIALS = [
  { name: 'Angelina L.', role: 'Ambassadeur Elite', quote: 'Le dashboard me permet de suivre mes ventes en direct. Les retraits Mobile Money sont rapides.', stars: 5 },
  { name: 'Henry M.', role: 'Ambassadeur Gold', quote: 'J\'ai transformé ma communauté Instagram en revenus réguliers avec VSM.', stars: 5 },
  { name: 'Rachel T.', role: 'Ambassadeur Silver', quote: 'Inscription simple, équipe réactive, ressources marketing au top.', stars: 5 },
];

export const TIER_LANDING = TIERS.map((t) => ({
  ...t,
  range: t.max != null ? `${t.min}–${t.max} ventes` : `${t.min}+ ventes`,
}));

export const FALLBACK_STATS = {
  ambassadors: 120,
  commissionsPaid: 2500000,
  salesGenerated: 420,
  approvalRate: 92,
};
