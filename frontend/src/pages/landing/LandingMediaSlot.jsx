import React from 'react';
import { ImageIcon, PlayCircle } from 'lucide-react';
import { PhoneFrame } from './LandingUi';
import { useLandingMedia, getSlotMedia, slotHasMedia } from './useLandingMedia';

/**
 * Affiche une image/vidéo uploadée par l'admin, ou un placeholder discret.
 */
export default function LandingMediaSlot({
  slotKey,
  className = '',
  aspect = 'video',
  framed = true,
  phoneFrame = false,
  showCaption = false,
}) {
  const { mediaBySlot } = useLandingMedia();
  const slot = getSlotMedia(mediaBySlot, slotKey);
  const hasMedia = slotHasMedia(slot);

  const aspectClass = aspect === 'phone' ? 'aspect-[9/19]'
    : aspect === 'square' ? 'aspect-square'
      : aspect === 'portrait' ? 'aspect-[3/4]'
        : aspect === 'wide' ? 'aspect-[21/9]'
          : aspect === 'hero' ? 'aspect-[16/10] sm:aspect-[16/9]'
            : 'aspect-video';

  const frameClass = framed && !phoneFrame ? 'vsm-card border-border overflow-hidden' : '';

  const renderMedia = () => {
    if (!hasMedia) {
      return (
        <div
          className={`${frameClass} ${aspectClass} flex items-center justify-center border border-dashed border-border/60 bg-secondary/10 ${phoneFrame ? '' : className}`}
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

    const isVideo = slot.media_type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(slot.media_url);
    const mediaEl = isVideo ? (
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
    );

    return (
      <figure className={`${frameClass} ${phoneFrame ? '' : className}`}>
        {mediaEl}
        {showCaption && slot.caption && (
          <figcaption className="px-4 py-2 text-xs text-muted-foreground border-t border-border">{slot.caption}</figcaption>
        )}
      </figure>
    );
  };

  const content = renderMedia();

  if (phoneFrame) {
    return <PhoneFrame className={className}>{content}</PhoneFrame>;
  }

  return content;
}
