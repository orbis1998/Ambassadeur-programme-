/** États d'accès promotionnel ambassadeur (kit / code / lien). */

export const ACCESS_MESSAGES = {
  kit_pending: {
    title: 'Intégration en attente',
    body: 'Finalisez l\'obtention de votre Kit Ambassadeur (30 $) pour débloquer votre code promo et votre lien de parrainage.',
  },
  suspended: {
    title: 'Accès promotionnel suspendu',
    body: 'Votre code ou votre lien a été temporairement désactivé. Contactez le support VSM Collection.',
  },
  awaiting_code: {
    title: 'Kit validé',
    body: 'Votre Kit Ambassadeur est enregistré. Votre code personnel sera disponible très prochainement.',
  },
};

export function getPromoAccessState({ kitPaid, promoCodes, trackingLink }) {
  const promo = (promoCodes || [])[0] || null;
  const promoExists = Boolean(promo);
  const promoActive = promoExists && promo.active !== false;
  const linkExists = Boolean(trackingLink);
  const linkActive = linkExists && trackingLink.active !== false;

  if (!kitPaid) return 'kit_pending';
  if (promoExists && !promoActive) return 'suspended';
  if (linkExists && !linkActive) return 'suspended';
  if (!promoExists) return 'awaiting_code';
  return 'active';
}

export function canShowPromoCode({ kitPaid, promoCodes }) {
  const promo = (promoCodes || [])[0];
  return Boolean(kitPaid && promo && promo.active !== false);
}

export function canShowTrackingLink({ kitPaid, trackingLink }) {
  return Boolean(kitPaid && trackingLink && trackingLink.active !== false);
}

export function getLinkDisplayState({ kitPaid, trackingLink }) {
  if (!kitPaid) return 'kit_pending';
  if (trackingLink && trackingLink.active === false) return 'suspended';
  if (!trackingLink) return 'awaiting_code';
  return 'active';
}

export function getPromoDisplayState({ kitPaid, promoCodes }) {
  const promo = (promoCodes || [])[0];
  if (!kitPaid) return 'kit_pending';
  if (promo && promo.active === false) return 'suspended';
  if (!promo) return 'awaiting_code';
  return 'active';
}
