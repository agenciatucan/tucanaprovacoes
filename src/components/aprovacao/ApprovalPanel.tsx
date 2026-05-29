'use client';

import { useState } from 'react';
import { submitApproval } from '@/actions/approvals';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils';

type FieldKey = 'tema' | 'legenda' | 'arte';

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

const FIELDS: { key: FieldKey; label: string; statusKey: keyof PostApprovalState }[] =
  [
    { key: 'tema', label: 'Tema', statusKey: 'theme_status' },
    { key: 'legenda', label: 'Legenda', statusKey: 'caption_status' },
    { key: 'arte', label: 'Arte', statusKey: 'artwork_status' },
  ];

const STATUS_TEXT: Record<string, string> = {
  aguardando: 'Aguardando aprovação',
  aprovado: 'Aprovado',
  ajuste_solicitado: 'Ajuste solicitado',
  substituir_tema: 'Substituir tema',
};

function getStatusLabel(status: string) {
  return STATUS_TEXT[status] ?? status;
}

function isAdjustedStatus(status: string) {
  return status === 'ajuste_solicitado' || status === 'substituir_tema';
}

export default function ApprovalPanel({ post, comments }: Props) {
  const isLocked = post.is_locked;

  const [localStatus, setLocalStatus] = useState<Record<FieldKey, string>>({
    tema: post.theme_status,
    legenda: post.caption_status,
    arte: post.artwork_status,
  });

  const [adjustField, setAdjustField] = useState<FieldKey | null>(null);

  const [notes, setNotes] = useState<Record<FieldKey, string>>({
    tema: '',
    legenda: '',
    arte: '',
  });

  const [loading, setLoading] = useState(false);

  const allApproved = Object.values(localStatus).every(
    (status) => status === 'aprovado'
  );

  const hasAdjustments = Object.values(localStatus).some((status) =>
    isAdjustedStatus(status)
  );

  function toggleAdjust(field: FieldKey) {
    if (loading) return;

    if (adjustField === field) {
      setAdjustField(null);
      setNotes((prev) => ({ ...prev, [field]: '' }));
      return;
    }

    setAdjustField(field);
  }

  async function handleApprove(field: FieldKey) {
    setLoading(true);

    const result = await submitApproval({
      content_item_id: post.id,
      campaign_id: post.campaign_id,
      approval_type: field,
      status: 'aprovado',
    });

    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    const label = FIELDS.find((item) => item.key === field)?.label ?? 'Item';

    toast.success(`${label} aprovado!`);

    setLocalStatus((prev) => ({ ...prev, [field]: 'aprovado' }));
    setAdjustField(null);
    setLoading(false);
  }

  async function handleAdjust(field: FieldKey) {
    const note = notes[field].trim();

    if (note.length < 5) {
      toast.error('Descreva o que precisa ser ajustado.');
      return;
    }

    setLoading(true);

    const result = await submitApproval({
      content_item_id: post.id,
      campaign_id: post.campaign_id,
      approval_type: field,
      status: 'ajuste_solicitado',
      note,
    });

    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    toast.success('Pedido de ajuste enviado. A Tucan já foi notificada.');

    setLocalStatus((prev) => ({ ...prev, [field]: 'ajuste_solicitado' }));
    setNotes((prev) => ({ ...prev, [field]: '' }));
    setAdjustField(null);
    setLoading(false);
  }

  async function handleApproveAll() {
    setLoading(true);

    const result = await submitApproval({
      content_item_id: post.id,
      campaign_id: post.campaign_id,
      approval_type: 'post_completo',
      status: 'aprovado',
    });

    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    toast.success('Post aprovado com sucesso! 🎉');

    setLocalStatus({
      tema: 'aprovado',
      legenda: 'aprovado',
      arte: 'aprovado',
    });

    setAdjustField(null);
    setLoading(false);
  }

  return (
    <div className="approval-panel card">
      <style>
        {`
          .approval-panel {
            display: flex;
            flex-direction: column;
            gap: 20px;
            box-shadow: var(--shadow-2);
            border-radius: 22px;
          }

          .approval-panel-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
          }

          .approval-panel-header-icon {
            width: 44px;
            height: 44px;
            border-radius: 14px;
            background: var(--green-50);
            color: var(--green);
            display: grid;
            place-items: center;
            flex-shrink: 0;
          }

          .approval-panel-title-row {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
          }

          .approval-field-list {
            border: 1px solid var(--line);
            border-radius: 18px;
            overflow: hidden;
            background: #fff;
          }

          .approval-field-row {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 12px;
            padding: 15px 16px;
            align-items: center;
            border-bottom: 1px solid var(--line);
            transition: background .12s ease;
          }

          .approval-field-row:last-child {
            border-bottom: 0;
          }

          .approval-field-row.open {
            border-bottom: 1px solid var(--line);
          }

          .approval-field-icon {
            width: 34px;
            height: 34px;
            border-radius: 11px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            font-weight: 900;
          }

          .approval-field-label {
            font-size: 14px;
            font-weight: 800;
            color: var(--ink);
          }

          .approval-field-status {
            margin-top: 2px;
            font-size: 11px;
            font-weight: 700;
          }

          .approval-field-actions {
            display: flex;
            gap: 7px;
            flex-shrink: 0;
          }

          .approval-adjust-box {
            padding: 15px 16px 16px;
            background: #fffbeb;
            border-bottom: 1px solid var(--line);
          }

          .approval-adjust-label {
            display: block;
            margin-bottom: 8px;
            color: #92400e;
            font-size: 12px;
            font-weight: 800;
          }

          .approval-adjust-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 10px;
          }

          .approval-actions-footer {
            display: flex;
            justify-content: flex-end;
            padding-top: 2px;
          }

          .approval-success-box {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 14px 20px;
            border-radius: 14px;
            background: #f0faf0;
            color: #1a5c1a;
            font-weight: 800;
            font-size: 14px;
            text-align: center;
          }

          .approval-locked-box {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 14px;
            border-radius: 14px;
            background: #f9fafb;
            border: 1px solid var(--line);
            color: var(--muted);
            font-size: 13px;
            line-height: 1.5;
          }

          .approval-history {
            border-top: 1px solid var(--line);
            padding-top: 16px;
          }

          .approval-history-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .approval-history-item {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 10px;
            align-items: flex-start;
          }

          .approval-history-avatar {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            color: #fff;
            font-size: 10px;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .approval-history-message {
            font-size: 13px;
            line-height: 1.5;
            min-width: 0;
          }

          .approval-history-date {
            flex-shrink: 0;
            text-align: right;
          }

          @media (max-width: 720px) {
            .approval-panel {
              border-radius: 20px;
              gap: 18px;
            }

            .approval-panel-header {
              display: block;
            }

            .approval-panel-title-row {
              align-items: flex-start;
            }

            .approval-field-row {
              grid-template-columns: auto minmax(0, 1fr);
              align-items: flex-start;
              padding: 14px;
            }

            .approval-field-actions {
              grid-column: 1 / -1;
              display: grid;
              grid-template-columns: 1fr 1fr;
              width: 100%;
            }

            .approval-field-actions .btn {
              width: 100%;
              min-height: 40px;
            }

            .approval-adjust-box {
              padding: 14px;
            }

            .approval-adjust-actions {
              display: grid;
              grid-template-columns: 1fr;
            }

            .approval-adjust-actions .btn {
              width: 100%;
            }

            .approval-actions-footer {
              display: block;
            }

            .approval-actions-footer .btn {
              width: 100%;
              min-height: 48px;
            }

            .approval-history-item {
              grid-template-columns: auto minmax(0, 1fr);
            }

            .approval-history-date {
              grid-column: 2 / -1;
              text-align: left;
              margin-top: -4px;
            }
          }

          @media (max-width: 420px) {
            .approval-field-actions {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <div className="approval-panel-header">
        <div className="approval-panel-title-row">
          <div className="approval-panel-header-icon">
            <Icon name="check" size={20} stroke={2} />
          </div>

          <div>
            <h3 className="h3" style={{ marginBottom: 4 }}>
              Aprovação
            </h3>

            <p className="muted tiny" style={{ margin: 0, lineHeight: 1.5 }}>
              {isLocked
                ? 'Este cronograma está bloqueado para edições.'
                : allApproved
                  ? 'Todos os itens foram aprovados. Obrigado!'
                  : hasAdjustments
                    ? 'Há ajustes solicitados. A equipe Tucan irá revisar e reenviar.'
                    : 'Aprove cada item individualmente ou clique em “Aprovar tudo”.'}
            </p>
          </div>
        </div>
      </div>

      {isLocked ? (
        <div className="approval-locked-box">
          <Icon name="info" size={16} />
          <div>
            Este cronograma está bloqueado. Caso precise solicitar alguma
            alteração, entre em contato com a equipe Tucan.
          </div>
        </div>
      ) : (
        <>
          <div className="approval-field-list">
            {FIELDS.map((field, index) => {
              const status = localStatus[field.key];
              const isDone = status === 'aprovado';
              const isAdjusted = isAdjustedStatus(status);
              const isOpen = adjustField === field.key;
              const isLast = index === FIELDS.length - 1;

              const rowBg = isDone
                ? '#f0faf0'
                : isAdjusted
                  ? '#fffbeb'
                  : '#fff';

              const iconBg = isDone
                ? 'var(--green)'
                : isAdjusted
                  ? '#f59e0b'
                  : 'var(--bg-2)';

              const iconColor =
                isDone || isAdjusted ? '#fff' : 'var(--muted)';

              const labelColor = isDone
                ? '#1a5c1a'
                : isAdjusted
                  ? '#92400e'
                  : 'var(--ink)';

              const statusColor = isDone
                ? '#1a5c1a'
                : isAdjusted
                  ? '#b45309'
                  : 'var(--muted)';

              return (
                <div key={field.key}>
                  <div
                    className={`approval-field-row ${
                      isOpen ? 'open' : ''
                    }`}
                    style={{
                      background: rowBg,
                      borderBottom:
                        !isLast || isOpen
                          ? '1px solid var(--line)'
                          : 'none',
                    }}
                  >
                    <div
                      className="approval-field-icon"
                      style={{
                        background: iconBg,
                        color: iconColor,
                      }}
                    >
                      {isDone ? (
                        <Icon name="check" size={15} stroke={2.5} />
                      ) : isAdjusted ? (
                        '↩'
                      ) : (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: 'var(--muted-2)',
                            display: 'block',
                          }}
                        />
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        className="approval-field-label"
                        style={{ color: labelColor }}
                      >
                        {field.label}
                      </div>

                      <div
                        className="approval-field-status"
                        style={{ color: statusColor }}
                      >
                        {getStatusLabel(status)}
                      </div>
                    </div>

                    {!isDone ? (
                      <div className="approval-field-actions">
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={loading}
                          onClick={() => toggleAdjust(field.key)}
                          style={{
                            background: isOpen ? '#fef3c7' : '#fff',
                            color: '#92400e',
                            border: `1px solid ${
                              isOpen ? '#f59e0b' : 'var(--line)'
                            }`,
                            fontWeight: 700,
                            gap: 5,
                          }}
                        >
                          <Icon name="edit" size={12} />
                          {isAdjusted ? 'Novo ajuste' : 'Pedir ajuste'}
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={loading}
                          onClick={() => handleApprove(field.key)}
                          style={{
                            background: 'var(--green)',
                            boxShadow: 'none',
                            fontWeight: 700,
                            gap: 5,
                          }}
                        >
                          <Icon name="check" size={12} stroke={2.5} />
                          Aprovar
                        </button>
                      </div>
                    ) : (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: '#1a5c1a',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Icon name="check" size={14} stroke={2.5} />
                        Aprovado
                      </span>
                    )}
                  </div>

                  {isOpen && (
                    <div
                      className="approval-adjust-box"
                      style={{
                        borderBottom: !isLast
                          ? '1px solid var(--line)'
                          : 'none',
                      }}
                    >
                      <label className="approval-adjust-label">
                        O que precisa ser ajustado no{' '}
                        {field.label.toLowerCase()}?
                      </label>

                      <textarea
                        className="input"
                        rows={4}
                        value={notes[field.key]}
                        onChange={(event) =>
                          setNotes((prev) => ({
                            ...prev,
                            [field.key]: event.target.value,
                          }))
                        }
                        placeholder={`Descreva o ajuste necessário no ${field.label.toLowerCase()} com o máximo de detalhes…`}
                        style={{
                          resize: 'vertical',
                          minHeight: 110,
                          borderColor: '#f59e0b',
                        }}
                        autoFocus
                      />

                      <div className="approval-adjust-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => toggleAdjust(field.key)}
                          disabled={loading}
                        >
                          Cancelar
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={
                            loading || notes[field.key].trim().length < 5
                          }
                          onClick={() => handleAdjust(field.key)}
                          style={{
                            background: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #f59e0b',
                            fontWeight: 800,
                          }}
                        >
                          {loading
                            ? 'Enviando…'
                            : 'Enviar pedido de ajuste'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!allApproved ? (
            <div className="approval-actions-footer">
              <button
                type="button"
                className="btn btn-primary"
                disabled={loading}
                onClick={handleApproveAll}
                style={{
                  minHeight: 50,
                  padding: '0 32px',
                  background: 'var(--orange)',
                  boxShadow:
                    '0 1px 0 rgba(0,0,0,0.04), 0 10px 28px -10px rgba(235,96,19,0.55)',
                  fontSize: 15,
                  fontWeight: 800,
                  gap: 8,
                  borderRadius: 14,
                }}
              >
                <Icon name="check" size={17} stroke={2.5} />
                {loading ? 'Aguarde…' : 'Aprovar tudo'}
              </button>
            </div>
          ) : (
            <div className="approval-success-box">
              <Icon name="check" size={16} stroke={2.5} />
              Todos os itens aprovados — obrigado!
            </div>
          )}
        </>
      )}

      {comments.length > 0 && (
        <div className="approval-history">
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Histórico
          </div>

          <div className="approval-history-list">
            {comments.map((comment) => {
              const authorData = Array.isArray(comment.user_profiles)
                ? comment.user_profiles[0]
                : comment.user_profiles;

              const author = authorData?.name ?? 'Usuário';

              const isTucan =
                author.toLowerCase().includes('tucan') ||
                author.toLowerCase().includes('admin');

              return (
                <div key={comment.id} className="approval-history-item">
                  <div
                    className="approval-history-avatar"
                    style={{
                      background: isTucan ? 'var(--green)' : 'var(--orange)',
                    }}
                  >
                    {author.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="approval-history-message">
                    <strong style={{ color: 'var(--ink)' }}>{author}</strong>

                    <span
                      className="muted"
                      style={{
                        marginLeft: 6,
                        wordBreak: 'break-word',
                      }}
                    >
                      {comment.message}
                    </span>
                  </div>

                  <span className="tiny muted approval-history-date">
                    {formatDateTime(comment.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}