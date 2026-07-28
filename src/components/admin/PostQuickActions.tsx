'use client';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/Icon';

interface Props {
  caption: string | null;
  fileUrls: string[];
}

function extensionFromUrl(url: string): string {
  const clean = url.split('?')[0] ?? url;
  const match = clean.match(/\.[a-zA-Z0-9]+$/);
  return match ? match[0] : '';
}

export default function PostQuickActions({ caption, fileUrls }: Props) {
  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!caption) return;

    try {
      await navigator.clipboard.writeText(caption);
      toast.success('Legenda copiada!');
    } catch {
      toast.error('Erro ao copiar legenda');
    }
  }

  function handleDownload(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (fileUrls.length === 0) return;

    // Dispara os downloads com um pequeno intervalo entre eles — clicar em
    // vários <a download> ao mesmo tempo faz o navegador bloquear os extras.
    fileUrls.forEach((url, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `imagem-${i + 1}${extensionFromUrl(url)}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, i * 350);
    });

    toast.success(
      fileUrls.length > 1 ? `Baixando ${fileUrls.length} imagens…` : 'Baixando imagem…'
    );
  }

  if (!caption && fileUrls.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
      <style>{`
        .pq-action-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
          height: 30px; border-radius: 999px; border: 1px solid transparent;
          font-size: 11px; font-weight: 700; font-family: inherit; letter-spacing: 0.01em;
          cursor: pointer; text-decoration: none; white-space: nowrap;
          transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
        }
        .pq-action-btn:active { transform: scale(0.96); }
        .pq-action-copy {
          background: var(--bg); border-color: var(--line); color: var(--ink-2);
        }
        .pq-action-copy:hover { background: #fff; border-color: rgba(37,65,30,.28); box-shadow: 0 4px 10px rgba(0,0,0,.06); }
        .pq-action-download {
          background: #fff7ed; border-color: #fed7aa; color: #c2410c;
        }
        .pq-action-download:hover { background: #ffedd5; box-shadow: 0 4px 10px rgba(194,65,12,.12); }
        .pq-action-icon-dot {
          display: flex; align-items: center; justify-content: center;
          width: 15px; height: 15px; border-radius: 50%; flex-shrink: 0;
        }
      `}</style>

      {caption && (
        <button type="button" onClick={handleCopy} className="pq-action-btn pq-action-copy">
          <Icon name="copy" size={11} />
          Copiar legenda
        </button>
      )}

      {fileUrls.length > 0 && (
        <button type="button" onClick={handleDownload} className="pq-action-btn pq-action-download">
          <Icon name="download" size={11} />
          {fileUrls.length > 1 ? `Baixar (${fileUrls.length})` : 'Baixar imagem'}
        </button>
      )}
    </div>
  );
}
