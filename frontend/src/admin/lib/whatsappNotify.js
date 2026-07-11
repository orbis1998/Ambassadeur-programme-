import { ambassadorBadgeCode, getAmbassadorAppOrigin } from '@/lib/ambassador';

/** Extrait le prénom pour un message personnalisé. */
export function ambassadorFirstName(fullName) {
  const part = (fullName || '').trim().split(/\s+/)[0];
  return part || 'Ambassadeur';
}

/** Normalise un numéro mobile pour wa.me (priorité RDC +243). */
export function normalizeWhatsAppPhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  digits = digits.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('243') && digits.length >= 11) return digits;
  if (digits.startsWith('0') && digits.length >= 9) return `243${digits.slice(1)}`;
  if (digits.length === 9 && /^8|9/.test(digits)) return `243${digits}`;

  return digits.length >= 8 ? digits : null;
}

export function buildApprovalWhatsAppMessage({ fullName, badge, loginUrl }) {
  const firstName = ambassadorFirstName(fullName);
  const login = loginUrl || `${getAmbassadorAppOrigin()}/login`;

  return [
    `Bonjour ${firstName},`,
    '',
    'Félicitations — votre candidature au *Programme Ambassadeur VSM Collection* vient d\'être acceptée. Bienvenue dans l\'équipe.',
    '',
    'Voici votre identifiant officiel :',
    `*Badge : ${badge}*`,
    '',
    'Connectez-vous à votre espace ambassadeur avec ce badge (ou votre adresse email) et le mot de passe que vous avez défini lors de votre inscription :',
    login,
    '',
    'Si vous n\'avez pas encore reçu votre Kit Ambassadeur, rapprochez-vous de l\'équipe VSM pour le retirer et débloquer l\'ensemble des fonctionnalités du programme.',
    '',
    'À très bientôt,',
    'L\'équipe VSM Collection',
  ].join('\n');
}

export function buildApprovalWhatsAppUrl({ phone, fullName, userId, loginUrl }) {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return null;

  const badge = userId ? ambassadorBadgeCode(userId) : 'VSM-XXXX';
  const text = buildApprovalWhatsAppMessage({ fullName, badge, loginUrl });
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}
