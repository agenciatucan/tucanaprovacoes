'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { createCampaign, updateCampaign } from '@/actions/campaigns';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

interface Client { id: string; name: string; company_name: string; }

interface CampaignFormProps {
  clients: Client[];
  /** Se passado, entra em modo edição */
  initial?: {
    id: string;
    client_id: string;
    name: string;
    type: string;
    start_date: string;
    end_date?: string | null;
    period_label: string;
    overview?: string | null;
  };
}

const TYPE_OPTS = [
  { value: 'mensal',    label: 'Mensal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'semanal',   label: 'Semanal' },
  { value: 'campanha',  label: 'Campanha pontual' },
];

export default function CampaignForm({ clients, initial }: CampaignFormProps) {
  const router = useRouter();
  const isEdit = !!initial;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    client_id:    initial?.client_id    ?? '',
    name:         initial?.name         ?? '',
    type:         initial?.type         ?? 'mensal',
    start_date:   initial?.start_date   ?? '',
    end_date:     initial?.end_date     ?? '',
    period_label: initial?.period_label ?? '',
    overview:     initial?.overview     ?? '',
  });

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      client_id:    form.client_id,
      name:         form.name,
      type:         form.type as 'mensal' | 'quinzenal' | 'semanal' | 'campanha',
      start_date:   form.start_date,
      end_date:     form.end_date || null,
      period_label: form.period_label,
      overview:     form.overview || null,
    };

    const result = isEdit
      ? await updateCampaign(initial!.id, payload)
      : await createCampaign(payload);

    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    toast.success(isEdit ? 'Cronograma atualizado!' : 'Cronograma criado!');

    if (!isEdit && 'data' in result) {
      router.push(`/admin/cronogramas/${(result as { success: true; data: { id: string } }).data.id}` as Route);
    } else {
      router.push(`/admin/cronogramas/${initial!.id}` as Route);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Cliente */}
      <div className="field">
        <label className="field-label" htmlFor="client_id">Cliente <span style={{ color: 'var(--orange)' }}>*</span></label>
        <select
          id="client_id" required
          className="input"
          value={form.client_id}
          onChange={(e) => set('client_id', e.target.value)}
          style={{ appearance: 'none', cursor: 'pointer' }}>
          <option value="">Selecione o cliente…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
          ))}
        </select>
      </div>

      {/* Nome */}
      <div className="field">
        <label className="field-label" htmlFor="name">Nome do cronograma <span style={{ color: 'var(--orange)' }}>*</span></label>
        <input
          id="name" required className="input"
          placeholder="Ex.: Cronograma Urologia — Junho 2026"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </div>

      {/* Tipo + Data início */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="field">
          <label className="field-label" htmlFor="type">Tipo <span style={{ color: 'var(--orange)' }}>*</span></label>
          <select id="type" required className="input" value={form.type} onChange={(e) => set('type', e.target.value)} style={{ appearance: 'none', cursor: 'pointer' }}>
            {TYPE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="start_date">Data de início <span style={{ color: 'var(--orange)' }}>*</span></label>
          <input id="start_date" type="date" required className="input" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
        </div>
      </div>

      {/* Período + Data fim */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="field">
          <label className="field-label" htmlFor="period_label">Período textual <span style={{ color: 'var(--orange)' }}>*</span></label>
          <input
            id="period_label" required className="input"
            placeholder="Ex.: 4 semanas"
            value={form.period_label}
            onChange={(e) => set('period_label', e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="end_date">Data de encerramento <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
          <input id="end_date" type="date" className="input" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
        </div>
      </div>

      {/* Visão geral estratégica */}
      <div className="field">
        <label className="field-label" htmlFor="overview">Visão geral estratégica <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
        <textarea
          id="overview" rows={4} className="input"
          placeholder="Conteúdo educativo e estratégico para aprovação de temas, objetivos, conceitos criativos e legendas sugeridas."
          value={form.overview}
          onChange={(e) => set('overview', e.target.value)}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>Cancelar</button>
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Salvando…' : isEdit ? <><Icon name="check" size={16} /> Salvar alterações</> : <><Icon name="plus" size={16} /> Criar cronograma</>}
        </button>
      </div>
    </form>
  );
}
