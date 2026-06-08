/* eslint-disable react/no-unescaped-entities */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { packMotivation } from '@/lib/ambassador';
import { ArrowLeft, Loader2, CheckCircle2, Instagram, Facebook, Music2, Sparkles } from 'lucide-react';

const PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'Twitter / X', 'Autre'];

export default function Apply() {
  const { signIn, refresh } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [f, setF] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    city: '',
    age: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    main_platform: 'Instagram',
    followers: '',
    motivation: '',
    prior_program: false,
    prior_program_details: '',
    promotion_plan: '',
    monthly_reach: '',
    accept_truth: false,
    accept_terms: false,
    accept_contact: false,
  });
  const upd = (k) => (e) => setF((s) => ({ ...s, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));

  const stepValid = (s) => {
    if (s === 1) return f.full_name && f.phone && f.email && f.password.length >= 6 && f.city && f.age;
    if (s === 2) return (f.instagram || f.facebook || f.tiktok) && f.followers;
    if (s === 3) return f.motivation.trim().length >= 20;
    if (s === 4) return f.promotion_plan.trim().length >= 10 && f.monthly_reach && f.accept_truth && f.accept_terms && f.accept_contact;
    return false;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!stepValid(4)) return;
    setError('');
    setLoading(true);

    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      const username = (f.instagram || f.facebook || f.tiktok || '')
        .replace(/^@/, '')
        .replace(/^https?:\/\/[^/]+\//, '')
        .replace(/\/$/, '');
      const res = await fetch(`${BACKEND_URL}/api/ambassador/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: f.full_name,
          phone: f.phone,
          email: f.email.trim(),
          password: f.password,
          username: username || f.full_name,
          main_platform: f.main_platform,
          profile_url: f.instagram || f.facebook || f.tiktok || '',
          motivation: packMotivation(f),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data?.detail === 'string'
            ? data.detail
            : Array.isArray(data?.detail)
            ? data.detail[0]?.msg
            : "Erreur lors de l'envoi.";
        setError(msg);
        setLoading(false);
        return;
      }
      const { error: loginErr } = await signIn(f.email.trim(), f.password);
      if (loginErr) {
        setLoading(false);
        setError("Candidature envoyée mais connexion échouée. Veuillez vous connecter manuellement.");
        return;
      }
      await refresh();
      setLoading(false);
      setSuccess(true);
    } catch (err) {
      setLoading(false);
      setError(err.message || "Erreur réseau lors de l'envoi.");
    }
  };

  if (success) {
    return (
      <div className="min-h-screen grain flex flex-col items-center justify-center px-4 py-10 bg-background">
        <div className="w-full max-w-lg vsm-card p-8 sm:p-10 text-center animate-fade-up" data-testid="apply-success-card">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-3">Candidature envoyée !</h1>
          <p className="text-muted-foreground mb-2">Merci pour votre intérêt envers VSM Collection.</p>
          <p className="text-muted-foreground mb-6">
            Votre candidature est actuellement en cours d'examen par notre équipe. Vous recevrez une notification dès qu'une décision sera prise.
          </p>
          <div className="text-sm uppercase tracking-wider text-primary font-semibold mb-6">— L'équipe VSM Collection</div>
          <button onClick={() => navigate('/dashboard')} data-testid="success-go-dashboard"
            className="bg-primary text-primary-foreground font-semibold uppercase tracking-wider text-sm px-6 py-3 rounded-sm hover:bg-primary/90 transition">
            Accéder à mon espace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grain flex flex-col bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-20">
        <div className="vsm-container py-4 flex items-center justify-between">
          <Link to="/login" className="text-sm flex items-center gap-2 text-muted-foreground hover:text-foreground" data-testid="back-to-login">
            <ArrowLeft className="w-4 h-4" /> Connexion
          </Link>
          <div className="font-display text-2xl font-bold">VSM<span className="text-primary">.</span></div>
          <div className="w-20" />
        </div>
      </header>

      <div className="vsm-container py-8 sm:py-12 max-w-3xl">
        {/* Intro */}
        <div className="mb-8 animate-fade-up">
          <div className="text-xs uppercase tracking-[0.3em] text-primary mb-3 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Candidature Programme Ambassadeur
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-bold leading-[0.95] mb-4">
            Rejoignez le<br />
            <span className="vsm-gradient-text">Programme Ambassadeur</span> VSM
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Représentez une marque qui partage la philosophie <em>« Vivre avec style »</em> et gagnez des récompenses
            en contribuant à son développement.
          </p>
          <ul className="grid sm:grid-cols-2 gap-2 mt-6 text-sm">
            {['Commissions sur vos ventes', 'Avantages & récompenses exclusifs', 'Campagnes spéciales de la marque', "Une communauté d'ambassadeurs"].map((b, i) => (
              <li key={i} className="flex gap-2 items-start"><span className="text-primary mt-0.5">▸</span> {b}</li>
            ))}
          </ul>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-6" data-testid="apply-stepper">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={`flex-1 h-1 rounded-full transition-all ${n <= step ? 'bg-primary' : 'bg-secondary'}`} />
          ))}
        </div>
        <div className="text-xs text-muted-foreground mb-6">Étape {step} / 4</div>

        <form onSubmit={submit} className="vsm-card p-6 sm:p-8 space-y-5">
          {step === 1 && (
            <div className="space-y-4" data-testid="apply-step-1">
              <h2 className="text-xl font-display font-bold">Informations personnelles</h2>
              <Field label="Nom complet" required>
                <input data-testid="apply-fullname" required value={f.full_name} onChange={upd('full_name')} className={inputCls} placeholder="Votre nom complet" />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Numéro WhatsApp" required>
                  <input data-testid="apply-phone" required type="tel" value={f.phone} onChange={upd('phone')} className={inputCls} placeholder="+243 ..." />
                </Field>
                <Field label="Email" required>
                  <input data-testid="apply-email" required type="email" value={f.email} onChange={upd('email')} className={inputCls} placeholder="vous@email.com" />
                </Field>
              </div>
              <Field label="Mot de passe (min 6 caractères)" required>
                <input data-testid="apply-password" required type="password" minLength={6} value={f.password} onChange={upd('password')} className={inputCls} placeholder="••••••••" />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Ville de résidence" required>
                  <input data-testid="apply-city" required value={f.city} onChange={upd('city')} className={inputCls} placeholder="Kinshasa" />
                </Field>
                <Field label="Âge" required>
                  <input data-testid="apply-age" required type="number" min="13" max="99" value={f.age} onChange={upd('age')} className={inputCls} placeholder="25" />
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4" data-testid="apply-step-2">
              <h2 className="text-xl font-display font-bold">Réseaux sociaux</h2>
              <Field label="Plateforme principale" required>
                <select data-testid="apply-platform" value={f.main_platform} onChange={upd('main_platform')} className={inputCls}>
                  {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Instagram" hint="Lien ou nom d'utilisateur">
                <div className="relative">
                  <Instagram className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input data-testid="apply-instagram" value={f.instagram} onChange={upd('instagram')} className={`${inputCls} pl-9`} placeholder="@username ou URL" />
                </div>
              </Field>
              <Field label="Facebook" hint="Lien ou nom d'utilisateur">
                <div className="relative">
                  <Facebook className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input data-testid="apply-facebook" value={f.facebook} onChange={upd('facebook')} className={`${inputCls} pl-9`} placeholder="Profil ou page" />
                </div>
              </Field>
              <Field label="TikTok" hint="Lien ou nom d'utilisateur">
                <div className="relative">
                  <Music2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input data-testid="apply-tiktok" value={f.tiktok} onChange={upd('tiktok')} className={`${inputCls} pl-9`} placeholder="@username ou URL" />
                </div>
              </Field>
              <Field label="Nombre approximatif d'abonnés cumulés" required>
                <input data-testid="apply-followers" required type="number" min="0" value={f.followers} onChange={upd('followers')} className={inputCls} placeholder="5000" />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4" data-testid="apply-step-3">
              <h2 className="text-xl font-display font-bold">Votre motivation</h2>
              <Field label="Pourquoi souhaitez-vous devenir ambassadeur VSM ?" required hint="Min 20 caractères">
                <textarea data-testid="apply-motivation" required value={f.motivation} onChange={upd('motivation')} rows={5} className={`${inputCls} resize-y`} placeholder="J'aime la marque parce que..." />
              </Field>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="prior" checked={f.prior_program} onChange={upd('prior_program')} data-testid="apply-prior-program" className="w-4 h-4" />
                <label htmlFor="prior" className="text-sm">J'ai déjà participé à un programme ambassadeur ou d'affiliation</label>
              </div>
              {f.prior_program && (
                <Field label="Précisez">
                  <textarea data-testid="apply-prior-details" value={f.prior_program_details} onChange={upd('prior_program_details')} rows={3} className={`${inputCls} resize-y`} placeholder="Nom du programme, durée, résultats..." />
                </Field>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4" data-testid="apply-step-4">
              <h2 className="text-xl font-display font-bold">Informations complémentaires</h2>
              <Field label="Comment comptez-vous promouvoir VSM Collection ?" required hint="Min 10 caractères">
                <textarea data-testid="apply-promo-plan" required value={f.promotion_plan} onChange={upd('promotion_plan')} rows={4} className={`${inputCls} resize-y`} placeholder="Réseaux sociaux, stories, vidéos..." />
              </Field>
              <Field label="Portée mensuelle estimée" required hint="Combien de personnes touchez-vous par mois">
                <input data-testid="apply-monthly-reach" required value={f.monthly_reach} onChange={upd('monthly_reach')} className={inputCls} placeholder="ex: 2000 personnes" />
              </Field>

              <div className="pt-2 border-t border-border space-y-3">
                <Checkbox testid="apply-accept-truth" checked={f.accept_truth} onChange={upd('accept_truth')}>
                  Je certifie que les informations fournies sont exactes.
                </Checkbox>
                <Checkbox testid="apply-accept-terms" checked={f.accept_terms} onChange={upd('accept_terms')}>
                  J'accepte les conditions du Programme Ambassadeur VSM Collection.
                </Checkbox>
                <Checkbox testid="apply-accept-contact" checked={f.accept_contact} onChange={upd('accept_contact')}>
                  J'accepte d'être contacté par VSM Collection concernant ma candidature.
                </Checkbox>
              </div>
            </div>
          )}

          {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-sm px-3 py-2" data-testid="apply-error">{error}</div>}

          <div className="flex justify-between pt-4 border-t border-border">
            <button type="button" disabled={step === 1} onClick={() => setStep((s) => s - 1)} data-testid="apply-prev-btn"
              className="px-5 py-2.5 rounded-sm border border-border text-sm hover:border-primary/60 disabled:opacity-30 disabled:hover:border-border">
              Précédent
            </button>
            {step < 4 ? (
              <button type="button" disabled={!stepValid(step)} onClick={() => setStep((s) => s + 1)} data-testid="apply-next-btn"
                className="px-5 py-2.5 rounded-sm bg-primary text-primary-foreground text-sm font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50">
                Suivant
              </button>
            ) : (
              <button type="submit" disabled={loading || !stepValid(4)} data-testid="apply-submit-btn"
                className="px-6 py-2.5 rounded-sm bg-primary text-primary-foreground text-sm font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Envoyer ma candidature
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = 'w-full bg-input border border-border rounded-sm px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition';

function Field({ label, hint, required, children }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}{required && <span className="text-primary"> *</span>}
        {hint && <span className="ml-2 normal-case tracking-normal text-[10px] text-muted-foreground/70">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function Checkbox({ testid, checked, onChange, children }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" data-testid={testid} checked={checked} onChange={onChange} className="w-4 h-4 mt-0.5 accent-primary" />
      <span className="text-sm text-foreground/90">{children}</span>
    </label>
  );
}
