/* eslint-disable react/no-unescaped-entities */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Star, Instagram, Facebook, Mail, MessageCircle,
} from 'lucide-react';
import { HEADER_LOGO, OPENING_LOGO } from '@/constants/branding';
import {
  BENEFITS, STEPS, DASHBOARD_FEATURES, APPLY_FIELDS, FAQ,
  TRUST_POINTS, TESTIMONIALS, LANDING_PATH, KIT_ITEMS, KIT_PRICE,
  TSHIRT_BENEFITS, CARD_BENEFITS, QR_CHANNELS, TRAINING_MODULES,
  COMMUNITY_FEATURES, CHALLENGES_FEATURES, ACADEMY_URL,
} from './landingData';
import { useLandingStats } from './useLandingStats';
import { useLandingSeo } from './useLandingSeo';
import { LandingMediaProvider, useLandingMedia, getSlotMedia, slotHasMedia } from './useLandingMedia';
import LandingMediaSlot from './LandingMediaSlot';
import {
  FadeIn, Icon, SectionEyebrow, SectionTitle, PrimaryBtn,
  CtaBand, FaqItem, AnimatedCounter,
} from './LandingUi';
import {
  CommissionFlowDiagram, TierLadder, QueueTimeline, ApplyPreviewMockup, KitOverviewMockup,
  TshirtMockup, QrCodeInfographic, AcademyDashboardMockup,
  AcademyCommunityMockup, AcademyChallengesMockup, AmbassadorCardMockup,
} from './LandingMockups';
import { useKitTshirtImage } from './useKitTshirtImage';

function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-black/90 backdrop-blur-md">
      <div className="vsm-container flex items-center justify-between h-14 sm:h-16 gap-3">
        <Link to={LANDING_PATH} className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-sm shrink-0">
          <img src={HEADER_LOGO} alt="VSM Collection" className="h-7 sm:h-9 w-auto" width={120} height={36} />
        </Link>
        <nav className="hidden lg:flex items-center gap-5 text-[10px] xl:text-xs uppercase tracking-wider text-muted-foreground" aria-label="Navigation principale">
          <a href="#avantages" className="hover:text-primary transition">Avantages</a>
          <a href="#kit" className="hover:text-primary transition">Kit</a>
          <a href="#academy" className="hover:text-primary transition">Académie</a>
          <a href="#dashboard" className="hover:text-primary transition">Dashboard</a>
          <a href="#faq" className="hover:text-primary transition">FAQ</a>
        </nav>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-28 overflow-hidden" aria-labelledby="hero-title">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
      </div>
      <div className="vsm-container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <FadeIn>
            <span className="vsm-badge mb-4">Programme officiel VSM</span>
            <h1 id="hero-title" className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold uppercase leading-[1.05] tracking-tight mb-5 text-balance">
              Transformez votre <span className="vsm-gradient-text">communauté</span> en source de revenus
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed">
              Rejoignez un écosystème professionnel : Kit officiel, Académie, communauté et commissions jusqu'à 20 %.
            </p>
            <ul className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-2 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
              <li>✓ Inscription gratuite</li>
              <li>✓ Kit pro 30 $</li>
              <li>✓ Académie incluse</li>
            </ul>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="relative">
              <div className="absolute -inset-4 bg-primary/5 rounded-lg blur-2xl" aria-hidden="true" />
              <LandingMediaSlot slotKey="hero_dashboard" aspect="phone" phoneFrame />
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

function HeroVideoSection() {
  return (
    <section className="py-16 sm:py-24 lg:py-32 border-b border-border/50" aria-labelledby="hero-video-title">
      <div className="vsm-container">
        <FadeIn>
          <h2 id="hero-video-title" className="sr-only">Présentation vidéo</h2>
          <LandingMediaSlot slotKey="hero_video" aspect="hero" framed className="w-full shadow-2xl shadow-primary/15" />
        </FadeIn>
      </div>
    </section>
  );
}

