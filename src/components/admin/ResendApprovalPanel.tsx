'use client';
import { useState } from 'react';
import { resendForApproval } from '@/actions/content-items';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

const FIELD_LABEL: Record<string, string> = {
  tema:    'Tema',
  legenda: 'Legenda',
  arte:    'Arte',
};

const ADJUST_STATUSES = ['ajuste_solicitado', 'substituir_tema'];

interface Props {
  postId: string;
  themeStatus: string;
  captionStatus: string;
  artworkStatus: string;
  comments: {
    id: string;
    message: string;
    created_at: string;
    user_profiles: { name: string } | { name: string }[] | null;
  }[];
}

export default function ResendApprovalPanel({
  postId,
  themeStatus,
  captionStatus,
  artworkStatus,
  comments,
}: Props) {
  const [loading, setLoading] = useState(false);

  // Campos que precisam de reenvio
  const pending = [
    { key: 'tema',    status: themeStatus   },
    { key: 'legenda', status: captionStatus },
    { key: 'arte',    status: artworkStatus },
  ].filter((f) => ADJUST_STATUSES.includes(f.status));

  if (pending.length === 0) return null;

  async function handleResend() {
    setLoading(true);
    const result = await resendForApproval(postId);
    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    toast.success('Post reenviado para aprovação do cliente!');
    setLoading(false);
  }

  // Últimas observações abertas do cliente (sobre ajuste)
  const openComments = comments
    .filter((c) => {
      const name = (Array.isArray(c.user_profiles) ? c.user_profiles[0] : c.user_profiles)?.name ?? '';
      // Comentários de cliente (não de staff Tucan)
      return !name.toLowerCase().includes('tucan') && !name.toLowerCase().includes('admin');
    })
    .slice(0, 3);

  return (
    <div style={{
      border: '1.5px solid #f59e0b',
      borderRadius: 14,
      overflow: 'hidden',
      background: '#fffbeb',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        background: '#fef3c7',
        borderBottom: '1px solid #f59e0b',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: '#f59e0b',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, flexShrink: 0,
        }}>
          ↩
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>
            Ajuste solicitado pelo cliente
          </div>
          <div style={{ fontSize: 11, color: '#b45309', marginTop: 1 }}>
            {pending.map((f) => FIELD_LABEL[f.key]).join(', ')} · corrija e reenvie para aprovação
          </div>
        </div>
      </div>

      {/* Observações do cliente */}
      {openComments.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #fde68a' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            O que o cliente pediu
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {openComments.map((c) => {
              const author = (Array.isArray(c.user_profiles) ? c.user_profiles[0] : c.user_profiles)?.name ?? 'Cliente';
              return (
                <div key={c.id} style={{
                  fontSize: 13, color: '#78350f', lineHeight: 1.5,
                  padding: '8px 12px', background: '#fff', borderRadius: 8,
                  border: '1px solid #fde68a',
                }}>
                  <span style={{ fontStyle: 'italic' }}>"{c.message}"</span>
                  <span style={{ fontSize: 11, color: '#b45309', marginLeft: 8 }}>
                    — {author}, {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Instruções + Botão */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5, margin: 0 }}>
          Após corrigir o conteúdo e salvar, clique em <strong>Reenviar para aprovação</strong> para notificar o cliente.
        </p>
        <button
          onClick={handleResend}
          disabled={loading}
          style={{
            height: 40, padding: '0 18px', borderRadius: 10,
            background: '#f59e0b', color: '#fff',
            border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 13, flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: loading ? 0.7 : 1,
            transition: 'opacity .15s',
          }}>
          <Icon name="arrow" size={14} />
          {loading ? 'Reenviando…' : 'Reenviar para aprovação'}
        </button>
      </div>
    </div>
  );
}
