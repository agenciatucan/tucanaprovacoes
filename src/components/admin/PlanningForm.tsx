'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { createPlanningSchedule } from '@/actions/planning';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

interface ClientOption { id: string; name: string | null; company_name: string | null; }

interface Props { clients: ClientOption[]; }

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function PlanningForm({ clients }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({
    client_id:  '',
    title:      '',
    month:      String(now.getMonth() + 1).padStart(2, '0'),
    year:       String(now.getFullYear()),
    notes:      '',
  });

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) { toast.error('Selecione um cliente'); return; }
    if (!form.title.trim()) { toast.error('Informe um título'); return; }

    setLoading(true);
    const month_year = `${form.year}-${form.month}`;

    const result = await createPlanningSchedule({
      client_id:  form.client_id,
      title:      form.title.trim(),
      month_year,
      notes:      form.notes || null,
    });

    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    toast.success('Planejamento criado!');
    router.push(`/admin/planejamento/${result.data.id}` as Route);
  }

  const years = [String(now.getFullYear()), String(now.getFullYear() + 1)];

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Cliente */}
      <div className="field">
        <label className="field-label" htmlFor="client_id">
          Cliente <span style={{ color: 'var(--orange)' }}>*</span>
        </label>
        <select
          id="client_id" required className="input"
          value={form.client_id}
          onChange={(e) => set('client_id', e.target.value)}
          style={{ appearance: 'none', cursor: 'pointer' }}
        >
          <option value="">Selecione o cliente</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name ?? c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Título */}
      <div className="field">
        <label className="field-label" htmlFor="title">
          Título <span style={{ color: 'var(--orange)' }}>*</span>
        </label>
        <input
          id="title" required className="input"
          placeholder="Ex.: Planejamento Junho 2025"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
        />
      </div>

      {/* Mês/Ano */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="field">
          <label className="field-label" htmlFor="month">Mês <span style={{ color: 'var(--orange)' }}>*</span></label>
          <select
            id="month" required className="input"
            value={form.month}
            onChange={(e) => set('month', e.target.value)}
            style={{ appearance: 'none', cursor: 'pointer' }}
          >
            {MONTHS.map((label, idx) => (
              <option key={idx} value={String(idx + 1).padStart(2, '0')}>{label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="year">Ano <span style={{ color: 'var(--orange)' }}>*</span></label>
          <select
            id="year" required className="input"
            value={form.year}
            onChange={(e) => set('year', e.target.value)}
            style={{ appearance: 'none', cursor: 'pointer' }}
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Notas */}
      <div className="field">
        <label className="field-label" htmlFor="notes">
          Observações <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span>
        </label>
        <textarea
          id="notes" rows={3} className="input"
          placeholder="Contexto ou diretrizes gerais do planejamento…"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>Cancelar</button>
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Criando…' : <><Icon name="plus" size={16} /> Criar planejamento</>}
        </button>
      </div>
    </form>
  );
}
