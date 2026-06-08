/* eslint-disable react/no-unescaped-entities */
import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, Save, MessageCircle, Send } from 'lucide-react';

const SUPPORT_WHATSAPP = '243812585022'; // VSM admin phone (sans +)

export default function Settings() {
  const { user, profile, refresh, signOut } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    setMsg(''); setErr(''); setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: fullName, phone,
    }).eq('id', user.id);
    setSaving(false);
    if (error) setErr(error.message);
    else { setMsg('Profil mis à jour.'); refresh(); }
  };

  const changePwd = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    if (pwd.length < 6) { setErr('Mot de passe trop court (min 6).'); return; }
    if (pwd !== pwd2) { setErr('Les mots de passe ne correspondent pas.'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSaving(false);
    if (error) setErr(error.message);
    else { setMsg('Mot de passe modifié.'); setPwd(''); setPwd2(''); }
  };

  const logout = async () => { await signOut(); navigate('/login', { replace: true }); };

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-3xl mx-auto animate-fade-in" data-testid="settings-page">
      <header className="mb-6 animate-fade-up">
        <div className="text-xs uppercase tracking-[0.3em] text-primary mb-2">Paramètres</div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold">Mon compte</h1>
      </header>

      {(msg || err) && (
        <div className={`mb-4 px-4 py-2 rounded-sm text-sm ${err ? 'bg-destructive/15 text-destructive border border-destructive/40' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40'}`}
          data-testid="settings-feedback">
          {err || msg}
        </div>
      )}

      <section className="vsm-card p-5 sm:p-6 mb-5">
        <h2 className="font-display text-xl font-bold mb-4">Modifier mon profil</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <Field label="Nom complet">
            <input data-testid="settings-fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Numéro de téléphone">
            <input data-testid="settings-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+243 ..." />
          </Field>
          <Field label="Email">
            <input value={profile?.email || ''} disabled className={`${inputCls} opacity-60 cursor-not-allowed`} />
          </Field>
          <button type="submit" disabled={saving} data-testid="settings-save-profile-btn"
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-sm text-sm font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
          </button>
        </form>
      </section>

      <section className="vsm-card p-5 sm:p-6 mb-5">
        <h2 className="font-display text-xl font-bold mb-4">Modifier mon mot de passe</h2>
        <form onSubmit={changePwd} className="space-y-4">
          <Field label="Nouveau mot de passe">
            <input data-testid="settings-new-pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className={inputCls} placeholder="••••••••" />
          </Field>
          <Field label="Confirmer">
            <input data-testid="settings-confirm-pwd" type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} className={inputCls} placeholder="••••••••" />
          </Field>
          <button type="submit" disabled={saving} data-testid="settings-change-pwd-btn"
            className="px-5 py-2.5 border border-border rounded-sm text-sm font-semibold uppercase tracking-wider hover:border-primary/60 disabled:opacity-50">
            Changer le mot de passe
          </button>
        </form>
      </section>

      <section className="vsm-card p-5 sm:p-6 mb-5">
        <h2 className="font-display text-xl font-bold mb-3">Support</h2>
        <p className="text-sm text-muted-foreground mb-4">Besoin d'aide ? Contactez l'équipe VSM Collection.</p>
        <div className="flex flex-wrap gap-2">
          <a href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Bonjour, je suis ambassadeur VSM. J\'ai besoin d\'aide.')}`}
            target="_blank" rel="noopener noreferrer" data-testid="support-whatsapp-btn"
            className="px-4 py-2 rounded-sm border border-border text-sm hover:border-primary/60 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-400" /> WhatsApp Support
          </a>
          <a href="mailto:support@vsmcollection.com" data-testid="support-email-btn"
            className="px-4 py-2 rounded-sm border border-border text-sm hover:border-primary/60 flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" /> Envoyer un message
          </a>
        </div>
      </section>

      <section className="vsm-card p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold mb-3">Session</h2>
        <button onClick={logout} data-testid="settings-logout-btn"
          className="px-5 py-2.5 border border-destructive/40 text-destructive rounded-sm text-sm font-semibold uppercase tracking-wider hover:bg-destructive/10">
          Déconnexion
        </button>
      </section>
    </div>
  );
}

const inputCls = 'w-full bg-input border border-border rounded-sm px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}
