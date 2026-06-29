import React from 'react';

export default function AdminPageHeader({ eyebrow = 'Administration', title, subtitle, actions }) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8 animate-fade-up">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-primary mb-2">{eyebrow}</div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function AdminStatCard({ icon: Icon, label, value, sub, highlight, testid }) {
  return (
    <div
      className={`vsm-card p-4 sm:p-5 animate-fade-up ${highlight ? 'border-primary/40 bg-primary/5' : ''}`}
      data-testid={testid}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-sm flex items-center justify-center ${highlight ? 'bg-primary/20' : 'bg-secondary'}`}>
          {Icon && <Icon className={`w-4 h-4 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />}
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="font-display text-2xl font-bold leading-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export function AdminStatusPill({ status }) {
  const s = (status || '').toString().toLowerCase();
  const map = {
    approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    pending: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
    rejected: 'bg-red-500/15 text-red-400 border-red-500/40',
    suspended: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
    inactive: 'bg-secondary text-muted-foreground border-border',
  };
  const cls = map[s] || 'bg-secondary text-muted-foreground border-border';
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border ${cls}`}>
      {status || '—'}
    </span>
  );
}

export function AdminEmpty({ children }) {
  return (
    <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-sm">
      {children}
    </div>
  );
}

export function AdminLoading() {
  return <div className="skeleton h-32 rounded-sm animate-fade-in" />;
}

export function AdminFilters({ children }) {
  return (
    <div className="vsm-card p-4 mb-6 flex flex-wrap gap-3 items-end animate-fade-up">
      {children}
    </div>
  );
}

export function AdminField({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs uppercase tracking-wider text-muted-foreground min-w-[140px]">
      {label}
      {children}
    </label>
  );
}

export function AdminSelect(props) {
  return (
    <select
      {...props}
      className="bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
    />
  );
}

export function AdminInput(props) {
  return (
    <input
      {...props}
      className="bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
    />
  );
}

export function AdminBtn({ variant = 'primary', className = '', ...props }) {
  const base = 'px-4 py-2 rounded-sm text-sm font-semibold uppercase tracking-wider transition disabled:opacity-50';
  const styles = variant === 'ghost'
    ? 'border border-border hover:border-primary/60 text-foreground'
    : variant === 'danger'
      ? 'bg-red-600/90 text-white hover:bg-red-600'
      : 'bg-primary text-primary-foreground hover:bg-primary/90';
  return <button type="button" className={`${base} ${styles} ${className}`} {...props} />;
}

export function AdminTableWrap({ children }) {
  return (
    <div className="vsm-card overflow-hidden animate-fade-up">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function AdminPagination({ page, total, pageSize, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
      <span>{total} résultat{total > 1 ? 's' : ''}</span>
      <div className="flex gap-2">
        <AdminBtn variant="ghost" disabled={page <= 0} onClick={() => onPage(page - 1)}>Préc.</AdminBtn>
        <span className="px-2 py-2">{page + 1} / {pages}</span>
        <AdminBtn variant="ghost" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>Suiv.</AdminBtn>
      </div>
    </div>
  );
}

export function ExportMenu({ onCsv, onPdf }) {
  return (
    <div className="flex gap-2">
      {onCsv && <AdminBtn variant="ghost" onClick={onCsv}>CSV / Excel</AdminBtn>}
      {onPdf && <AdminBtn variant="ghost" onClick={onPdf}>PDF</AdminBtn>}
    </div>
  );
}
