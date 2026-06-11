'use client';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import InstagramCarouselPreview from '@/components/aprovacao/InstagramCarouselPreview';

interface FileItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size_bytes: number | null;
}

interface Props {
  files: FileItem[];
  postTitle: string;
  postFormat: string;
  format?: string | null;
  caption?: string | null;
  clientName?: string | null;
  clientLogoUrl?: string | null;
}

const MEDIA_TYPES = ['imagem', 'video', 'capa'];

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaGallery({
  files,
  postTitle,
  postFormat,
  format,
  caption,
  clientName,
  clientLogoUrl,
}: Props) {
  const mediaFiles = files.filter((f) => MEDIA_TYPES.includes(f.file_type));
  const otherFiles = files.filter((f) => !MEDIA_TYPES.includes(f.file_type));
  const [current, setCurrent] = useState(0);

  const noFiles = files.length === 0;
  const currentFile = mediaFiles[current];

  const carouselImages = mediaFiles.filter((f) => f.file_type !== 'video');

  if (format === 'carrossel' && carouselImages.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <InstagramCarouselPreview
          images={carouselImages}
          caption={caption}
          clientName={clientName || postTitle}
          clientLogoUrl={clientLogoUrl}
        />

        {otherFiles.length > 0 && (
          <div>
            <div className="eyebrow" style={{ fontSize: 10, marginBottom: 8 }}>Arquivos adicionais</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {otherFiles.map((f) => (
                <a
                  key={f.id}
                  href={f.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="chip chip-outline"
                  style={{ textDecoration: 'none', color: 'var(--ink-2)' }}>
                  <Icon name="file" size={12} />
                  {f.file_name}
                  {f.file_size_bytes ? ` · ${formatBytes(f.file_size_bytes)}` : ''}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Main media viewer */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)',
        padding: mediaFiles.length > 0 ? 24 : 32,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      }}>
        {noFiles ? (
          /* Placeholder — no files uploaded yet */
          <div style={{ width: '100%', maxWidth: 480, aspectRatio: '1 / 1', maxHeight: 360, borderRadius: 16, background: '#e8f0e5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(37,65,30,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="image" size={22} color="var(--green)" stroke={1.5} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)', lineHeight: 1.4, textAlign: 'center' }}>
              "{postTitle}"
            </div>
            <div style={{ position: 'absolute', /* relative inside wrapper */ bottom: 0 }} />
          </div>
        ) : currentFile?.file_type === 'video' ? (
          /* Video player */
          <div style={{ width: '100%', maxWidth: 480 }}>
            <video
              src={currentFile.file_url}
              controls
              style={{ width: '100%', borderRadius: 14, background: '#000', display: 'block' }}
            />
          </div>
        ) : (
          /* Image */
          <div style={{ width: '100%', maxWidth: 480, position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentFile?.file_url}
              alt={currentFile?.file_name ?? postTitle}
              style={{ width: '100%', borderRadius: 14, display: 'block', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Navigation arrows (only when multiple media files) */}
        {mediaFiles.length > 1 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => setCurrent((p) => Math.max(0, p - 1))}
              disabled={current === 0}
              className="btn-icon"
              style={{ opacity: current === 0 ? 0.4 : 1 }}>
              <Icon name="arrow-left" size={16} />
            </button>
            <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, minWidth: 56, textAlign: 'center' }}>
              {current + 1} / {mediaFiles.length}
            </span>
            <button
              onClick={() => setCurrent((p) => Math.min(mediaFiles.length - 1, p + 1))}
              disabled={current === mediaFiles.length - 1}
              className="btn-icon"
              style={{ opacity: current === mediaFiles.length - 1 ? 0.4 : 1 }}>
              <Icon name="arrow" size={16} />
            </button>
          </div>
        )}

        {/* Thumbnail strip (when 3+ files) */}
        {mediaFiles.length >= 3 && (
          <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 480 }}>
            {mediaFiles.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setCurrent(i)}
                style={{
                  flex: 1, height: 56, borderRadius: 10, overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer',
                  outline: i === current ? '2px solid var(--green)' : '2px solid transparent',
                  transition: 'outline .15s',
                  background: '#000',
                }}>
                {f.file_type === 'video' ? (
                  <div style={{ width: '100%', height: '100%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="more" size={14} color="#fff" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.file_url} alt={f.file_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Download button (current file) */}
      {mediaFiles.length > 0 && currentFile && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href={currentFile.file_url} download target="_blank" rel="noreferrer" className="chip chip-outline" style={{ textDecoration: 'none', color: 'var(--ink-2)' }}>
            <Icon name="download" size={11} /> Baixar
          </a>
        </div>
      )}

      {/* Other downloadable files */}
      {otherFiles.length > 0 && (
        <div>
          <div className="eyebrow" style={{ fontSize: 10, marginBottom: 8 }}>Arquivos adicionais</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {otherFiles.map((f) => (
              <a
                key={f.id}
                href={f.file_url}
                target="_blank"
                rel="noreferrer"
                className="chip chip-outline"
                style={{ textDecoration: 'none', color: 'var(--ink-2)' }}>
                <Icon name="file" size={12} />
                {f.file_name}
                {f.file_size_bytes ? ` · ${formatBytes(f.file_size_bytes)}` : ''}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
