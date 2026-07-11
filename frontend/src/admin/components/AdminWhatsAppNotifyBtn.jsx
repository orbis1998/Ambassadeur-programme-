import React from 'react';
import { MessageCircle } from 'lucide-react';
import { buildApprovalWhatsAppUrl } from '@/admin/lib/whatsappNotify';
import { logAudit } from '@/admin/lib/adminApi';

/**
 * Ouvre WhatsApp avec un message d'accueil pré-rempli (candidature approuvée).
 * Visible uniquement si un numéro valide est disponible.
 */
export default function AdminWhatsAppNotifyBtn({
  phone,
  fullName,
  userId,
  loginUrl,
  entityType = 'application',
  entityId,
  compact = false,
  className = '',
}) {
  const url = buildApprovalWhatsAppUrl({ phone, fullName, userId, loginUrl });
  if (!url) return null;

  const handleClick = () => {
    if (entityId != null) {
      logAudit('whatsapp_notify', entityType, entityId, { phone, userId });
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        title="Notifier l'ambassadeur sur WhatsApp"
        data-testid="whatsapp-notify-btn"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-semibold uppercase tracking-wider border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition ${className}`}
      >
        <MessageCircle className="w-3 h-3" />
        WhatsApp
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="whatsapp-notify-btn"
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold uppercase tracking-wider border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition ${className}`}
    >
      <MessageCircle className="w-4 h-4" />
      Notifier l&apos;ambassadeur
    </button>
  );
}
