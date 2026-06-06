'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { createContentItem, updateContentItem } from '@/actions/content-items';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

const FORMAT_OPTS = [
  { value: 'reels', label: 'Reels' },
  { value: 'carrossel', label: 'Carrossel' },
  { value: 'post_estatico', label: 'Post estático' },
  { value: 'story', label: 'Story' },
  { value: 'outro', label: 'Outro' },
];

const DEFAULT_WEEKS = [
  'Semana 1',
  'Semana 2',
  'Semana 3',
  'Semana 4',
  'Semana 5',
];

interface PostFormProps {
  campaignId: string;
  returnHref: string;
  existingWeeks?: string[];
  initial?: {
    id: string;
    campaign_id: string;
    week_label: string;
    order_index: number;
    format: string;
    title: string;
    theme?: string | null;
    objective?: string | null;
    creative_concept?: string | null;
    caption?: string | null;
    script?: string | null;
    reference_url?: string | null;
    internal_notes?: string | null;
    scheduled_date?: string | null;
  };
}

export default function PostForm({
  campaignId,
  returnHref,
  existingWeeks,
  initial,
}: PostFormProps) {
  const router = useRouter();

  const isEdit = Boolean(initial);

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    campaign_id: initial?.campaign_id ?? campaignId,
    week_label: initial?.week_label ?? existingWeeks?.at(-1) ?? 'Semana 1',
    order_index: initial?.order_index ?? 0,
    format: initial?.format ?? 'post_estatico',
    title: initial?.title ?? '',
    theme: initial?.theme ?? '',
    objective: initial?.objective ?? '',
    creative_concept: initial?.creative_concept ?? '',
    caption: initial?.caption ?? '',
    script: initial?.script ?? '',
    reference_url: initial?.reference_url ?? '',
    internal_notes: initial?.internal_notes ?? '',
    scheduled_date: initial?.scheduled_date ?? '',
  });

  function set(key: keyof typeof form, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);

    const payload = {
      campaign_id: form.campaign_id,
      week_label: form.week_label,
      order_index: Number(form.order_index),
      format: form.format as
        | 'reels'
        | 'carrossel'
        | 'post_estatico'
        | 'story'
        | 'outro',
      title: form.title,
      theme: form.theme,
      objective: form.objective,
      creative_concept: form.creative_concept,
      caption: form.caption,
      script: form.script,
      reference_url: form.reference_url,
      internal_notes: form.internal_notes,
      scheduled_date: form.scheduled_date || null,
    };

    if (isEdit && initial) {
      const updateResult = await updateContentItem(initial.id, payload);

      if (!updateResult.success) {
        toast.error(updateResult.error);
        setLoading(false);
        return;
      }

      toast.success('Alterações salvas!');

      router.refresh();
      setLoading(false);

      return;
    }

    const createResult = await createContentItem(payload);

    if (!createResult.success) {
      toast.error(createResult.error);
      setLoading(false);
      return;
    }

    toast.success('Post criado!');

    router.push(`/admin/posts/${createResult.data.id}` as Route);
  }

  function handleCancel() {
    router.push(returnHref as Route);
  }

  const isReels = form.format === 'reels';

  const weekOptions = [
    ...new Set([...(existingWeeks ?? []), ...DEFAULT_WEEKS]),
  ];

  return (
    <form onSubmit={handleSubmit} className="admin-post-form">
      <style>
        {`
          .admin-post-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .admin-post-form-grid-3 {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
          }

          .admin-post-form-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          .admin-post-form-section {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .admin-post-form-section-title {
            display: flex;
            align-items: center;
            gap: 8px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--line-soft);
            color: var(--ink);
            font-size: 13px;
            font-weight: 800;
          }

          .admin-post-form-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            align-items: center;
            padding-top: 4px;
            flex-wrap: wrap;
          }

          @media (max-width: 820px) {
            .admin-post-form-grid-3 {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 640px) {
            .admin-post-form-grid-3,
            .admin-post-form-grid-2 {
              grid-template-columns: 1fr;
            }

            .admin-post-form-actions {
              display: grid;
              grid-template-columns: 1fr;
            }

            .admin-post-form-actions .btn {
              width: 100%;
              min-height: 46px;
            }
          }
        `}
      </style>

      <div className="admin-post-form-section">
        <div className="admin-post-form-section-title">
          <Icon name="settings" size={14} />
          Informações básicas
        </div>

        <div className="admin-post-form-grid-3">
          <div className="field">
            <label className="field-label" htmlFor="week_label">
              Semana <span style={{ color: 'var(--orange)' }}>*</span>
            </label>

            <select
              id="week_label"
              required
              className="input"
              value={form.week_label}
              onChange={(event) => set('week_label', event.target.value)}
              disabled={loading}
              style={{
                appearance: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {weekOptions.map((week) => (
                <option key={week} value={week}>
                  {week}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="format">
              Formato <span style={{ color: 'var(--orange)' }}>*</span>
            </label>

            <select
              id="format"
              required
              className="input"
              value={form.format}
              onChange={(event) => set('format', event.target.value)}
              disabled={loading}
              style={{
                appearance: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {FORMAT_OPTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="order_index">
              Ordem
            </label>

            <input
              id="order_index"
              type="number"
              min={0}
              className="input"
              value={form.order_index}
              onChange={(event) =>
                set('order_index', parseInt(event.target.value) || 0)
              }
              disabled={loading}
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="title">
            Título do post <span style={{ color: 'var(--orange)' }}>*</span>
          </label>

          <input
            id="title"
            required
            className="input"
            placeholder="Ex.: Por que fazer check-up anual?"
            value={form.title}
            onChange={(event) => set('title', event.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="admin-post-form-section">
        <div className="admin-post-form-section-title">
          <Icon name="target" size={14} />
          Estratégia e conceito
        </div>

        <div className="admin-post-form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="theme">
              Tema
            </label>

            <input
              id="theme"
              className="input"
              placeholder="Tema principal do post"
              value={form.theme}
              onChange={(event) => set('theme', event.target.value)}
              disabled={loading}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="objective">
              Objetivo
            </label>

            <input
              id="objective"
              className="input"
              placeholder="Objetivo de comunicação"
              value={form.objective}
              onChange={(event) => set('objective', event.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="creative_concept">
            Conceito criativo
          </label>

          <textarea
            id="creative_concept"
            rows={4}
            className="input"
            placeholder="Descreva o conceito criativo e abordagem visual…"
            value={form.creative_concept}
            onChange={(event) => set('creative_concept', event.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="admin-post-form-section">
        <div className="admin-post-form-section-title">
          <Icon name="file" size={14} />
          Conteúdo
        </div>

        <div className="field">
          <label className="field-label" htmlFor="caption">
            Legenda sugerida
          </label>

          <textarea
            id="caption"
            rows={6}
            className="input"
            placeholder="Texto completo da legenda para o cliente aprovar…"
            value={form.caption}
            onChange={(event) => set('caption', event.target.value)}
            disabled={loading}
          />
        </div>

        {isReels && (
          <div className="field">
            <label className="field-label" htmlFor="script">
              Roteiro <span style={{ color: 'var(--orange)' }}>*</span>
            </label>

            <textarea
              id="script"
              required
              rows={6}
              className="input"
              placeholder="Roteiro completo para o Reels, com cenas, falas e referências visuais…"
              value={form.script}
              onChange={(event) => set('script', event.target.value)}
              disabled={loading}
            />
          </div>
        )}
      </div>

      <div className="admin-post-form-section">
        <div className="admin-post-form-section-title">
          <Icon name="info" size={14} />
          Referências e notas internas
        </div>

        <div className="admin-post-form-grid-3">
          <div className="field">
            <label className="field-label" htmlFor="reference_url">
              URL de referência{' '}
              <span className="muted" style={{ fontWeight: 400 }}>
                (opcional)
              </span>
            </label>

            <input
              id="reference_url"
              type="url"
              className="input"
              placeholder="https://…"
              value={form.reference_url}
              onChange={(event) => set('reference_url', event.target.value)}
              disabled={loading}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="internal_notes">
              Notas internas{' '}
              <span className="muted" style={{ fontWeight: 400 }}>
                (não visível ao cliente)
              </span>
            </label>

            <input
              id="internal_notes"
              className="input"
              placeholder="Observações para a equipe…"
              value={form.internal_notes}
              onChange={(event) => set('internal_notes', event.target.value)}
              disabled={loading}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="scheduled_date">
              Data de publicação{' '}
              <span className="muted" style={{ fontWeight: 400 }}>
                (somente equipe)
              </span>
            </label>

            <input
              id="scheduled_date"
              type="date"
              className="input"
              value={form.scheduled_date}
              onChange={(event) => set('scheduled_date', event.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <div className="admin-post-form-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancelar
        </button>

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? (
            'Salvando…'
          ) : isEdit ? (
            <>
              <Icon name="check" size={16} />
              Salvar alterações
            </>
          ) : (
            <>
              <Icon name="plus" size={16} />
              Criar post
            </>
          )}
        </button>
      </div>
    </form>
  );
}