function KitCardVisual({ className = '' }) {
  const { mediaBySlot } = useLandingMedia();
  const slot = getSlotMedia(mediaBySlot, 'kit_card');
  if (slotHasMedia(slot)) {
    return <LandingMediaSlot slotKey="kit_card" aspect="phone" phoneFrame className={className} />;
  }
  return <AmbassadorCardMockup />;
}

function StatsBar() {
  const { stats } = useLandingStats();
  const items = [
    { label: 'Ambassadeurs actifs', value: stats.ambassadors, suffix: '+' },
    { label: 'Ventes générées', value: stats.salesGenerated, suffix: '+' },
    { label: 'Commissions versées', value: stats.commissionsPaid, suffix: ' FC' },
    { label: 'Taux d\'approbation', value: stats.approvalRate, suffix: '%' },
  ];
  return (
    <section className="py-10 border-y border-border bg-secondary/30" aria-label="Statistiques du programme">
      <div className="vsm-container grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
        {items.map((item, i) => (
          <FadeIn key={item.label} delay={i * 0.08}>
            <p className="font-display text-2xl sm:text-3xl text-primary">
              <AnimatedCounter value={item.value} suffix={item.suffix} />
            </p>
            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mt-1">{item.label}</p>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section id="avantages" className="py-20 sm:py-28" aria-labelledby="benefits-title">
      <div className="vsm-container">
        <FadeIn className="text-center max-w-2xl mx-auto mb-14">
          <SectionEyebrow>Pourquoi nous rejoindre</SectionEyebrow>
          <SectionTitle id="benefits-title">Pourquoi devenir ambassadeur ?</SectionTitle>
          <p className="text-muted-foreground mt-4">Tout ce qu'il faut pour monétiser votre influence, sans complexité.</p>
        </FadeIn>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BENEFITS.map((b, i) => (
            <FadeIn key={b.title} delay={i * 0.05}>
              <div className="vsm-card p-5 h-full group hover:border-primary/40 transition">
                <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary/20 transition">
                  <Icon name={b.icon} className="w-5 h-5" />
                </div>
                <h3 className="font-display text-sm uppercase font-semibold mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn className="mt-12">
          <CtaBand title="Prêt à commencer ?" subtitle="Rejoignez des centaines d'ambassadeurs VSM." compact />
        </FadeIn>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="comment" className="py-20 sm:py-28 bg-secondary/20" aria-labelledby="steps-title">
      <div className="vsm-container">
        <FadeIn className="text-center max-w-2xl mx-auto mb-14">
          <SectionEyebrow>Processus simple</SectionEyebrow>
          <SectionTitle id="steps-title">Comment ça fonctionne ?</SectionTitle>
        </FadeIn>
        <div className="flex gap-3 overflow-x-auto pb-2 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 sm:gap-4 snap-x snap-mandatory sm:snap-none -mx-1 px-1">
          {STEPS.map((s, i) => (
            <FadeIn key={s.n} delay={i * 0.06}>
              <div className="vsm-card p-4 text-center h-full relative shrink-0 w-[148px] sm:w-auto snap-start min-w-0">
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center font-display">
                  {s.n}
                </span>
                <div className="w-10 h-10 mx-auto rounded-sm bg-primary/10 flex items-center justify-center text-primary mb-3">
                  <Icon name={s.icon} />
                </div>
                <h3 className="font-display text-xs uppercase font-semibold mb-1">{s.title}</h3>
                <p className="text-[11px] text-muted-foreground">{s.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn className="mt-12 max-w-xl mx-auto">
          <CtaBand title="Lancez-vous en 5 minutes" primaryLabel="Créer mon compte" compact />
        </FadeIn>
      </div>
    </section>
  );
}

function ScreenshotsSection() {
  return (
    <section id="dashboard" className="py-20 sm:py-28" aria-labelledby="screens-title">
      <div className="vsm-container">
        <FadeIn className="text-center max-w-2xl mx-auto mb-14">
          <SectionEyebrow>Aperçu produit</SectionEyebrow>
          <SectionTitle id="screens-title">Votre espace ambassadeur</SectionTitle>
          <p className="text-muted-foreground mt-4">Un tableau de bord pensé pour performer — disponible sur mobile et desktop.</p>
        </FadeIn>
        <FadeIn className="flex justify-center mb-12 sm:mb-16">
          <LandingMediaSlot slotKey="dashboard_main" aspect="phone" phoneFrame />
        </FadeIn>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DASHBOARD_FEATURES.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.04}>
              <div className="flex gap-3 p-4 rounded-sm border border-border hover:border-primary/30 transition">
                <Icon name={f.icon} className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display text-xs uppercase font-semibold">{f.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function CommissionsSection() {
  return (
    <section className="py-20 sm:py-28 bg-secondary/20" aria-labelledby="commission-title">
      <div className="vsm-container">
        <FadeIn className="text-center max-w-2xl mx-auto mb-14">
          <SectionEyebrow>Rémunération transparente</SectionEyebrow>
          <SectionTitle id="commission-title">Comment vous gagnez</SectionTitle>
          <p className="text-muted-foreground mt-4">Chaque vente confirmée génère une commission. Votre taux augmente avec votre volume.</p>
        </FadeIn>
        <FadeIn className="mb-10"><CommissionFlowDiagram /></FadeIn>
        <FadeIn delay={0.1}><TierLadder /></FadeIn>
        <FadeIn className="mt-12">
          <CtaBand title="Visez le niveau Elite — 20 %" subtitle="Plus vous vendez, plus vous gagnez par commande." compact />
        </FadeIn>
      </div>
    </section>
  );
}

function QueueSection() {
  return (
    <section className="py-16 sm:py-28" aria-labelledby="queue-title">
      <div className="vsm-container grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <FadeIn className="min-w-0">
          <SectionEyebrow>Validation candidature</SectionEyebrow>
          <SectionTitle id="queue-title">File d'attente & validation</SectionTitle>
          <p className="text-muted-foreground mt-4 mb-6 leading-relaxed text-sm sm:text-base">
            Après votre inscription, votre candidature entre en file d'examen. Une fois validé, vous obtenez votre Kit Ambassadeur avant de recevoir votre lien et QR code.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Notification push dès l'approbation</li>
            <li>• Kit Ambassadeur — étape d'intégration officielle</li>
            <li>• Lien & QR code débloqués après le Kit</li>
          </ul>
        </FadeIn>
        <FadeIn delay={0.12} className="min-w-0"><QueueTimeline /></FadeIn>
      </div>
    </section>
  );
}

function KitSection() {
  return (
    <section id="kit" className="py-16 sm:py-28 bg-secondary/20" aria-labelledby="kit-title">
      <div className="vsm-container">
        <FadeIn className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <SectionEyebrow>Intégration officielle</SectionEyebrow>
          <SectionTitle id="kit-title">Le Kit Ambassadeur</SectionTitle>
          <p className="text-muted-foreground mt-4 text-sm sm:text-base">
            Après validation, obtenez votre Kit avant de recevoir votre lien de parrainage et votre code personnel. Un investissement dans votre activité — pas un simple paiement.
          </p>
        </FadeIn>
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-10">
          <FadeIn className="min-w-0"><KitOverviewMockup /></FadeIn>
          <FadeIn delay={0.1} className="min-w-0">
            <div className="grid gap-4">
              {KIT_ITEMS.map((item) => (
                <div key={item.title} className="vsm-card p-4 sm:p-5 flex gap-4 items-start">
                  <div className="w-10 h-10 shrink-0 rounded-sm bg-primary/10 flex items-center justify-center text-primary">
                    <Icon name={item.icon} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-sm uppercase font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              <strong className="text-primary font-display text-lg">{KIT_PRICE} $</strong>
              {' '}— votre passeport officiel dans le programme VSM Collection.
            </p>
          </FadeIn>
        </div>
        <FadeIn><CtaBand title="Intégrez le programme officiellement" primaryLabel="Demander mon inscription" compact /></FadeIn>
      </div>
    </section>
  );
}

function KitUtilitySection() {
  const tshirtSrc = useKitTshirtImage();

  return (
    <section className="py-16 sm:py-28" aria-labelledby="kit-utility-title">
      <div className="vsm-container">
        <FadeIn className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <SectionEyebrow>Outils professionnels</SectionEyebrow>
          <SectionTitle id="kit-utility-title">Pourquoi ce kit est indispensable</SectionTitle>
        </FadeIn>
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          <FadeIn className="min-w-0">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start mb-6">
              <TshirtMockup imageSrc={tshirtSrc} />
              <div className="min-w-0">
                <h3 className="font-display text-xl uppercase font-bold mb-4 text-center sm:text-left">Le T-shirt officiel</h3>
                <ul className="space-y-3">
                  {TSHIRT_BENEFITS.map((b) => (
                    <li key={b.text} className="flex gap-3 text-sm text-muted-foreground">
                      <Icon name={b.icon} className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{b.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={0.1} className="min-w-0">
            <h3 className="font-display text-xl uppercase font-bold mb-4 text-center lg:text-left">La Carte Ambassadeur</h3>
            <ul className="space-y-3 mb-6">
              {CARD_BENEFITS.map((b) => (
                <li key={b.text} className="flex gap-3 text-sm text-muted-foreground">
                  <Icon name={b.icon} className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{b.text}</span>
                </li>
              ))}
            </ul>
            <KitCardVisual className="mx-auto lg:mx-0" />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

function QrCodeSection() {
  return (
    <section className="py-16 sm:py-28 bg-secondary/20" aria-labelledby="qr-title">
      <div className="vsm-container">
        <FadeIn className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <SectionEyebrow>Tracking automatique</SectionEyebrow>
          <SectionTitle id="qr-title">Votre QR Code personnel</SectionTitle>
          <p className="text-muted-foreground mt-4 text-sm sm:text-base">
            Chaque ambassadeur possède un QR Code unique. Un scan = une vente rattachée à votre compte, automatiquement.
          </p>
        </FadeIn>
        <FadeIn className="mb-8 min-w-0"><QrCodeInfographic /></FadeIn>
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {QR_CHANNELS.map((ch, i) => (
            <FadeIn key={ch.title} delay={i * 0.06}>
              <div className="vsm-card p-4 sm:p-5 h-full text-center sm:text-left">
                <Icon name={ch.icon} className="w-6 h-6 text-primary mx-auto sm:mx-0 mb-3" />
                <h3 className="font-display text-xs uppercase font-semibold">{ch.title}</h3>
                <p className="text-xs text-muted-foreground mt-2">{ch.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn><CtaBand title="Obtenez votre QR Code personnel" subtitle="Inscrivez-vous, validez votre Kit, partagez et vendez." compact /></FadeIn>
      </div>
    </section>
  );
}

function AcademySection() {
  return (
    <section id="academy" className="py-16 sm:py-28 relative overflow-hidden" aria-labelledby="academy-title">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-black/50 to-black pointer-events-none" />
      <div className="vsm-container relative z-10">
        <FadeIn className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <SectionEyebrow>Formation continue</SectionEyebrow>
          <SectionTitle id="academy-title">VSM Ambassador Academy</SectionTitle>
          <p className="text-muted-foreground mt-4 text-sm sm:text-base">
            L'un des plus grands avantages du programme : une plateforme complète pour apprendre, évoluer et développer vos compétences — incluse pour chaque ambassadeur validé.
          </p>
        </FadeIn>
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-10">
          <FadeIn className="min-w-0"><AcademyDashboardMockup /></FadeIn>
          <FadeIn delay={0.1} className="min-w-0">
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li className="flex gap-3"><Icon name="GraduationCap" className="w-5 h-5 text-primary shrink-0" /><span><strong className="text-foreground">12+ modules</strong> — de l'intégration au personal branding</span></li>
              <li className="flex gap-3"><Icon name="Users" className="w-5 h-5 text-primary shrink-0" /><span><strong className="text-foreground">Communauté privée</strong> — entraide et partage d'expériences</span></li>
              <li className="flex gap-3"><Icon name="Flame" className="w-5 h-5 text-primary shrink-0" /><span><strong className="text-foreground">Défis & récompenses</strong> — bonus, badges et concours</span></li>
              <li className="flex gap-3"><Icon name="Smartphone" className="w-5 h-5 text-primary shrink-0" /><span><strong className="text-foreground">100 % mobile</strong> — formez-vous où vous voulez</span></li>
            </ul>
            <p className="mt-6 text-xs text-muted-foreground">
              Plateforme :{' '}
              <a href={ACADEMY_URL} className="text-primary hover:underline break-all" rel="noopener noreferrer" target="_blank">
                VSM Ambassador Academy
              </a>
              {' '}— accès inclus après validation.
            </p>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

function TrainingSection() {
  return (
    <section className="py-16 sm:py-28 bg-secondary/20" aria-labelledby="training-title">
      <div className="vsm-container">
        <FadeIn className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <SectionEyebrow>Programme de formation</SectionEyebrow>
          <SectionTitle id="training-title">Tout pour réussir</SectionTitle>
        </FadeIn>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {TRAINING_MODULES.map((m, i) => (
            <FadeIn key={m.title} delay={i * 0.03}>
              <div className="vsm-card p-3 sm:p-4 h-full group hover:border-primary/40 transition min-w-0">
                <Icon name={m.icon} className="w-5 h-5 text-primary mb-2 sm:mb-3" />
                <h3 className="font-display text-[10px] sm:text-xs uppercase font-semibold leading-snug">{m.title}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 hidden sm:block">{m.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function CommunitySection() {
  return (
    <section className="py-16 sm:py-28" aria-labelledby="community-title">
      <div className="vsm-container grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <FadeIn className="min-w-0 order-2 lg:order-1"><AcademyCommunityMockup /></FadeIn>
        <FadeIn delay={0.1} className="min-w-0 order-1 lg:order-2">
          <SectionEyebrow>Entraide</SectionEyebrow>
          <SectionTitle id="community-title">Communauté privée</SectionTitle>
          <p className="text-muted-foreground mt-4 mb-6 text-sm sm:text-base">
            Rejoignez une communauté active d'ambassadeurs VSM. Partagez, apprenez et progressez ensemble.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {COMMUNITY_FEATURES.map((f) => (
              <div key={f.title} className="flex gap-2 p-3 rounded-sm border border-border min-w-0">
                <Icon name={f.icon} className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-display text-[10px] sm:text-xs uppercase font-semibold">{f.title}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function ChallengesSection() {
  return (
    <section className="py-16 sm:py-28 bg-secondary/20" aria-labelledby="challenges-title">
      <div className="vsm-container grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <FadeIn className="min-w-0">
          <SectionEyebrow>Progression gamifiée</SectionEyebrow>
          <SectionTitle id="challenges-title">Défis & récompenses</SectionTitle>
          <p className="text-muted-foreground mt-4 mb-6 text-sm sm:text-base">
            Relevez des challenges, participez à des concours et débloquez des avantages exclusifs au fil de votre progression.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {CHALLENGES_FEATURES.map((f) => (
              <div key={f.title} className="vsm-card p-3 sm:p-4 min-w-0">
                <Icon name={f.icon} className="w-5 h-5 text-primary mb-2" />
                <p className="font-display text-xs uppercase font-semibold">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </FadeIn>
        <FadeIn delay={0.1} className="min-w-0"><AcademyChallengesMockup /></FadeIn>
      </div>
    </section>
  );
}

function EcosystemCtaSection() {
  return (
    <section className="py-16 sm:py-24" aria-labelledby="ecosystem-cta">
      <div className="vsm-container">
        <FadeIn>
          <div className="vsm-card border-primary/30 bg-gradient-to-br from-primary/15 via-black to-black p-8 sm:p-12 text-center">
            <h2 id="ecosystem-cta" className="font-display text-xl sm:text-3xl lg:text-4xl font-bold uppercase mb-5 text-balance leading-tight">
              Rejoignez une communauté qui vous forme, vous accompagne et vous donne les outils pour réussir
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto mb-8 text-balance">
              Identité officielle, Kit pro, Académie, communauté, défis et tableau de bord performant — tout l'écosystème VSM Collection.
            </p>
            <PrimaryBtn to="/apply" className="w-full sm:w-auto !px-10 !py-4 text-sm sm:text-base">
              Je rejoins le Programme Ambassadeur <ArrowRight className="w-5 h-5" />
            </PrimaryBtn>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function ApplyPreviewSection() {
  return (
    <section className="py-20 sm:py-28 bg-secondary/20" aria-labelledby="apply-preview-title">
      <div className="vsm-container grid lg:grid-cols-2 gap-12 items-center">
        <FadeIn>
          <ApplyPreviewMockup />
        </FadeIn>
        <FadeIn delay={0.1}>
          <SectionEyebrow>Inscription</SectionEyebrow>
          <SectionTitle id="apply-preview-title">Ce que nous demandons</SectionTitle>
          <p className="text-muted-foreground mt-4 mb-6">Formulaire en 4 étapes — environ 5 minutes. Voici les informations principales :</p>
          <ul className="space-y-3 mb-8">
            {APPLY_FIELDS.map((f) => (
              <li key={f.label} className="flex gap-3 text-sm">
                <span className="text-primary font-semibold">→</span>
                <span><strong className="text-foreground">{f.label}</strong> — {f.desc}</span>
              </li>
            ))}
          </ul>
          <PrimaryBtn to="/apply">Commencer mon inscription <ArrowRight className="w-4 h-4" /></PrimaryBtn>
        </FadeIn>
      </div>
    </section>
  );
}

function SocialProofSection() {
  const { stats } = useLandingStats();
  return (
    <section className="py-20 sm:py-28" aria-labelledby="social-title">
      <div className="vsm-container">
        <FadeIn className="text-center max-w-2xl mx-auto mb-14">
          <SectionEyebrow>Communauté VSM</SectionEyebrow>
          <SectionTitle id="social-title">Pourquoi des centaines nous rejoignent</SectionTitle>
        </FadeIn>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {TESTIMONIALS.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.08}>
              <blockquote className="vsm-card p-6 h-full">
                <div className="flex gap-1 mb-3" aria-label={`${t.stars} étoiles`}>
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{t.quote}"</p>
                <footer>
                  <p className="font-display text-sm uppercase">{t.name}</p>
                  <p className="text-xs text-primary">{t.role}</p>
                </footer>
              </blockquote>
            </FadeIn>
          ))}
        </div>
        <FadeIn>
          <div className="vsm-card p-8 grid sm:grid-cols-3 gap-6 text-center">
            <div>
              <p className="font-display text-3xl text-primary"><AnimatedCounter value={stats.ambassadors} suffix="+" /></p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Ambassadeurs</p>
            </div>
            <div>
              <p className="font-display text-3xl text-primary"><AnimatedCounter value={stats.salesGenerated} suffix="+" /></p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Ventes trackées</p>
            </div>
            <div>
              <p className="font-display text-3xl text-primary"><AnimatedCounter value={Math.round(stats.commissionsPaid / 1000)} suffix="K FC" /></p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Commissions</p>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="py-20 sm:py-28 bg-secondary/20" aria-labelledby="trust-title">
      <div className="vsm-container max-w-3xl mx-auto text-center">
        <FadeIn>
          <SectionEyebrow>Sérénité</SectionEyebrow>
          <SectionTitle id="trust-title">Une plateforme de confiance</SectionTitle>
          <ul className="mt-10 grid sm:grid-cols-2 gap-4 text-left">
            {TRUST_POINTS.map((t) => (
              <li key={t} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-primary shrink-0" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </FadeIn>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="py-20 sm:py-28" aria-labelledby="faq-title">
      <div className="vsm-container max-w-3xl">
        <FadeIn className="text-center mb-12">
          <SectionEyebrow>Questions fréquentes</SectionEyebrow>
          <SectionTitle id="faq-title">FAQ</SectionTitle>
        </FadeIn>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <FadeIn key={item.q} delay={i * 0.03}>
              <FaqItem id={i} q={item.q} a={item.a} />
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden" aria-labelledby="final-cta">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-black to-black pointer-events-none" />
      <div className="vsm-container relative z-10 text-center max-w-3xl mx-auto">
        <FadeIn>
          <img src={OPENING_LOGO} alt="" className="w-32 mx-auto mb-8 opacity-90" width={128} height={128} loading="lazy" />
          <h2 id="final-cta" className="font-display text-3xl sm:text-5xl font-bold uppercase mb-5">
            Votre communauté mérite de <span className="vsm-gradient-text">rapporter</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg mb-10 text-balance">
            Rejoignez l'écosystème Ambassadeur VSM Collection. Inscription gratuite, Kit pro, Académie incluse, commissions jusqu'à 20 %.
          </p>
          <PrimaryBtn to="/apply" className="w-full sm:w-auto !px-8 !py-4 text-sm sm:text-base">
            Je deviens Ambassadeur maintenant <ArrowRight className="w-5 h-5" />
          </PrimaryBtn>
        </FadeIn>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-border py-12 bg-black" role="contentinfo">
      <div className="vsm-container">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div>
            <img src={HEADER_LOGO} alt="VSM Collection" className="h-8 mb-4" width={120} height={32} loading="lazy" />
            <p className="text-sm text-muted-foreground">Programme Ambassadeur officiel — Vivre avec style.</p>
          </div>
          <div>
            <p className="font-display text-xs uppercase tracking-wider mb-3">Programme</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to={LANDING_PATH} className="hover:text-primary">Accueil</Link></li>
              <li><Link to="/apply" className="hover:text-primary">Inscription</Link></li>
              <li><a href="#kit" className="hover:text-primary">Kit Ambassadeur</a></li>
              <li><a href="#academy" className="hover:text-primary">Académie</a></li>
              <li><a href="#faq" className="hover:text-primary">FAQ</a></li>
            </ul>
          </div>
          <div>
            <p className="font-display text-xs uppercase tracking-wider mb-3">Légal</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="https://www.vsmcollection.com" className="hover:text-primary" rel="noopener noreferrer">VSM Collection</a></li>
              <li><span>Mentions légales</span></li>
              <li><span>Politique de confidentialité</span></li>
            </ul>
          </div>
          <div>
            <p className="font-display text-xs uppercase tracking-wider mb-3">Support</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="mailto:support@vsmcollection.com" className="hover:text-primary inline-flex items-center gap-1"><Mail className="w-3 h-3" /> Email</a></li>
              <li><a href="https://wa.me/243812585022" className="hover:text-primary inline-flex items-center gap-1" rel="noopener noreferrer"><MessageCircle className="w-3 h-3" /> WhatsApp</a></li>
            </ul>
            <div className="flex gap-3 mt-4">
              <a href="https://instagram.com" aria-label="Instagram" className="text-muted-foreground hover:text-primary"><Instagram className="w-5 h-5" /></a>
              <a href="https://facebook.com" aria-label="Facebook" className="text-muted-foreground hover:text-primary"><Facebook className="w-5 h-5" /></a>
            </div>
          </div>
        </div>
        <div className="vsm-divider mb-6" />
        <p className="text-center text-xs text-muted-foreground">© {new Date().getFullYear()} VSM Collection — Tous droits réservés.</p>
      </div>
    </footer>
  );
}

export default function AmbassadorLanding() {
  useLandingSeo();

  return (
    <LandingMediaProvider>
      <div className="min-h-screen grain bg-background text-foreground relative overflow-x-hidden">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 rounded-sm">
          Aller au contenu principal
        </a>
        <LandingHeader />
        <main id="main-content">
          <HeroSection />
          <HeroVideoSection />
          <StatsBar />
          <BenefitsSection />
          <HowItWorksSection />
          <QueueSection />
          <KitSection />
          <KitUtilitySection />
          <QrCodeSection />
          <ScreenshotsSection />
          <CommissionsSection />
          <ApplyPreviewSection />
          <AcademySection />
          <TrainingSection />
          <CommunitySection />
          <ChallengesSection />
          <EcosystemCtaSection />
          <SocialProofSection />
          <TrustSection />
          <FaqSection />
          <FinalCtaSection />
        </main>
        <LandingFooter />
      </div>
    </LandingMediaProvider>
  );
}
