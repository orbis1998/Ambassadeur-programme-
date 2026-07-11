import React from 'react';
import { ImageIcon, PlayCircle } from 'lucide-react';
import { useLandingMedia, getSlotMedia, slotHasMedia } from './useLandingMedia';

/**
 * Affiche une image/vidéo uploadée par l'admin, ou un placeholder guidé (titre + légende).
 */
export default function LandingMediaSlot({
  slotKey,
  className = '',
  aspect = 'video',
  framed = true,
  showCaption = false,
}) {
  const { mediaBySlot } = useLandingMedia();
  const slot = getSlotMedia(mediaBySlot, slotKey);
  const hasMedia = slotHasMedia(slot);

  const aspectClass = aspect === 'square' ? 'aspect-square'
    : aspect === 'portrait' ? 'aspect-[3/4]'
      : aspect === 'wide' ? 'aspect-[21/9]'
        : 'aspect-video';

  const frameClass = framed ? 'vsm-card border-border overflow-hidden' : '';

  if (hasMedia) {
    const isVideo = slot.media_type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(slot.media_url);
    return (
      <figure className={`${frameClass} ${className}`}>
        {isVideo ? (
          <video
            src={slot.media_url}
            controls
            playsInline
            className={`w-full ${aspectClass} object-cover bg-black`}
            preload="metadata"
          />
        ) : (
          <img
            src={slot.media_url}
            alt={slot.title || ''}
            className={`w-full ${aspectClass} object-cover object-top bg-secondary/30`}
            loading="lazy"
          />
        )}
        {showCaption && slot.caption && (
          <figcaption className="px-4 py-2 text-xs text-muted-foreground border-t border-border">{slot.caption}</figcaption>
        )}
      </figure>
    );
  }

  return (
    <div
      className={`${frameClass} ${aspectClass} flex items-center justify-center border border-dashed border-border/60 bg-secondary/10 ${className}`}
      data-landing-slot={slotKey}
      aria-hidden="true"
    >
      {slot?.media_type === 'video' ? (
        <PlayCircle className="w-8 h-8 text-muted-foreground/30" />
      ) : (
        <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
      )}
    </div>
  );
}
