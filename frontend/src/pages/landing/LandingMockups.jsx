import React from 'react';
import { BrowserFrame, PhoneFrame } from './LandingUi';
import { TIERS } from '@/lib/ambassador';

export function DashboardMockup() {
  return (
    <BrowserFrame title="dashboard — VSM Ambassador">
      <div className="space-y-4 text-xs sm:text-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Bonjour,</p>
            <p className="font-display text-lg uppercase">Marie Kabongo</p>
          </div>
          <span className="vsm-badge text-[10px]">VSM-A3F2</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { l: 'Ventes', v: '24', c: 'text-foreground' },
            { l: 'CA généré', v: '1,2M FC', c: 'text-foreground' },
            { l: 'Commissions', v: '156K FC', c: 'text-primary' },
            { l: 'Clics', v: '892', c: 'text-foreground' },
          ].map((s) => (
            <div key={s.l} className="rounded-sm border border-border bg-secondary/50 p-2.5">
              <p className="text-[10px] text-muted-foreground uppercase">{s.l}</p>
              <p className={`font-display text-base ${s.c}`}>{s.v}</p>
            </div>
          ))}
        </div>
        <div className="rounded-sm border border-border p-3">
          <p className="text-[10px] uppercase text-muted-foreground mb-2">Niveau Silver — 13 %</p>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full w-[62%] bg-primary rounded-full" />
          </div>
        </div>
        <div className="rounded-sm border border-primary/30 bg-primary/5 p-3 flex items-center justify-between">
          <span className="text-[10px] uppercase">Lien de suivi</span>
          <code className="text-primary text-[10px]">/r/VSM-A3F2</code>
        </div>
      </div>
    </BrowserFrame>
  );
}

export function WithdrawMockup() {
  return (
    <BrowserFrame title="retraits — Mobile Money">
      <div className="space-y-3 text-xs">
        <div className="text-center py-2">
          <p className="text-[10px] text-muted-foreground uppercase">Solde disponible</p>
          <p className="font-display text-2xl text-primary">89 500 FC</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['Airtel', 'M-Pesa', 'Orange'].map((op) => (
            <div key={op} className="border border-border rounded-sm py-2 text-center text-[10px] uppercase">{op}</div>
          ))}
        </div>
        <div className="h-8 rounded-sm bg-secondary border border-border" />
        <div className="h-8 rounded-sm bg-primary/90 flex items-center justify-center text-[10px] uppercase font-semibold text-primary-foreground">
          Demander un retrait
        </div>
      </div>
    </BrowserFrame>
  );
}

export function LeaderboardMockup() {
  return (
    <BrowserFrame title="classement mensuel">
      <div className="space-y-2 text-xs">
        {[
          { rank: 1, name: 'Marie K.', amount: '420K FC', medal: '🥇' },
          { rank: 2, name: 'Jean P.', amount: '380K FC', medal: '🥈' },
          { rank: 3, name: 'Sarah M.', amount: '290K FC', medal: '🥉' },
        ].map((r) => (
          <div key={r.rank} className="flex items-center justify-between border border-border rounded-sm px-3 py-2">
            <span>{r.medal} {r.name}</span>
            <span className="text-primary font-semibold">{r.amount}</span>
          </div>
        ))}
      </div>
    </BrowserFrame>
  );
}

