import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    if (error) {
      setError(error.message || 'Identifiants incorrects.');
      setLoading(false);
      return;
    }
    setLoading(false);
    const dest = location.state?.from || '/dashboard';
    navigate(dest, { replace: true });
  };

  return (
    <div className="min-h-screen grain flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 animate-fade-up">
            <Link to="/" className="inline-block" data-testid="brand-home-link">
              <div className="font-display text-5xl font-bold tracking-tight">VSM<span className="text-primary">.</span></div>
              <div className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground mt-2">Ambassador Program</div>
            </Link>
          </div>

          <div className="vsm-card p-7 sm:p-8 animate-fade-up stagger-1" data-testid="login-card">
            <h1 className="text-2xl font-display font-bold mb-1">Connexion</h1>
            <p className="text-sm text-muted-foreground mb-6">Accédez à votre espace ambassadeur.</p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Email</label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  data-testid="login-email-input"
                  placeholder="vous@email.com"
                  className="w-full bg-input border border-border rounded-sm px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                    data-testid="login-password-input"
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
