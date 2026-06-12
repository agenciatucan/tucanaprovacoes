'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/Icon';
import { createActivity, updateActivity } from '@/actions/activities';
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_LABEL,
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

const PRIORITY_CONFIG: Record<
  ActivityInput['priority'],
  { label: string; dot: string; activeBorder: string; activeBg: string; activeText: string }
> = {
  alta:    { label: 'Alta',    dot: '#D97040', activeBorder: '#D97040', activeBg: '#FEF3EE', activeText: '#C05A28' },
  media:   { label: 'Média',   dot: '#E8B830', activeBorder: '#D4A024', activeBg: '#FEF8E8', activeText: '#A07010' },
  baixa:   { label: 'Baixa',   dot: '#3D8A4E', activeBorder: '#3D8A4E', activeBg: '#EEF8F0', activeText: '#2A6A38' },
  urgente: { label: 'Urgente', dot: '#dc2626', activeBorder: '#dc2626', activeBg: '#fef2f2', activeText: '#b91c1c' },
};

const PRIORITY_ORDER: ActivityInput['priority'][] = ['alta', 'media', 'baixa', 'urgente'];

const AVATAR_COLORS = ['#2C4830', '#4A7FC1', '#A33A3A', '#B07B1A', '#D97040', '#6B5B95', '#3D8A4E', '#4A90A4'];

