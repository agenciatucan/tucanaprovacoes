'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { createContentItem, updateContentItem } from '@/actions/content-items';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

const FORMAT_OPTS = [
  { value: 'reels',        label: 'Reels' },
  { value: 'carrossel',    label: 'Carrossel' },
  { value: 'post_estatico',label: 'Post estático' },
  { value: 'story',        label: 'Story' },
  { value: 'outro',        label: 'Outro' },
];

// Fallback usado apenas quando ainda não há posts no cronograma
const DEFAULT_WEEK_SUGGESTIONS = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5'];

interface PostFormProps {
  campaignId: string;
  returnHref: string;
  /** Semanas que já existem no cronograma — passadas pela Server Page */
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
  };
}

export default function PostForm({ campaignId, returnHref, existingWeeks, initial }: PostFormProps) {
  const router = useRouter();
  const isEdit = !!initial;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    campaign_id:      initial?.campaign_id      ?? campaignId,
    // Padrão: semana do post (edição), ou última semana existente, ou 'Semana 1'
    week_label:       initial?.week_label       ?? existingWeeks?.at(-1) ?? 'Semana 1',
    order_index:      initial?.order_index      ?? 0,
    format:           initial?.format           ?? 'post_estatico',
    title:            initial?.title            ?? '',
    theme:            initial?.theme            ?? '',
    objective:        initial?.objective        ?? '',
    creative_concept: initial?.creative_concept ?? '',
    caption:          initial?.caption          ?? '',
    script:           initial?.script           ?? '',
    reference_url:    initial?.reference_url    ?? '',
    internal_notes:   initial?.internal_notes   ?? '',
  });

  function set(key: string, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Envia strings vazias para campos opcionais — o schema Zod (OPTIONAL_TEXT)
    // aceita "" e transforma para null. NÃO enviar null diretamente porque
    // o Zod rejeita null em campos definidos como optional() (não nullable()).
    const payload = {
      campaign_id:      form.campaign_id,
      week_label:       form.week_label,
      order_index:      Number(form.order_index),
      format:           form.format as 'reels' | 'carrossel' | 'post_estatico' | 'story' | 'outro',
      title:            form.title,
      theme:            form.theme,
      objective:        form.objective,
      creative_concept: form.creative_concept,
      caption:          form.caption,
      script:           form.script,
      reference_url:    form.reference_url,
      internal_notes:   form.internal_notes,
    };

    const result = isEdit
      ? await updateContentItem(initial!.id, payload)
      : await createContentItem(payload);

    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    toast.success(isEdit ? 'Post atualizado!' : 'Post criado!');
    router.push(returnHref as Route);
  }

  const isReels = form.format === 'reels';

  // Sugestões do datalist: semanas existentes primeiro (para facilitar reusar),
  // depois as padrão que ainda não estiverem na lista.
  // Assim o usuário sempre vê pelo menos Semana 1–5 e também as já criadas.
  const weekOptions = [
    ...new Set([...(existingWeeks ?? []), ...DEFAULT_WEEK_SUGGESTIONS]),
  ];

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Semana + Formato + Ordem */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 16 }}>
        <div className="field">
          <label className="field-label" htmlFor="week_label">Semana <span style={{ color: 'var(--orange)' }}>*</span></label>
          <input
            id="week_label" required list="week-suggestions" className="input"
            placeholder="Ex.: Semana 1"
            value={form.week_label}
            onChange={(e) => set('week_label', e.target.value)}
          />
          <datalist id="week-suggestions">
            {weekOptions.map((w) => <option key={w} value={w} />)}
          </datalist>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="format">Formato <span style={{ color: 'var(--orange)' }}>*</span></label>
          <select id="format" required className="input" value={form.format} onChange={(e) => set('format', e.target.value)} style={{ appearance: 'none', cursor: 'pointer' }}>
            {FORMAT_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="order_index">Ordem</label>
          <input id="order_index" type="number" min={0} className="input" value={form.order_index} onChange={(e) => set('order_index', parseInt(e.target.value) || 0)} />
        </div>
      </div>

      {/* Título */}
      <div className="field">
        <label className="field-label" htmlFor="title">Título do post <span style={{ color: 'var(--orange)' }}>*</span></label>
        <input
          id="title" required className="input"
          placeholder="Ex.: Por que fazer check-up anual?"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
        />
      </div>

      {/* Tema + Objetivo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="field">
          <label className="field-label" htmlFor="theme">Tema</label>
          <input id="theme" className="input" placeholder="Tema principal do post" value={form.theme} onChange={(e) => set('theme', e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="objective">Objetivo</label>
          <input id="objective" className="input" placeholder="Objetivo de comunicação" value={form.objective} onChange={(e) => set('objective', e.target.value)} />
        </div>
      </div>

      {/* Conceito criativo */}
      <div className="field">
        <label className="field-label" htmlFor="creative_concept">Conceito criativo</label>
        <textarea id="creative_concept" rows={3} className="input" placeholder="Descreva o conceito criativo e abordagem visual…" value={form.creative_concept} onChange={(e) => set('creative_concept', e.target.value)} />
      </div>

      {/* Legenda sugerida */}
      <div className="field">
        <label className="field-label" htmlFor="caption">Legenda sugerida</label>
        <textarea id="caption" rows={5} className="input" placeholder="Texto completo da legenda para o cliente aprovar…" value={form.caption} onChange={(e) => set('caption', e.target.value)} />
      </div>

      {/* Roteiro (apenas Reels) */}
      {isReels && (
        <div className="field">
          <label className="field-label" htmlFor="script">Roteiro <span style={{ color: 'var(--orange)' }}>*</span></label>
          <textarea id="script" rows={5} className="input" placeholder="Roteiro completo para o Reels (cenas, falas, referências visuais)…" value={form.script} onChange={(e) => set('script', e.target.value)} />
        </div>
      )}

      {/* Referência + Notas internas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="field">
          <label className="field-label" htmlFor="reference_url">URL de referência <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
          <input id="reference_url" type="url" className="input" placeholder="https://…" value={form.reference_url} onChange={(e) => set('reference_url', e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="internal_notes">Notas internas <span className="muted" style={{ fontWeight: 400 }}>(não visível ao cliente)</span></label>
          <input id="internal_notes" className="input" placeholder="Observações para a equipe…" value={form.internal_notes} onChange={(e) => set('internal_notes', e.target.value)} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button type="button" className="btn btn-ghost" onClick={() => router.push(returnHref as Route)}>Cancelar</button>
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Salvando…' : isEdit ? <><Icon name="check" size={16} /> Salvar alterações</> : <><Icon name="plus" size={16} /> Criar post</>}
        </button>
      </div>
    </form>
  );
}
