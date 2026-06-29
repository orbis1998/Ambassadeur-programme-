import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { ChevronDown } from 'lucide-react';

export function Icon({ name, className = 'w-5 h-5' }) {
  const C = LucideIcons[name];
  if (!C) return null;
  return <C className={className} aria-hidden="true" />;
}

export function FadeIn({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedCounter({ value, suffix = '', prefix = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    const target = Number(value) || 0;
    const duration = 1400;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{display.toLocaleString('fr-FR')}{suffix}
    </span>
  );
}

export function SectionEyebrow({ children }) {
  return (
    <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3">{children}</p>
  );
}

export function SectionTitle({ children, as: Tag = 'h2', id }) {
  return (
    <Tag id={id} className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold uppercase tracking-tight text-balance">
      {children}
    </Tag>
  );
}

export function PrimaryBtn({ to, children, className = '' }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold uppercase tracking-wider text-sm px-6 py-3 rounded-sm transition focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-black shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] ${className}`}
    >
      {children}
    </Link>
  );
}

export function SecondaryBtn({ to, children, className = '' }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-2 border border-border hover:border-primary/60 text-foreground font-semibold uppercase tracking-wider text-sm px-6 py-3 rounded-sm transition focus:outline-none focus:ring-2 focus:ring-primary/30 ${className}`}
    >
      {children}
    </Link>
  );
}

export function CtaBand({ title, subtitle, primaryLabel = 'Devenir Ambassadeur', compact = false }) {
  return (
    <div className={`vsm-card border-primary/20 bg-gradient-to-r from-primary/10 via-black to-black text-center ${compact ? 'p-5 sm:p-6' : 'p-8 sm:p-10'}`}>
      <h3 className="font-display text-lg sm:text-xl md:text-2xl font-bold uppercase mb-2 text-balance">{title}</h3>
      {subtitle && <p className="text-muted-foreground text-sm sm:text-base mb-6 max-w-lg mx-auto text-balance">{subtitle}</p>}
      <PrimaryBtn to="/apply" className="w-full sm:w-auto !px-8 !py-3.5">{primaryLabel}</PrimaryBtn>
    </div>
  );
}

export function FaqItem({ q, a, id }) {
  const [open, setOpen] = useState(false);
  const panelId = `faq-panel-${id}`;
  return (
    <div className="vsm-card border-border/80">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-4 p-5 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/40"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-display text-sm sm:text-base font-semibold uppercase tracking-wide">{q}</span>
        <ChevronDown className={`w-5 h-5 shrink-0 text-primary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div id={panelId} role="region" hidden={!open} className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
        {a}
      </div>
    </div>
  );
}

export function BrowserFrame({ title, children, className = '' }) {
  return (
    <div className={`vsm-card overflow-hidden shadow-2xl shadow-primary/5 max-w-full min-w-0 ${className}`}>
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-border bg-secondary/80 min-w-0">
        <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-destructive/80 shrink-0" />
        <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-chart-2/80 shrink-0" />
        <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-chart-3/80 shrink-0" />
        <span className="ml-2 sm:ml-3 text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground truncate min-w-0">{title}</span>
      </div>
      <div className="p-3 sm:p-4 md:p-5 bg-black/90 overflow-x-auto">{children}</div>
    </div>
  );
}
