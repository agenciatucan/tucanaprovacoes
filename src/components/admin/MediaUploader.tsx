'use client';
import { useState, useRef, useTransition } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { createSignedUploadUrl, saveFileRecord, deleteFile, toggleFileVisibility } from '@/actions/files';
import { toast } from 'sonner';

type FileRecord = {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size_bytes: number;
  visible_to_client: boolean;
};

interface Props {
  contentItemId: string;
  campaignId: string;
  clientId: string;
  initialFiles: FileRecord[];
}

// MIME types explicitamente permitidos — bloqueia SVG (XSS), executáveis, etc.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
]);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

function inferFileType(mime: string): 'imagem' | 'video' | 'pdf' | 'roteiro' | 'referencia' {
  if (mime.startsWith('image/')) return 'imagem';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('text/') || mime.includes('word')) return 'roteiro';
  return 'referencia';
}

function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return `Tipo de arquivo não permitido: ${file.type || 'desconhecido'}. Use imagens (JPG, PNG, WebP), vídeos (MP4, WebM), PDF ou documentos Word.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `"${file.name}" excede o limite de 50 MB.`;
  }
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Thumbnail / Preview de arquivo ───────────────────────────

function FilePreview({ file }: { file: FileRecord }) {
  const isImage = file.file_type === 'imagem';
  const isVideo = file.file_type === 'video';
  const isPdf   = file.file_type === 'pdf';

  if (isImage) {
    return (
      <img
        src={file.file_url}
        alt={file.file_name}
        style={{
          width: '100%', height: 130,
          objectFit: 'cover',
          borderRadius: '8px 8px 0 0',
          display: 'block',
          background: 'var(--bg-2)',
        }}
      />
    );
  }

  // Ícone para vídeo, PDF, roteiro, referência
  const { bg, icon } = isVideo
    ? { bg: '#1e1b4b', icon: VideoIcon }
    : isPdf
    ? { bg: '#7f1d1d', icon: PdfIcon }
    : file.file_type === 'roteiro'
    ? { bg: '#1c3d5a', icon: ScriptIcon }
    : { bg: '#1f2937', icon: AttachIcon };

  const IconCmp = icon;

  return (
    <div style={{
      width: '100%', height: 90,
      background: bg,
      borderRadius: '8px 8px 0 0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <IconCmp />
    </div>
  );
}

function VideoIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  );
}
function PdfIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}
function ScriptIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/>
      <line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/>
    </svg>
  );
}
function AttachIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
    </svg>
  );
}

// ── Componente principal ──────────────────────────────────────

export default function MediaUploader({ contentItemId, campaignId, clientId, initialFiles }: Props) {
  const [files, setFiles] = useState<FileRecord[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(selected: FileList) {
    if (selected.length === 0) return;
    setUploading(true);

    const supabase = getSupabaseBrowserClient();

    for (const file of Array.from(selected)) {
      const validationError = validateFile(file);
      if (validationError) {
        toast.error(validationError);
        continue;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${contentItemId}/${crypto.randomUUID()}-${safeName}`;

      // ── ETAPA 1a: Obter URL assinada via servidor ────────────
      const urlResult = await createSignedUploadUrl(storagePath);
      if (!urlResult.success) {
        toast.error(`Erro ao preparar upload de "${file.name}": ${urlResult.error}`);
        continue;
      }

      // ── ETAPA 1b: Upload para o Storage via URL assinada ─────
      const { error: uploadErr } = await supabase.storage
        .from('campaign-files')
        .uploadToSignedUrl(storagePath, urlResult.data.token, file, {
          cacheControl: '31536000',
        });

      if (uploadErr) {
        toast.error(`Erro no upload de "${file.name}": ${uploadErr.message}`);
        continue;
      }

      // ── ETAPA 2: Salvar registro no banco ────────────────────
      const { data: { publicUrl } } = supabase.storage
        .from('campaign-files')
        .getPublicUrl(storagePath);

      const result = await saveFileRecord({
        content_item_id: contentItemId,
        campaign_id: campaignId,
        client_id: clientId,
        file_name: file.name,
        file_url: publicUrl,
        storage_path: storagePath,
        file_type: inferFileType(file.type),
        file_size_bytes: file.size,
        visible_to_client: true,
      });

      if (result.success) {
        setFiles((prev) => [
          ...prev,
          {
            id: result.data.id,
            file_name: file.name,
            file_url: publicUrl,
            file_type: inferFileType(file.type),
            file_size_bytes: file.size,
            visible_to_client: true,
          },
        ]);
        toast.success(`${file.name} enviado!`);
      } else {
        toast.error(`Arquivo enviado mas erro ao registrar: ${result.error}`);
        await supabase.storage.from('campaign-files').remove([storagePath]);
      }
    }

    if (inputRef.current) inputRef.current.value = '';
    setUploading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  }

  function handleDelete(fileId: string) {
    if (!window.confirm('Remover este arquivo permanentemente?')) return;
    startTransition(async () => {
      const result = await deleteFile(fileId, contentItemId);
      if (result.success) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        toast.success('Arquivo removido');
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleToggleVisibility(fileId: string, currentVisible: boolean) {
    startTransition(async () => {
      const result = await toggleFileVisibility(fileId, contentItemId, !currentVisible);
      if (result.success) {
        setFiles((prev) =>
          prev.map((f) => f.id === fileId ? { ...f, visible_to_client: !currentVisible } : f)
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  const isDisabled = uploading || isPending;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Grade de arquivos ── */}
      {files.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
        }}>
          {files.map((f) => (
            <div
              key={f.id}
              style={{
                borderRadius: 10,
                border: '1px solid var(--line-soft)',
                background: 'var(--bg)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Thumbnail / Preview */}
              <a href={f.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', flexShrink: 0 }}>
                <FilePreview file={f} />
              </a>

              {/* Info + ações */}
              <div style={{ padding: '8px 9px 9px', flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {/* Nome do arquivo */}
                <a
                  href={f.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={f.file_name}
                  style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--ink)',
                    textDecoration: 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    display: 'block',
                  }}
                >
                  {f.file_name}
                </a>

                {/* Tamanho */}
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {formatBytes(f.file_size_bytes)}
                </div>

                {/* Botões de ação */}
                <div style={{ display: 'flex', gap: 5, marginTop: 3 }}>
                  {/* Toggle visibilidade */}
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(f.id, f.visible_to_client)}
                    disabled={isDisabled}
                    title={f.visible_to_client ? 'Visível ao cliente — clique para ocultar' : 'Oculto ao cliente — clique para tornar visível'}
                    style={{
                      flex: 1, height: 24, borderRadius: 6, fontSize: 10, fontWeight: 600,
                      border: f.visible_to_client ? '1px solid var(--green-100)' : '1px solid var(--line)',
                      background: f.visible_to_client ? 'var(--green-50)' : 'var(--bg-2)',
                      color: f.visible_to_client ? 'var(--green)' : 'var(--muted)',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      transition: 'all .15s', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                    }}
                  >
                    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      {f.visible_to_client
                        ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                        : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      }
                    </svg>
                    {f.visible_to_client ? 'Visível' : 'Oculto'}
                  </button>

                  {/* Remover */}
                  <button
                    type="button"
                    onClick={() => handleDelete(f.id)}
                    disabled={isDisabled}
                    title="Remover arquivo"
                    style={{
                      width: 24, height: 24, borderRadius: 6,
                      border: 'none', background: 'transparent',
                      color: 'var(--muted)', fontSize: 16, lineHeight: 1,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'color .15s, background .15s', flexShrink: 0,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#b91c1c'; (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Drop zone ── */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !isDisabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && !isDisabled && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--green)' : 'var(--line)'}`,
          borderRadius: 'var(--r)',
          padding: '16px',
          textAlign: 'center',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.6 : 1,
          background: dragOver ? 'var(--green-50)' : 'transparent',
          transition: 'border-color .15s, background .15s',
          userSelect: 'none',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf,application/zip,text/*"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={isDisabled}
        />

        {uploading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <span className="muted tiny">Enviando arquivos…</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            <span className="muted tiny">
              {files.length > 0 ? 'Adicionar mais arquivos' : 'Arraste ou clique para adicionar'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