export function CommissionFlowDiagram() {
  return (
    <div className="vsm-card p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center text-xs sm:text-sm">
        {[
          { label: 'Partage', sub: 'Lien / promo' },
          { label: 'Achat', sub: 'Client VSM' },
          { label: 'Confirmation', sub: 'Commande validée' },
          { label: 'Commission', sub: 'Crédit auto' },
        ].map((step, i, arr) => (
          <React.Fragment key={step.label}>
            <div className="flex-1 min-w-[100px]">
              <div className="w-12 h-12 mx-auto rounded-full border-2 border-primary/50 flex items-center justify-center font-display text-primary mb-2">
                {i + 1}
              </div>
              <p className="font-display uppercase text-sm">{step.label}</p>
              <p className="text-muted-foreground text-[10px] mt-1">{step.sub}</p>
            </div>
            {i < arr.length - 1 && (
              <div className="hidden sm:block text-primary text-xl" aria-hidden="true">→</div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export function TierLadder() {
  return (
    <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-3 overflow-x-auto pb-2 sm:pb-0 snap-x snap-mandatory sm:snap-none -mx-1 px-1">
      {TIERS.map((t) => (
        <div
          key={t.key}
          className="vsm-card p-4 text-center border-t-2 shrink-0 w-[140px] sm:w-auto snap-start"
          style={{ borderTopColor: t.color }}
        >
          <p className="font-display text-lg uppercase" style={{ color: t.color }}>{t.label}</p>
          <p className="text-2xl font-bold mt-1">{t.rate}%</p>
          <p className="text-[10px] text-muted-foreground mt-2 uppercase">
            {t.max != null ? `${t.min}–${t.max} ventes` : `${t.min}+ ventes`}
          </p>
        </div>
      ))}
    </div>
  );
}

export function QueueTimeline() {
  const phases = [
    { status: 'pending', label: 'Candidature envoyée', desc: 'Formulaire complété' },
    { status: 'review', label: 'Examen VSM', desc: '24–72 h ouvrées' },
    { status: 'kit', label: 'Kit Ambassadeur', desc: 'T-shirt, carte, charte — 30 $' },
    { status: 'approved', label: 'Compte activé', desc: 'Lien + QR code débloqués' },
    { status: 'live', label: 'Premières ventes', desc: 'Commissions créditées' },
  ];
  return (
    <div className="vsm-card p-6 sm:p-8">
      <div className="space-y-6">
        {phases.map((p, i) => (
          <div key={p.status} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full ${i < 2 ? 'bg-primary ring-4 ring-primary/20' : 'bg-border'}`} />
              {i < phases.length - 1 && <div className="w-px flex-1 bg-border min-h-[32px] sm:min-h-[40px] mt-1" />}
            </div>
            <div className="pb-4">
              <p className="font-display text-sm uppercase">{p.label}</p>
              <p className="text-sm text-muted-foreground">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ApplyPreviewMockup() {
  return (
    <BrowserFrame title="inscription — étape 1/4">
      <div className="space-y-3 text-xs">
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div className="h-full w-1/4 bg-primary" />
        </div>
        {['Nom complet', 'Téléphone', 'Email', 'Mot de passe'].map((f) => (
          <div key={f}>
            <p className="text-[10px] uppercase text-muted-foreground mb-1">{f}</p>
            <div className="h-8 rounded-sm bg-input border border-border" />
          </div>
        ))}
        <div className="h-9 rounded-sm bg-primary/90 flex items-center justify-center text-[10px] uppercase font-semibold">
          Continuer
        </div>
      </div>
    </BrowserFrame>
  );
}

function QrPattern() {
  return (
    <div className="grid grid-cols-5 gap-0.5 p-2 bg-white rounded-sm" aria-hidden="true">
      {Array.from({ length: 25 }).map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${[0, 1, 2, 4, 5, 6, 10, 12, 14, 18, 20, 22, 23, 24].includes(i) ? 'bg-black' : 'bg-white'}`}
        />
      ))}
    </div>
  );
}

export function KitOverviewMockup() {
  return (
    <div className="vsm-card p-5 sm:p-8 border-primary/30 bg-gradient-to-br from-primary/10 to-black">
      <div className="text-center mb-6">
        <span className="vsm-badge text-[10px]">Kit officiel</span>
        <p className="font-display text-3xl sm:text-4xl text-primary mt-3">30 $</p>
        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mt-1">Investissement unique</p>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-sm border border-border bg-secondary/40 p-3 text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-sm bg-primary/20 flex items-center justify-center text-lg">👕</div>
          <p className="text-[9px] sm:text-[10px] uppercase font-display">T-shirt</p>
        </div>
        <div className="rounded-sm border border-border bg-secondary/40 p-3 text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-sm bg-primary/20 flex items-center justify-center text-lg">💳</div>
          <p className="text-[9px] sm:text-[10px] uppercase font-display">Carte</p>
        </div>
        <div className="rounded-sm border border-border bg-secondary/40 p-3 text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-sm bg-primary/20 flex items-center justify-center text-lg">📋</div>
          <p className="text-[9px] sm:text-[10px] uppercase font-display">Charte</p>
        </div>
      </div>
    </div>
  );
}

export function AmbassadorCardMockup() {
  return (
    <div className="grid sm:grid-cols-2 gap-4 max-w-md mx-auto">
      <div className="aspect-[1.6/1] rounded-lg border-2 border-primary/50 bg-gradient-to-br from-zinc-900 via-black to-primary/20 p-4 flex flex-col justify-between shadow-xl shadow-primary/10">
        <div className="flex justify-between items-start">
          <p className="font-display text-[10px] sm:text-xs uppercase text-primary tracking-widest">VSM Collection</p>
          <span className="text-[8px] sm:text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-sm uppercase">Officiel</span>
        </div>
        <div>
          <p className="font-display text-sm sm:text-base uppercase">Marie Kabongo</p>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase mt-0.5">Ambassadeur Silver</p>
        </div>
        <p className="text-[8px] sm:text-[9px] text-muted-foreground font-mono">VSM-A3F2</p>
      </div>
      <div className="aspect-[1.6/1] rounded-lg border-2 border-border bg-zinc-950 p-3 flex flex-col items-center justify-center gap-2">
        <p className="text-[8px] sm:text-[9px] uppercase text-muted-foreground tracking-wider">QR Code personnel</p>
        <QrPattern />
        <p className="text-[8px] text-primary font-mono">Scan → vsmcollection.com</p>
      </div>
    </div>
  );
}

export function TshirtMockup({ imageSrc }) {
  return (
    <div className="relative mx-auto w-40 sm:w-48 shrink-0">
      <div className="aspect-[3/4] rounded-sm overflow-hidden border border-border bg-zinc-950 shadow-xl shadow-primary/10">
        <img
          src={imageSrc}
          alt="T-shirt officiel VSM Collection — Classic of life"
          className="w-full h-full object-cover object-top"
          loading="lazy"
          width={192}
          height={256}
        />
      </div>
      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold shadow-lg" aria-hidden="true">✓</div>
    </div>
  );
}

export function QrCodeInfographic() {
  return (
    <div className="vsm-card p-4 sm:p-6 overflow-x-auto">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-2 min-w-0">
        {[
          { n: 1, label: 'Scan', sub: 'QR ou code' },
          { n: 2, label: 'Site VSM', sub: 'Redirection auto' },
          { n: 3, label: 'Tracking', sub: 'Lien appliqué' },
          { n: 4, label: 'Achat', sub: 'Web ou boutique' },
          { n: 5, label: 'Gain', sub: 'Commission créditée' },
        ].map((step, i, arr) => (
          <React.Fragment key={step.n}>
            <div className="flex sm:flex-col items-center gap-3 sm:gap-0 sm:text-center flex-1 min-w-[80px]">
              <div className="w-10 h-10 shrink-0 rounded-full border-2 border-primary flex items-center justify-center font-display text-primary text-sm">
                {step.n}
              </div>
              <div className="sm:mt-2">
                <p className="font-display text-xs uppercase">{step.label}</p>
                <p className="text-[10px] text-muted-foreground">{step.sub}</p>
              </div>
            </div>
            {i < arr.length - 1 && (
              <div className="hidden sm:block text-primary shrink-0" aria-hidden="true">→</div>
            )}
            {i < arr.length - 1 && (
              <div className="sm:hidden flex justify-center text-primary py-1" aria-hidden="true">↓</div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export function AcademyDashboardMockup() {
  return (
    <PhoneFrame>
      <div className="p-3 space-y-3 text-xs bg-black min-h-[320px]">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display uppercase text-sm truncate">Academy</p>
          <span className="vsm-badge text-[8px] shrink-0">Niveau 3</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { l: 'Cours', v: '12/18' },
            { l: 'Badges', v: '7' },
            { l: 'Défis', v: '2 actifs' },
            { l: 'Points', v: '1 240' },
          ].map((s) => (
            <div key={s.l} className="rounded-sm border border-border p-2">
              <p className="text-[9px] text-muted-foreground uppercase">{s.l}</p>
              <p className="font-display text-sm text-primary">{s.v}</p>
            </div>
          ))}
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full w-[67%] bg-primary rounded-full" />
        </div>
        <p className="text-[9px] text-muted-foreground">Progression globale — 67 %</p>
      </div>
    </PhoneFrame>
  );
}

export function AcademyCoursesMockup() {
  return (
    <PhoneFrame>
      <div className="p-3 space-y-2 text-xs bg-black min-h-[320px]">
        {[
          { t: 'Formation d\'intégration', p: '100 %', done: true },
          { t: 'Marketing d\'influence', p: '60 %', done: false },
          { t: 'Techniques de vente', p: '0 %', done: false },
        ].map((c) => (
          <div key={c.t} className="flex items-center gap-2 border border-border rounded-sm p-2">
            <div className={`w-8 h-8 shrink-0 rounded-sm flex items-center justify-center ${c.done ? 'bg-primary/20 text-primary' : 'bg-secondary'}`}>
              {c.done ? '✓' : '▶'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] uppercase font-display">{c.t}</p>
              <div className="h-1 bg-secondary rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: c.p }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </PhoneFrame>
  );
}

export function AcademyCommunityMockup() {
  return (
    <PhoneFrame>
      <div className="p-3 space-y-2 text-xs bg-black min-h-[320px]">
        {[
          { user: 'Jean P.', text: 'Mon premier challenge réussi ! 🎉', likes: 24 },
          { user: 'Sarah M.', text: 'Conseil : utilisez le QR en story', likes: 18 },
        ].map((post) => (
          <div key={post.user} className="border border-border rounded-sm p-2">
            <p className="font-display text-[10px] uppercase text-primary">{post.user}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{post.text}</p>
            <p className="text-[9px] text-muted-foreground mt-1">♥ {post.likes}</p>
          </div>
        ))}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {['Story 1', 'Story 2', 'Story 3'].map((s) => (
            <div key={s} className="shrink-0 w-12 h-16 rounded-sm border-2 border-primary/40 bg-secondary/50 flex items-end p-1">
              <span className="text-[7px] uppercase">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

export function AcademyChallengesMockup() {
  return (
    <PhoneFrame>
      <div className="p-3 space-y-2 text-xs bg-black min-h-[320px]">
        <div className="border border-primary/40 bg-primary/5 rounded-sm p-3">
          <p className="font-display text-[10px] uppercase text-primary">Défi du mois</p>
          <p className="text-[10px] mt-1">5 ventes en 7 jours</p>
          <div className="h-1.5 bg-secondary rounded-full mt-2 overflow-hidden">
            <div className="h-full w-[40%] bg-primary rounded-full" />
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">2/5 — Bonus 5 000 FC</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['🥇 Starter', '🏆 Gold', '🔥 Streak'].map((b) => (
            <span key={b} className="text-[9px] border border-border rounded-full px-2 py-1">{b}</span>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

const ACADEMY_MOCKUP_MAP = {
  dashboard: AcademyDashboardMockup,
  courses: AcademyCoursesMockup,
  videos: AcademyCoursesMockup,
  community: AcademyCommunityMockup,
  feed: AcademyCommunityMockup,
  stories: AcademyCommunityMockup,
  challenges: AcademyChallengesMockup,
  badges: AcademyChallengesMockup,
};

export function AcademyScreenshotPlaceholder({ screenshotKey, label }) {
  const Mock = ACADEMY_MOCKUP_MAP[screenshotKey] || AcademyDashboardMockup;
  return (
    <div className="min-w-0 max-w-full">
      <Mock />
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground text-center mt-2">{label}</p>
    </div>
  );
}