function getDateHint(dueDate: string | null): { text: string; className: string } | null {
  if (!dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (diff < 0) return { text: `Prazo vencido há ${Math.abs(diff)} dia(s)`, className: 'is-urgent' };
  if (diff === 0) return { text: 'Vence hoje!', className: 'is-urgent' };
  if (diff <= 3) return { text: `Vence em ${diff} dia(s) — urgente`, className: 'is-urgent' };
  if (diff <= 7) return { text: `Vence em ${diff} dias`, className: '' };
  return { text: `Vence em ${diff} dias`, className: 'is-ok' };
}

export default function ActivityForm({
  clients,
  teamMembers,
  defaultValues,
  returnHref = '/admin/atividades',
}: ActivityFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [titleError, setTitleError] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
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

    if (!form.title.trim()) {
      setTitleError(true);
      titleRef.current?.focus();
      return;
    }
    setTitleError(false);

    startTransition(async () => {
      const result = isEdit && defaultValues?.id
        ? await updateActivity(defaultValues.id, form)
        : await createActivity(form);

      if (!result.success) {
        toast.error(result.error || 'Erro ao criar atividade. Tente novamente.');
        return;
      }

      toast.success(isEdit ? 'Atividade atualizada!' : 'Atividade criada!');
      router.push(returnHref as Route);
    });
  }

  const dateHint = getDateHint(form.due_date ?? null);

  return (
    <form onSubmit={handleSubmit} className="activity-form-card">

      {/* ── Seção 1: Conteúdo ── */}
      <div className="activity-form-section">
        <div className="activity-section-label">Conteúdo</div>

        <div className="field">
          <label className="field-label" htmlFor="act-title">Título *</label>
          <input
            ref={titleRef}
            id="act-title"
            className={`input ${titleError ? 'has-error' : ''}`}
            value={form.title}
            onChange={(e) => {
              update('title', e.target.value);
              if (titleError) setTitleError(false);
            }}
            placeholder="Ex: Criar artes para campanha de maio"
            maxLength={200}
          />
          {titleError && (
            <div className="activity-field-error">O título é obrigatório.</div>
          )}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="act-desc">
            Descrição <span className="muted" style={{ fontWeight: 400, fontSize: 11 }}>(opcional)</span>
          </label>
          <textarea
            id="act-desc" className="input"
            value={form.description ?? ''}
            onChange={(e) => update('description', e.target.value || null)}
            placeholder="Detalhe o que precisa ser feito..."
            rows={3} maxLength={2000}
          />
        </div>
      </div>

      {/* ── Seção 2: Classificação ── */}
      <div className="activity-form-section">
        <div className="activity-section-label">Classificação</div>

        <div className="field">
          <label className="field-label">Prioridade *</label>
          <div className="activity-chip-group">
            {PRIORITY_ORDER.map((p) => {
              const cfg = PRIORITY_CONFIG[p];
              const selected = form.priority === p;
              return (
                <button
                  key={p}
                  type="button"
                  className={`activity-chip ${selected ? 'is-selected' : ''}`}
                  style={selected ? {
                    borderColor: cfg.activeBorder,
                    background: cfg.activeBg,
                    color: cfg.activeText,
                  } : undefined}
                  onClick={() => update('priority', p)}
                >
                  <span className="activity-chip-dot" style={{ background: cfg.dot }} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="activity-field-grid">
          <div className="field">
            <label className="field-label" htmlFor="act-cat">Categoria *</label>
            <select id="act-cat" className="input"
              value={form.category}
              onChange={(e) => update('category', e.target.value as ActivityInput['category'])}>
              {ACTIVITY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{ACTIVITY_CATEGORY_LABEL[cat] ?? cat}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="act-status">Status *</label>
            <select id="act-status" className="input"
              value={form.status}
              onChange={(e) => update('status', e.target.value as ActivityInput['status'])}>
              {ACTIVITY_STATUSES.map((s) => (
                <option key={s} value={s}>{ACTIVITY_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="act-due">Prazo</label>
            <input id="act-due" type="date" className="input"
              value={form.due_date ?? ''}
              onChange={(e) => update('due_date', e.target.value || null)} />
            {dateHint && (
              <div className={`activity-date-hint ${dateHint.className}`}>{dateHint.text}</div>
            )}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="act-client">
              Cliente <span className="muted" style={{ fontWeight: 400, fontSize: 11 }}>(opcional)</span>
            </label>
            <select id="act-client" className="input"
              value={form.client_id ?? ''}
              onChange={(e) => update('client_id', e.target.value || null)}>
              <option value="">Nenhum (tarefa interna)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.company_name ?? c.name ?? 'Sem nome'}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Seção 3: Atribuição ── */}
      <div className="activity-form-section">
        <div className="activity-section-label">Atribuição</div>

        <div className="field">
          <label className="field-label">Responsável</label>
          <div className="activity-avatar-grid">
            <button
              type="button"
              className={`activity-avatar-opt ${!form.responsible_id ? 'is-selected' : ''}`}
              onClick={() => update('responsible_id', null)}
              style={{ opacity: form.responsible_id ? 0.4 : 1 }}
            >
              <div className="activity-avatar-bubble" style={{ background: '#CCC' }}>
                <Icon name="user" size={16} color="#fff" />
              </div>
              <span className="activity-avatar-name">Nenhum</span>
            </button>

            {teamMembers.map((m, i) => {
              const selected = form.responsible_id === m.id;
              const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
              const initial = (m.name ?? '?').trim().charAt(0).toUpperCase();
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`activity-avatar-opt ${selected ? 'is-selected' : ''}`}
                  onClick={() => update('responsible_id', m.id)}
                >
                  <div className="activity-avatar-bubble" style={{ background: color }}>{initial}</div>
                  <span className="activity-avatar-name">{m.name ?? 'Sem nome'}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="field">
          <label className="field-label">Visibilidade</label>
          <div className="activity-vis-toggle">
            <button
              type="button"
              className={`activity-vis-opt team ${form.visibility === 'interna' ? 'is-selected' : ''}`}
              onClick={() => update('visibility', 'interna')}
            >
              Só equipe
            </button>
            <button
              type="button"
              className={`activity-vis-opt client ${form.visibility === 'cliente' ? 'is-selected' : ''}`}
              onClick={() => update('visibility', 'cliente')}
            >
              Visível ao cliente
            </button>
          </div>
          <div className="muted tiny" style={{ marginTop: 7 }}>
            {form.visibility === 'interna'
              ? 'Esta atividade não será exibida na área do cliente.'
              : 'O cliente poderá ver esta atividade na área dele.'}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="activity-form-footer">
        <button type="button" className="btn btn-ghost" onClick={() => router.push(returnHref as Route)} disabled={isPending}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {!isPending && <Icon name={isEdit ? 'check' : 'plus'} size={15} color="#fff" />}
          {isPending ? (isEdit ? 'Salvando…' : 'Criando…') : (isEdit ? 'Salvar alterações' : 'Criar atividade')}
        </button>
      </div>
    </form>
  );
}
