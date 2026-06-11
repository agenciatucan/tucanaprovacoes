'use client';

import { useRef, useState, type CSSProperties, type TouchEvent } from 'react';
import { Icon } from '@/components/ui/Icon';

interface SlideItem {
  id: string;
  file_url: string;
  file_name?: string;
}

interface Props {
  images: SlideItem[];
  caption?: string | null;
  clientName: string;
  clientLogoUrl?: string | null;
}

const SWIPE_THRESHOLD = 40;

function arrowStyle(side: 'left' | 'right'): CSSProperties {
  return {
    position: 'absolute',
    top: '50%',
    [side]: 8,
    transform: 'translateY(-50%)',
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.85)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
  };
}

export default function InstagramCarouselPreview({
  images,
  caption,
  clientName,
  clientLogoUrl,
}: Props) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);

  if (images.length === 0) return null;

  const total = images.length;
  const initial = clientName?.trim()?.charAt(0)?.toUpperCase() || 'C';
  const activeImage = images[current] ?? images[0];

  if (!activeImage) return null;

  function goTo(index: number) {
    setCurrent(Math.max(0, Math.min(total - 1, index)));
  }

  function handleTouchStart(e: TouchEvent) {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartX.current = touch.clientX;
  }

  function handleTouchEnd(e: TouchEvent) {
    if (touchStartX.current === null) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const delta = touch.clientX - touchStartX.current;

    if (delta > SWIPE_THRESHOLD) goTo(current - 1);
    else if (delta < -SWIPE_THRESHOLD) goTo(current + 1);

    touchStartX.current = null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="eyebrow" style={{ fontSize: 10 }}>
        Pré-visualização de como ficará no Instagram
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: 400,
          margin: '0 auto',
          background: '#fff',
          border: '1px solid var(--line)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              overflow: 'hidden',
              flexShrink: 0,
              background: 'var(--green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {clientLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clientLogoUrl}
                alt={clientName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{initial}</span>
            )}
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: '#262626' }}>{clientName}</div>

          <div style={{ marginLeft: 'auto', color: '#262626' }}>
            <Icon name="more" size={18} />
          </div>
        </div>

        {/* Media */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1080 / 1350',
            background: '#000',
            overflow: 'hidden',
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeImage.file_url}
            alt={`Slide ${current + 1} de ${total}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />

          {total > 1 && (
            <>
              {current > 0 && (
                <button
                  type="button"
                  onClick={() => goTo(current - 1)}
                  aria-label="Slide anterior"
                  style={arrowStyle('left')}
                >
                  <Icon name="arrow-left" size={14} color="#262626" />
                </button>
              )}

              {current < total - 1 && (
                <button
                  type="button"
                  onClick={() => goTo(current + 1)}
                  aria-label="Próximo slide"
                  style={arrowStyle('right')}
                >
                  <Icon name="arrow" size={14} color="#262626" />
                </button>
              )}

              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  background: 'rgba(0,0,0,0.55)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                }}
              >
                {current + 1}/{total}
              </div>

              <div
                style={{
                  position: 'absolute',
                  bottom: 10,
                  left: 0,
                  right: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                {images.map((img, i) => (
                  <span
                    key={img.id}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: i === current ? '#3897f0' : 'rgba(255,255,255,0.6)',
                      transition: 'background .15s',
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Action bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 12px' }}>
          <Icon name="heart" size={22} color="#262626" />
          <Icon name="message-circle" size={22} color="#262626" />
          <Icon name="send" size={20} color="#262626" />
          <div style={{ marginLeft: 'auto' }}>
            <Icon name="bookmark" size={20} color="#262626" />
          </div>
        </div>

        {/* Caption */}
        {caption && (
          <div style={{ padding: '0 12px 12px', fontSize: 13, lineHeight: 1.5, color: '#262626' }}>
            <strong>{clientName}</strong>{' '}
            <span style={{ whiteSpace: 'pre-wrap' }}>{caption}</span>
          </div>
        )}
      </div>
    </div>
  );
}
