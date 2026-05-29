'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { createCampaign, updateCampaign } from '@/actions/campaigns';
import { Icon } from '@/components/ui/Icon';
import ArchiveCampaignButton from '@/components/admin/ArchiveCampaignButton';
import { toast } from 'sonner';

const TYPE_OPTIONS = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'campanha', label: 'Campanha' },
];

interface ClientOption {
  id: string;
  name: string | null;
  company_name: string | null;
}

interface Props {
  clients: ClientOption[];
  initial?: {
    id: string;
    client_id: string;
    name: string;
    type: string;
    status?: string | null;
    start_date: string | null;
    end_date: string | null;
    period_label: string;
    overview?: string | null;
  };
}

export default function CampaignForm({ clients, initial }: Props) {
  const router = useRouter();

  const isEdit = Boolean(initial);
  const isArchived = initial?.status === 'arquivado';

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    client_id: initial?.client_id ?? clients[0]?.id ?? '',
    name: initial?.name ?? '',
    type: initial?.type ?? 'mensal',
    start_date: initial?.start_date ?? '',
    end_date: initial?.end_date ?? '',
    period_label: initial?.period_label ?? '',
    overview: initial?.overview ?? '',
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleCancel() {
    if (initial?.id) {
      router.push(`/admin/cronogramas/${initial.id}` as Route);
      return;
    }

    router.push('/admin/cronogramas' as Route);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isArchived) {
      toast.error('Este cronograma está arquivado e não pode ser editado.');
      return;
    }

    setLoading(true);

    const payload = {
      client_id: form.client_id,
      name: form.name,
      type: form.type as 'mensal' | 'semanal' | 'quinzenal' | 'campanha',
      start_date: form.start_date,
      end_date: form.end_date || null,
      period_label: form.period_label,
      overview: form.overview || null,
    };

    if (initial?.id) {
      const result = await updateCampaign(initial.id, payload);

      if (!result.success) {
        toast.error(result.error);
        setLoading(false);
        return;
      }

      toast.success('Cronograma atualizado!');

      setLoading(false);

      router.push(`/admin/cronogramas/${initial.id}` as Route);
      router.refresh();

      return;
    }

    const result = await createCampaign(payload);

    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    toast.success('Cronograma criado!');

    setLoading(false);

    router.push(`/admin/cronogramas/${result.data.id}` as Route);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        padding: 28,
        borderRadius: 18,
      }}
    >
      {isArchived && (
        <div
          style={{
            borderRadius: 14,
            border: '1px solid #fde68a',
            background: '#fffbeb',
            padding: '12px 14px',
            fontSize: 13,
            color: '#92400e',
            lineHeight: 1.5,
          }}
        >
          <strong>Este cronograma está arquivado.</strong>
          <br />
          Ele não aparece para o cliente e não pode ser editado.
        </div>
      )}

      <div className="field">
        <label className="field-label" htmlFor="client_id">
          Cliente <span style={{ color: 'var(--orange)' }}>*</span>
        </label>

        <select
          id="client_id"
          required
          className="input"
          value={form.client_id}
          onChange={(e) => set('client_id', e.target.value)}
          disabled={loading || isArchived}
          style={{
            appearance: 'none',
            cursor: loading || isArchived ? 'not-allowed' : 'pointer',
          }}
        >
          <option value="">Selecione um cliente</option>

          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.company_name ?? client.name ?? 'Cliente sem nome'}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="name">
          Nome do cronograma <span style={{ color: 'var(--orange)' }}>*</span>
        </label>

        <input
          id="name"
          required
          className="input"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Ex.: Cronograma Junho"
          disabled={loading || isArchived}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <div className="field">
          <label className="field-label" htmlFor="type">
            Tipo <span style={{ color: 'var(--orange)' }}>*</span>
          </label>

          <select
            id="type"
            required
            className="input"
            value={form.type}
            onChange={(e) => set('type', e.target.value)}
            disabled={loading || isArchived}
            style={{
              appearance: 'none',
              cursor: loading || isArchived ? 'not-allowed' : 'pointer',
            }}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="start_date">
            Data de início <span style={{ color: 'var(--orange)' }}>*</span>
          </label>

          <input
            id="start_date"
            required
            type="date"
            className="input"
            value={form.start_date}
            onChange={(e) => set('start_date', e.target.value)}
            disabled={loading || isArchived}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <div className="field">
          <label className="field-label" htmlFor="period_label">
            Período textual <span style={{ color: 'var(--orange)' }}>*</span>
          </label>

          <input
            id="period_label"
            required
            className="input"
            value={form.period_label}
            onChange={(e) => set('period_label', e.target.value)}
            placeholder="Ex.: 4 semanas"
            disabled={loading || isArchived}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="end_date">
            Data de encerramento{' '}
            <span className="muted" style={{ fontWeight: 400 }}>
              (opcional)
            </span>
          </label>

          <input
            id="end_date"
            type="date"
            className="input"
            value={form.end_date}
            onChange={(e) => set('end_date', e.target.value)}
            disabled={loading || isArchived}
          />
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="overview">
          Visão geral estratégica{' '}
          <span className="muted" style={{ fontWeight: 400 }}>
            (opcional)
          </span>
        </label>

        <textarea
          id="overview"
          rows={5}
          className="input"
          value={form.overview}
          onChange={(e) => set('overview', e.target.value)}
          placeholder="Descreva a estratégia, objetivo e observações gerais deste cronograma..."
          disabled={loading || isArchived}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingTop: 4,
          flexWrap: 'wrap',
        }}
      >
        {initial?.id && (
          <ArchiveCampaignButton
            campaignId={initial.id}
            disabled={loading || isArchived}
          />
        )}

        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={loading || isArchived}
          className="btn btn-primary"
        >
          {loading ? (
            'Salvando…'
          ) : (
            <>
              <Icon name="check" size={16} />
              {isEdit ? 'Salvar alterações' : 'Criar cronograma'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}