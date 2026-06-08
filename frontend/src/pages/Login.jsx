import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Eye, EyeOff, Loader2, ArrowRight, User } from 'lucide-react';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resolveEmail = async (raw) => {
    const v = raw.trim();
    if (v.includes('@')) return v.toLowerCase();
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
    const r = await fetch(`${BACKEND_URL}/api/auth/resolve-identifier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: v }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.detail || 'Identifiant introuvable');
    }
    const { email } = await r.json();
    return email;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const email = await resolveEmail(identifier);
      const { error } = await signIn(email, password);
      if (error) {
        setError('Identifiants incorrects.');
        setLoading(false);
        return;
      }
      setLoading(false);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Identifiants incorrects.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grain flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 animate-fade-up">
            <Link to="/" data-testid="brand-home-link" className="inline-block">
              <img src="/icons/logo.png" alt="VSM Ambassador Program" data-testid="login-logo" className="w-44 mx-auto" />
            </Link>
          </div>

          <div className="vsm-card p-7 sm:p-8 animate-fade-up stagger-1" data-testid="login-card">
            <h1 className="text-2xl font-display font-bold mb-1">Connexion ambassadeur</h1>
            <p className="text-sm text-muted-foreground mb-6">Accédez à votre espace VSM.</p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                  Email, téléphone ou badge VSM
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                    data-testid="login-identifier-input"
                    placeholder="vous@email.com / +243... / VSM-XXXX"
                    autoComplete="username"
                    className="w-full bg-input border border-border rounded-sm pl-9 pr-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                    data-testid="login-password-input"
                    autoComplete="current-password"
                    className="w-full bg-input border border-border rounded-sm px-3 py-2.5 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                  <button type="button" onClick={() => setShowPwd((s) => !s)} data-testid="toggle-password-visibility"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-sm px-3 py-2" data-testid="login-error">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} data-testid="login-submit-btn"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold uppercase tracking-wider text-sm px-5 py-3 rounded-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Se connecter <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <div className="vsm-divider my-6" />

            <p className="text-sm text-muted-foreground text-center">
              Pas encore ambassadeur ?{' '}
              <Link to="/apply" data-testid="go-to-apply-link" className="text-primary hover:underline font-semibold">
                Postulez maintenant
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © VSM Collection — Vivre avec style.
          </p>
        </div>
      </div>
    </div>
  );
}
