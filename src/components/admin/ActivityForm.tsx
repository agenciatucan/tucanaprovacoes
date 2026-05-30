'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { createActivity, updateActivity } from '@/actions/activities';
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_LABEL,
  ACTIVITY_PRIORITIES,
  ACTIVITY_STATUSES,
  ACTIVITY_STATUS_LABEL,
  type ActivityInput,
} from '@/lib/validations/schemas';

interface Client {
  id: string;
  name: string | null;
  company_name: string | null;
}

interface TeamMember {
  id: string;
  name: string | null;
  role: string;
}

interface ActivityFormProps {
  clients: Client[];
  teamMembers: TeamMember[];
  defaultValues?: Partial<ActivityInput & { id: string }>;
  returnHref?: string;
}

const PRIORITY_LABEL: Record<string, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente',
};

export default function ActivityForm({
  clients,
  teamMembers,
  defaultValues,
  returnHref = '/admin/atividades',
}: ActivityFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(defaultValues?.id);

  const [form, setForm] = useState<ActivityInput>({
    title:          defaultValues?.title          ?? '',
    description:    defaultValues?.description    ?? null,
    client_id:      defaultValues?.client_id      ?? null,
    responsible_id: defaultValues?.responsible_id ?? null,
    category:       defaultValues?.category       ?? 'criacao',
    priority:       defaultValues?.priority       ?? 'media',
    status:         defaultValues?.status         ?? 'entrada',
    due_date:       defaultValues?.due_date       ?? null,
    visibility:     defaultValues?.visibility     ?? 'interna',
  });

  function update<K extends keyof ActivityInput>(key: K, value: ActivityInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = isEdit && defaultValues?.id
        ? await updateActivity(defaultValues.id, form)
        : await createActivity(form);

      if (!result.success) { setError(result.error); return; }
      router.push(returnHref as Route);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card card-lg" style={{ maxWidth: 720, borderRadius: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Título */}
        <div className="field">
          <label className="field-label" htmlFor="act-title">Título *</label>
          <input
            id="act-title" className="field-input"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Ex: Criar artes para campanha de maio"
            required maxLength={200}
          />
        </div>

        {/* Descrição */}
        <div className="field">
          <label className="field-label" htmlFor="act-desc">Descrição</label>
          <textarea
            id="act-desc" className="field-input"
            value={form.description ?? ''}
            onChange={(e) => update('description', e.target.value || null)}
            placeholder="Detalhe o que precisa ser feito..."
            rows={3} maxLength={2000}
            style={{ resize: 'vertical', minHeight: 80 }}
          />
        </div>

        {/* Categoria + Prioridade */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label className="field-label" htmlFor="act-cat">Categoria *</label>
            <select id="act-cat" className="field-input"
              value={form.category}
              onChange={(e) => update('category', e.target.value as ActivityInput['category'])}>
              {ACTIVITY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{ACTIVITY_CATEGORY_LABEL[cat] ?? cat}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="act-pri">Prioridade *</label>
            <select id="act-pri" className="field-input"
              value={form.priority}
              onChange={(e) => update('priority', e.target.value as ActivityInput['priority'])}>
              {ACTIVITY_PRIORITIES.map((p) => (
                <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status + Prazo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label className="field-label" htmlFor="act-status">Status *</label>
            <select id="act-status" className="field-input"
              value={form.status}
              onChange={(e) => update('status', e.target.value as ActivityInput['status'])}>
              {ACTIVITY_STATUSES.map((s) => (
                <option key={s} value={s}>{ACTIVITY_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="act-due">Prazo</label>
            <input id="act-due" type="date" className="field-input"
              value={form.due_date ?? ''}
              onChange={(e) => update('due_date', e.target.value || null)} />
          </div>
        </div>

        {/* Cliente + Responsável */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label className="field-label" htmlFor="act-client">Cliente (opcional)</label>
            <select id="act-client" className="field-input"
              value={form.client_id ?? ''}
              onChange={(e) => update('client_id', e.target.value || null)}>
              <option value="">Nenhum (tarefa interna)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.company_name ?? c.name ?? 'Sem nome'}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="act-resp">Responsável</label>
            <select id="act-resp" className="field-input"
              value={form.responsible_id ?? ''}
              onChange={(e) => update('responsible_id', e.target.value || null)}>
              <option value="">Não definido</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name ?? 'Sem nome'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Visibilidade */}
        <div className="field">
          <label className="field-label">Visibilidade</label>
          <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            {(['interna', 'cliente'] as const).map((v) => (
              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="radio" name="visibility" value={v} checked={form.visibility === v}
                  onChange={() => update('visibility', v)} />
                {v === 'interna' ? 'Interna (só equipe)' : 'Visível ao cliente'}
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={() => router.push(returnHref as Route)} disabled={isPending}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={isPending}>
            {isPending ? (isEdit ? 'Salvando…' : 'Criando…') : (isEdit ? 'Salvar alterações' : 'Criar atividade')}
          </button>
        </div>
      </div>
    </form>
  );
}
