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
    | {
        name?: string | null;
        role?: string | null;
      }
    | {
        name?: string | null;
        role?: string | null;
      }[]
    | null;
};

type ApprovalPanelProps = {
  post: ApprovalPost;
  comments?: CommentItem[];
};

const STATUS_LABEL: Record<string, string> = {
  aguardando: 'Aguardando',
  aprovado: 'Aprovado',
  ajuste_solicitado: 'Ajuste solicitado',
  substituir_tema: 'Substituir tema',
  nao_se_aplica: 'Não se aplica',
  pendente: 'Pendente',
  em_revisao: 'Em revisão',
  em_producao: 'Em produção',
  finalizado: 'Finalizado',
};

function getCommentAuthor(comment: CommentItem) {
  const profile = Array.isArray(comment.user_profiles)
    ? comment.user_profiles[0]
    : comment.user_profiles;

  return profile?.name || 'Cliente';
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`status-badge status-${status}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export default function ApprovalPanel({ post, comments = [] }: ApprovalPanelProps) {
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const locked = Boolean(post.is_locked);

  function handleApprovePost() {
    setFeedback(null);

    startTransition(async () => {
      const result = await submitApproval({
        content_item_id: post.id,
        campaign_id: post.campaign_id,
        approval_type: 'post_completo',
        status: 'aprovado',
      });

      if (!result.success) {
        setFeedback({
          type: 'error',
          message: result.error || 'Não foi possível aprovar o post.',
        });
        return;
      }

      setFeedback({
        type: 'success',
        message: 'Post aprovado com sucesso.',
      });
    });
  }

  function handleRequestAdjustment() {
    setFeedback(null);

    if (note.trim().length < 5) {
      setFeedback({
        type: 'error',
        message: 'Descreva o ajuste solicitado com pelo menos 5 caracteres.',
      });
      return;
    }

    startTransition(async () => {
      const result = await submitApproval({
        content_item_id: post.id,
        campaign_id: post.campaign_id,
        approval_type: 'post_completo',
        status: 'ajuste_solicitado',
        note: note.trim(),
      });

      if (!result.success) {
        setFeedback({
          type: 'error',
          message: result.error || 'Não foi possível solicitar o ajuste.',
        });
        return;
      }

      setNote('');
      setFeedback({
        type: 'success',
        message: 'Ajuste solicitado com sucesso.',
      });
    });
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div className="eyebrow">Aprovação</div>
        <h2 className="h2" style={{ marginTop: 6, fontSize: 22 }}>
          Revise este post
        </h2>
        <p className="muted tiny" style={{ marginTop: 6 }}>
          Aprove o post completo ou descreva os ajustes necessários.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span className="muted tiny">Tema</span>
          <StatusPill status={post.theme_status || 'aguardando'} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span className="muted tiny">Legenda</span>
          <StatusPill status={post.caption_status || 'aguardando'} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span className="muted tiny">Arte</span>
          <StatusPill status={post.artwork_status || 'aguardando'} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span className="muted tiny">Status geral</span>
          <StatusPill status={post.general_status || 'pendente'} />
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="approval-note">
          Ajustes necessários
        </label>
        <textarea
          id="approval-note"
          className="textarea"
          rows={5}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Descreva aqui o que precisa ser ajustado..."
          disabled={locked || isPending}
        />
      </div>

      {feedback ? (
        <div
          className="tiny"
          style={{
            borderRadius: 14,
            padding: '10px 12px',
            background: feedback.type === 'success' ? '#ecfdf3' : '#fff1f2',
            color: feedback.type === 'success' ? '#166534' : '#be123c',
            fontWeight: 700,
          }}
        >
          {feedback.message}
        </div>
      ) : null}

      {locked ? (
        <div className="tiny muted" style={{ fontWeight: 700 }}>
          Este post está bloqueado para alterações.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApprovePost}
            disabled={isPending}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {isPending ? 'Salvando...' : 'Aprovar post'}
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleRequestAdjustment}
            disabled={isPending}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Solicitar ajuste
          </button>
        </div>
      )}

      {comments.length > 0 ? (
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
      ) : null}
    </div>
  );
}
