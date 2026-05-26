'use client';
import { useState } from 'react';
import { submitApproval } from '@/actions/approvals';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils';

type ApprovalStatus = 'aguardando' | 'aprovado' | 'ajuste_solicitado' | 'substituir_tema' | 'nao_se_aplica';

interface PostApprovalState {
  id: string;
  campaign_id: string;
  theme_status: string;
  caption_status: string;
  artwork_status: string;
  general_status: string;
  is_locked: boolean;
}

interface Comment {
  id: string;
  message: string;
  status: string;
  created_at: string;
  user_profiles: { name: string } | null | { name: string }[];
}

interface Props {
  post: PostApprovalState;
  comments: Comment[];
}

// Maps DB status → display
const DB_TO_KIND: Record<string, string> = {
  aguardando: 'aguardando', aprovado: 'aprovado',
  ajuste_solicitado: 'revisao', substituir_tema: 'revisao', nao_se_aplica: 'rascunho',
};

export default function ApprovalPanel({ post, comments }: Props) {
  const [note, setNote] = useState('');
  const [activeAction, setActiveAction] = useState<'approve' | 'adjust' | null>(null);
  const [loading, setLoading] = useState(false);
  const isLocked = post.is_locked;

  async function handleAction(approvalType: string, status: string) {
    if (status === 'ajuste_solicitado' && note.trim().length < 5) {
      toast.error('Descreva o que precisa ser ajustado para continuar.');
      return;
    }
    setLoading(true);
    const result = await submitApproval({
      content_item_id: post.id,
      campaign_id: post.campaign_id,
      approval_type: approvalType as any,
      status: status as any,
      note: note.trim() || undefined,
    });
    if (!result.success) { toast.error(result.error); setLoading(false); return; }
    toast.success(status === 'aprovado' ? 'Aprovado com sucesso!' : 'Ajuste solicitado. A Tucan já foi notificada.');
    setActiveAction(null);
    setNote('');
    setLoading(false);
  }

  const themeKind = DB_TO_KIND[post.theme_status] ?? 'aguardando';
  const captionKind = DB_TO_KIND[post.caption_status] ?? 'aguardando';
  const artworkKind = DB_TO_KIND[post.artwork_status] ?? 'aguardando';

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20, boxShadow: 'var(--shadow-2)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 className="h3">Aprovação</h3>
          <p className="muted tiny" style={{ marginTop: 2 }}>
            {isLocked ? 'Este cronograma está bloqueado para edições.' : 'Sua aprovação dispara o agendamento. Pedidos de ajuste vão direto para a Tucan.'}
          </p>
        </div>
        {/* Status summary */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Tema',    kind: themeKind },
            { label: 'Legenda', kind: captionKind },
            { label: 'Arte',    kind: artworkKind },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div className="eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>{s.label}</div>
              <StatusBadge kind={s.kind as any} />
            </div>
          ))}
        </div>
      </div>

      {!isLocked && (
        <>
          {/* Action buttons — from design */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveAction(activeAction === 'adjust' ? null : 'adjust')}
              className="btn"
              style={{
                background: activeAction === 'adjust' ? '#fef3c7' : '#fff',
                color: 'var(--st-revisao-fg)',
                border: `1px solid ${activeAction === 'adjust' ? '#fbbf24' : 'var(--line)'}`,
                height: 48, padding: '0 20px',
              }}>
              <Icon name="edit" size={16} /> Pedir ajuste
            </button>
            <button
              onClick={() => {
                setActiveAction(activeAction === 'approve' ? null : 'approve');
                if (activeAction !== 'approve') handleAction('post_completo', 'aprovado');
              }}
              className="btn btn-primary"
              disabled={loading}
              style={{
                height: 48, padding: '0 24px',
                background: activeAction === 'approve' ? 'var(--green)' : 'var(--orange)',
                boxShadow: activeAction === 'approve'
                  ? '0 1px 0 rgba(0,0,0,0.04), 0 10px 24px -10px rgba(37,65,30,0.6)'
                  : '0 1px 0 rgba(0,0,0,0.04), 0 10px 24px -10px rgba(235,96,19,0.6)',
              }}>
              <Icon name="check" size={16} />
              {loading ? 'Aguarde…' : activeAction === 'approve' ? 'Aprovado!' : 'Aprovar este post'}
            </button>
          </div>

          {/* Adjustment note field — shown when "Pedir ajuste" is active */}
          {activeAction === 'adjust' && (
            <div className="field">
              <label className="field-label">
                Observação <span className="muted" style={{ fontWeight: 400 }}>(obrigatório para pedir ajuste)</span>
              </label>
              <textarea
                className="input"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Descreva o que precisa ser ajustado, com o máximo de detalhes possível…"
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setActiveAction(null); setNote(''); }}>Cancelar</button>
                <button
                  className="btn btn-sm"
                  disabled={loading || note.trim().length < 5}
                  onClick={() => handleAction('post_completo', 'ajuste_solicitado')}
                  style={{ background: 'var(--st-revisao-bg)', color: 'var(--st-revisao-fg)', border: '1px solid #fbbf24' }}>
                  {loading ? 'Enviando…' : 'Enviar pedido de ajuste'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* History */}
      {comments.length > 0 && (
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Histórico</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {comments.map((c) => {
              const authorData = Array.isArray(c.user_profiles) ? c.user_profiles[0] : c.user_profiles;
              const author = authorData?.name ?? 'Usuário';
              const isTucan = author.toLowerCase().includes('tucan') || author.toLowerCase().includes('admin');
              return (
                <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: isTucan ? 'var(--green)' : 'var(--orange)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {author.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <strong>{author}</strong> · <span className="muted">{c.message}</span>
                  </div>
                  <span className="tiny muted">{formatDateTime(c.created_at)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
