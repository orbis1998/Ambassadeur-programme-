import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { globalSearch } from '@/admin/lib/adminApi';
import { AdminInput, AdminBtn } from '@/admin/components/AdminUi';

export default function AdminGlobalSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const run = useCallback(async (query) => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    const res = await globalSearch(query);
    setResults(res);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => run(q), 300);
    return () => clearTimeout(t);
  }, [q, run]);

  return (
    <div className="relative w-full max-w-md lg:max-w-lg">
      <div className="flex items-center gap-2 bg-input border border-border rounded-sm px-3 py-2 w-full min-w-0">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <AdminInput
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher…"
          className="border-0 bg-transparent p-0 focus:ring-0 flex-1"
        />
        {q && (
          <button type="button" onClick={() => { setQ(''); setResults(null); }} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && results && q.length >= 2 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 left-0 right-0 sm:left-auto sm:right-0 z-50 w-full sm:w-[420px] max-w-[calc(100vw-2rem)] vsm-card p-3 shadow-xl animate-fade-in">
            {!(results.ambassadors.length || results.orders.length || results.withdrawals.length) ? (
              <p className="text-sm text-muted-foreground p-2">Aucun résultat</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {results.ambassadors.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Ambassadeurs</div>
                    {results.ambassadors.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="w-full text-left px-2 py-2 rounded-sm hover:bg-secondary/60 text-sm"
                        onClick={() => { navigate(`/admin/ambassadors/${a.user_id}`); setOpen(false); }}
                      >
                        <div className="font-medium">{a.full_name}</div>
                        <div className="text-xs text-muted-foreground">{a.email}</div>
                      </button>
                    ))}
                  </div>
                )}
                {results.orders.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Commandes</div>
                    {results.orders.map((o) => (
                      <div key={o.id} className="px-2 py-2 text-sm">
                        #{o.id} — {o.customer_name || 'Client'} — {o.status}
                      </div>
                    ))}
                  </div>
                )}
                {results.withdrawals.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Retraits</div>
                    {results.withdrawals.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        className="w-full text-left px-2 py-2 rounded-sm hover:bg-secondary/60 text-sm"
                        onClick={() => { navigate('/admin/withdrawals'); setOpen(false); }}
                      >
                        {w.beneficiary_name} — {w.msisdn} — {w.status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
