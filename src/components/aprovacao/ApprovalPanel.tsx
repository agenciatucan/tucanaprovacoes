'use client';

import { useState, useTransition } from 'react';
import { submitApproval } from '@/actions/approvals';

type ApprovalStatus =
  | 'aguardando'
  | 'aprovado'
  | 'ajuste_solicitado'
  | 'substituir_tema'
  | 'nao_se_aplica';

type PostStatus = 'pendente' | 'em_revisao' | 'aprovado' | 'em_producao' | 'finalizado';

type ApprovalPost = {
  id: string;
  campaign_id: string;
  theme_status: ApprovalStatus | string;
  caption_status: ApprovalStatus | string;
  artwork_status: ApprovalStatus | string;
  general_status: PostStatus | string;
  is_locked: boolean;
};

type CommentItem = {
  id: string;
  message: string | null;
  status: string | null;
  created_at: string | null;
  user_profiles?:
    | { name?: string | null; role?: string | null }
    | { name?: string | null; role?: string | null }[]
    | null;
};

type ApprovalPanelProps = {
  post: ApprovalPost;
  comments?: CommentItem[];
};

const STATUS_LABEL: Record<string, string> = {
  aguardando:       'Aguardando',
  aprovado:         'Aprovado',
  ajuste_solicitado:'Ajuste solicitado',
  substituir_tema:  'Substituir tema',
  nao_se_aplica:    'Não se aplica',
  pendente:         'Pendente',
  em_revisao:       'Em revisão',
  em_producao:      'Em produção',
  finalizado:       'Finalizado',
};

function getCommentAuthor(comment: CommentItem) {
  const profile = Array.isArray(comment.user_profiles)
    ? comment.user_profiles[0]
    : comment.user_profiles;
  return profile?.name || 'Cliente';
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`status status-${status}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

type FieldKey = 'tema' | 'legenda' | 'arte';

const FIELDS: { key: FieldKey; label: string; statusKey: keyof ApprovalPost }[] = [
  { key: 'tema',    label: 'Tema',    statusKey: 'theme_status' },
  { key: 'legenda', label: 'Legenda', statusKey: 'caption_status' },
  { key: 'arte',    label: 'Arte',    statusKey: 'artwork_status' },
];

export default function ApprovalPanel({ post, comments = [] }: ApprovalPanelProps) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [adjustingField, setAdjustingField] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const locked = Boolean(post.is_locked);

  function handleApproveField(field: FieldKey) {
    setFeedback(null);
    startTransition(async () => {
      const result = await submitApproval({
        content_item_id: post.id,
        campaign_id:     post.campaign_id,
        approval_type:   field,
        status:          'aprovado',
      });
      setFeedback({
        type:    result.success ? 'success' : 'error',
        message: result.success ? `${FIELDS.find(f => f.key === field)?.label} aprovado!` : (result.error || 'Erro ao aprovar.'),
      });
    });
  }

  function handleRequestFieldAdjustment(field: FieldKey) {
    const note = notes[field]?.trim() ?? '';
    if (note.length < 5) {
      setFeedback({ type: 'error', message: 'Descreva o ajuste com pelo menos 5 caracteres.' });
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const result = await submitApproval({
        content_item_id: post.id,
        campaign_id:     post.campaign_id,
        approval_type:   field,
        status:          'ajuste_solicitado',
        note,
      });
      if (result.success) {
        setNotes(prev => ({ ...prev, [field]: '' }));
        setAdjustingField(null);
        setFeedback({ type: 'success', message: 'Ajuste solicitado!' });
      } else {
        setFeedback({ type: 'error', message: result.error || 'Erro ao solicitar ajuste.' });
      }
    });
  }

  function handleApproveAll() {
    setFeedback(null);
    startTransition(async () => {
      const result = await submitApproval({
        content_item_id: post.id,
        campaign_id:     post.campaign_id,
        approval_type:   'post_completo',
        status:          'aprovado',
      });
      setFeedback({
        type:    result.success ? 'success' : 'error',
        message: result.success ? 'Post aprovado com sucesso!' : (result.error || 'Erro ao aprovar.'),
      });
    });
  }

  const allApproved = FIELDS.every(f => post[f.statusKey] === 'aprovado');

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div className="eyebrow">Aprovação</div>
        <h2 className="h2" style={{ marginTop: 6, fontSize: 22 }}>Revise este post</h2>
        <p className="muted tiny" style={{ marginTop: 6 }}>
          Aprove ou solicite ajuste em cada item individualmente.
        </p>
      </div>

      {/* Campos individuais */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {FIELDS.map(({ key, label, statusKey }) => {
          const status = (post[statusKey] as string) || 'aguardando';
          const isPendingField = status === 'aguardando' || status === 'em_revisao';
          const isAdjusting = adjustingField === key;

          return (
            <div
              key={key}
              style={{
                borderRadius: 12,
                border: '1px solid var(--line)',
                padding: '12px 14px',
                background: 'var(--bg)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>{label}</span>
                <StatusPill status={status} />
              </div>

              {!locked && isPendingField && !isAdjusting && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => handleApproveField(key)}
                    disabled={isPending}
                    style={{
                      flex: 1, justifyContent: 'center', fontSize: 12,
                      background: 'var(--green)', color: '#fff', border: 'none',
                    }}
                  >
                    ✓ Aprovar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setAdjustingField(key)}
                    disabled={isPending}
                    style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
                  >
                    Solicitar ajuste
                  </button>
                </div>
              )}

              {!locked && isAdjusting && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    className="textarea"
                    rows={3}
                    placeholder={`Descreva o ajuste necessário no ${label.toLowerCase()}...`}
                    value={notes[key] ?? ''}
                    onChange={e => setNotes(prev => ({ ...prev, [key]: e.target.value }))}
                    disabled={isPending}
                    style={{ fontSize: 13 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => handleRequestFieldAdjustment(key)}
                      disabled={isPending}
                      style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
                    >
                      Enviar ajuste
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setAdjustingField(null)}
                      disabled={isPending}
                      style={{ fontSize: 12 }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status geral */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
        <span className="muted" style={{ fontSize: 13 }}>Status geral</span>
        <StatusPill status={post.general_status || 'pendente'} />
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className="tiny"
          style={{
            borderRadius: 14, padding: '10px 12px', fontWeight: 700,
            background: feedback.type === 'success' ? '#ecfdf3' : '#fff1f2',
            color:      feedback.type === 'success' ? '#166534'  : '#be123c',
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Aprovar tudo */}
      {!locked && !allApproved && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleApproveAll}
          disabled={isPending}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {isPending ? 'Salvando...' : 'Aprovar post completo'}
        </button>
      )}

      {locked && (
        <div className="tiny muted" style={{ fontWeight: 700 }}>
          Este post está bloqueado para alterações.
        </div>
      )}

      {/* Histórico */}
      {comments.length > 0 && (
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <div className="eyebrow">Histórico de observações</div>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {comments.map((comment) => (
              <div key={comment.id} className="comment-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <strong style={{ fontSize: 13 }}>{getCommentAuthor(comment)}</strong>
                  <span className="tiny muted">{comment.status || 'aberta'}</span>
                </div>
                <p className="muted tiny" style={{ margin: '6px 0 0', lineHeight: 1.5 }}>
                  {comment.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
