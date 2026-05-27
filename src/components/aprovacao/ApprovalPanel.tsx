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

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: 'tema',    label: 'Tema'    },
  { key: 'legenda', label: 'Legenda' },
  { key: 'arte',    label: 'Arte'    },
];

export default function ApprovalPanel({ post, comments }: Props) {
  const isLocked = post.is_locked;

  /* ── local state ─────────────────────────────────────────── */
  const [localStatus, setLocalStatus] = useState<Record<FieldKey, string>>({
    tema:    post.theme_status,
    legenda: post.caption_status,
    arte:    post.artwork_status,
  });
  // Which field row is showing the adjustment textarea (only one at a time)
  const [adjustField, setAdjustField] = useState<FieldKey | null>(null);
  // Per-field note text
  const [notes, setNotes] = useState<Record<FieldKey, string>>({ tema: '', legenda: '', arte: '' });
  const [loading, setLoading] = useState(false);

  const allApproved = (Object.values(localStatus) as string[]).every(s => s === 'aprovado');

  /* ── helpers ─────────────────────────────────────────────── */
  function toggleAdjust(field: FieldKey) {
    if (adjustField === field) {
      setAdjustField(null);
      setNotes(prev => ({ ...prev, [field]: '' }));
    } else {
      setAdjustField(field);
    }
  }

  /* ── actions ─────────────────────────────────────────────── */
  async function handleApprove(field: FieldKey) {
    setLoading(true);
    const result = await submitApproval({
      content_item_id: post.id,
      campaign_id: post.campaign_id,
      approval_type: field,
      status: 'aprovado',
    });
    if (!result.success) { toast.error(result.error); setLoading(false); return; }
    const label = FIELDS.find(f => f.key === field)!.label;
    toast.success(`${label} aprovado!`);
    setLocalStatus(prev => ({ ...prev, [field]: 'aprovado' }));
    setAdjustField(null);
    setLoading(false);
  }

  async function handleAdjust(field: FieldKey) {
    const note = notes[field].trim();
    if (note.length < 5) {
      toast.error('Descreva o que precisa ser ajustado (mínimo 5 caracteres).');
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
    if (!result.success) { toast.error(result.error); setLoading(false); return; }
    toast.success('Pedido de ajuste enviado. A Tucan já foi notificada.');
    setLocalStatus(prev => ({ ...prev, [field]: 'ajuste_solicitado' }));
    setNotes(prev => ({ ...prev, [field]: '' }));
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
    if (!result.success) { toast.error(result.error); setLoading(false); return; }
    toast.success('Post aprovado com sucesso! 🎉');
    setLocalStatus({ tema: 'aprovado', legenda: 'aprovado', arte: 'aprovado' });
    setAdjustField(null);
    setLoading(false);
  }

  /* ── render ──────────────────────────────────────────────── */
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20, boxShadow: 'var(--shadow-2)' }}>

      {/* ── Header ── */}
      <div>
        <h3 className="h3" style={{ marginBottom: 4 }}>Aprovação</h3>
        <p className="muted tiny">
          {isLocked
            ? 'Este cronograma está bloqueado para edições.'
            : allApproved
              ? 'Todos os itens foram aprovados. Obrigado!'
              : 'Aprove cada item individualmente ou clique em "Aprovar tudo" para aprovar de uma vez.'}
        </p>
      </div>

      {!isLocked && (
        <>
          {/* ── Per-field rows ── */}
          <div style={{ border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {FIELDS.map((field, idx) => {
              const status     = localStatus[field.key];
              const isDone     = status === 'aprovado';
              const isAdjusted = status === 'ajuste_solicitado' || status === 'substituir_tema';
              const isOpen     = adjustField === field.key;
              const isLast     = idx === FIELDS.length - 1;

              return (
                <div key={field.key}>
                  {/* Row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px',
                    borderBottom: (!isLast || isOpen) ? '1px solid var(--line)' : 'none',
                    background: isDone ? '#f0faf0' : isAdjusted ? '#fffbeb' : '#fff',
                    transition: 'background .1s',
                  }}>
                    {/* Status icon circle */}
                    <div style={{
                      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      background: isDone
                        ? 'var(--green)'
                        : isAdjusted
                          ? '#f59e0b'
                          : 'var(--bg)',
                      color: isDone || isAdjusted ? '#fff' : 'var(--muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 800,
                    }}>
                      {isDone
                        ? <Icon name="check" size={15} stroke={2.5} />
                        : isAdjusted
                          ? '↩'
                          : <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--line-hard, #c8c8c8)', display: 'block' }} />}
                    </div>

                    {/* Label */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 700,
                        color: isDone ? '#1a5c1a' : isAdjusted ? '#92400e' : 'var(--ink)',
                      }}>
                        {field.label}
                      </div>
                      {isAdjusted && (
                        <div style={{ fontSize: 11, color: '#b45309', marginTop: 1 }}>
                          Ajuste solicitado · aguardando revisão
                        </div>
                      )}
                    </div>

                    {/* Action buttons — only when not yet approved */}
                    {!isDone ? (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          className="btn btn-sm"
                          disabled={loading}
                          onClick={() => toggleAdjust(field.key)}
                          style={{
                            height: 34, padding: '0 12px',
                            background: isOpen ? '#fef3c7' : '#fff',
                            color: '#92400e',
                            border: `1px solid ${isOpen ? '#f59e0b' : 'var(--line)'}`,
                            fontWeight: 600, gap: 5,
                          }}>
                          <Icon name="edit" size={12} />
                          {isAdjusted ? 'Novo ajuste' : 'Pedir ajuste'}
                        </button>
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={loading}
                          onClick={() => handleApprove(field.key)}
                          style={{
                            height: 34, padding: '0 14px',
                            background: 'var(--green)', boxShadow: 'none', fontWeight: 600, gap: 5,
                          }}>
                          <Icon name="check" size={12} stroke={2.5} />
                          Aprovar
                        </button>
                      </div>
                    ) : (
                      <span style={{
                        fontSize: 12, fontWeight: 700, color: '#1a5c1a',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <Icon name="check" size={14} stroke={2.5} />
                        Aprovado
                      </span>
                    )}
                  </div>

                  {/* Expandable adjustment textarea */}
                  {isOpen && (
                    <div style={{
                      padding: '14px 16px 16px',
                      background: '#fffbeb',
                      borderBottom: !isLast ? '1px solid var(--line)' : 'none',
                    }}>
                      <label style={{
                        fontSize: 12, fontWeight: 700, color: '#92400e',
                        display: 'block', marginBottom: 8,
                      }}>
                        O que precisa ser ajustado no {field.label.toLowerCase()}?
                      </label>
                      <textarea
                        className="input"
                        rows={3}
                        value={notes[field.key]}
                        onChange={(e) => setNotes(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={`Descreva o ajuste necessário no ${field.label.toLowerCase()} com o máximo de detalhes…`}
                        style={{ resize: 'none', marginBottom: 10, borderColor: '#f59e0b' }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => toggleAdjust(field.key)}>
                          Cancelar
                        </button>
                        <button
                          className="btn btn-sm"
                          disabled={loading || notes[field.key].trim().length < 5}
                          onClick={() => handleAdjust(field.key)}
                          style={{
                            background: '#fef3c7', color: '#92400e',
                            border: '1px solid #f59e0b', fontWeight: 600,
                          }}>
                          {loading ? 'Enviando…' : 'Enviar pedido de ajuste'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Approve all button ── */}
          {!allApproved ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 2 }}>
              <button
                className="btn btn-primary"
                disabled={loading}
                onClick={handleApproveAll}
                style={{
                  height: 50, padding: '0 32px',
                  background: 'var(--orange)',
                  boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 10px 28px -10px rgba(235,96,19,0.55)',
                  fontSize: 15, fontWeight: 700, gap: 8, borderRadius: 12,
                }}>
                <Icon name="check" size={17} stroke={2.5} />
                {loading ? 'Aguarde…' : 'Aprovar tudo'}
              </button>
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px 20px', borderRadius: 12, background: '#f0faf0',
              color: '#1a5c1a', fontWeight: 700, fontSize: 14,
            }}>
              <Icon name="check" size={16} stroke={2.5} />
              Todos os itens aprovados — obrigado!
            </div>
          )}
        </>
      )}

      {/* ── History ── */}
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
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: isTucan ? 'var(--green)' : 'var(--orange)',
                    color: '#fff', fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {author.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--ink)' }}>{author}</strong>
                    <span className="muted" style={{ marginLeft: 6 }}>{c.message}</span>
                  </div>
                  <span className="tiny muted" style={{ flexShrink: 0 }}>{formatDateTime(c.created_at)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
