'use client';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/Icon';
import {
  createInternalEvent,
  updateInternalEvent,
  deleteInternalEvent,
  type InternalEventInput,
} from '@/actions/internal-events';

export interface InternalEventItem {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  google_event_id: string | null;
}

interface Props {
  events: InternalEventItem[];
  monthLabel: string;
  defaultDate: string;
  googleConnected: boolean;
}

const EMPTY_FORM: InternalEventInput = {
  title: '',
  description: '',
  location: '',
  event_date: '',
  start_time: '',
  end_time: '',
};

function formatEventDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function InternalEventsPanel({ events, monthLabel, defaultDate, googleConnected }: Props) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<'closed' | 'create' | string>('closed');
  const [form, setForm] = useState<InternalEventInput>(EMPTY_FORM);

  function openCreate() {
    setForm({ ...EMPTY_FORM, event_date: defaultDate });
    setMode('create');
  }

  function openEdit(event: InternalEventItem) {
    setForm({
      title: event.title,
      description: event.description ?? '',
      location: event.location ?? '',
      event_date: event.event_date,
      start_time: event.start_time ? event.start_time.slice(0, 5) : '',
      end_time: event.end_time ? event.end_time.slice(0, 5) : '',
    });
    setMode(event.id);
  }

  function closeForm() {
    setMode('closed');
    setForm(EMPTY_FORM);
  }

  // Permite que pills do calendário (#agenda-interna-novo / #agenda-interna-<id>)
  // abram o formulário certo direto, sem precisar clicar em "Novo evento" de novo.
  useEffect(() => {
    function applyHash() {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash.startsWith('agenda-interna-')) return;
      const target = hash.slice('agenda-interna-'.length);

      if (target === 'novo') {
        openCreate();
        requestAnimationFrame(() => {
          document.getElementById('agenda-interna-novo')?.scrollIntoView({ block: 'start' });
        });
        return;
      }

      const event = events.find((e) => e.id === target);
      if (event) {
        openEdit(event);
        requestAnimationFrame(() => {
          document.getElementById(`agenda-interna-${event.id}`)?.scrollIntoView({ block: 'center' });
        });
      }
    }

    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title?.trim() || !form.event_date) return;

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createInternalEvent(form)
          : await updateInternalEvent(mode, form);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(mode === 'create' ? 'Evento criado!' : 'Evento atualizado!');
      closeForm();
    });
  }

  function handleDelete(event: InternalEventItem) {
    if (!window.confirm(`Excluir o evento "${event.title}"?`)) return;

    startTransition(async () => {
      const result = await deleteInternalEvent(event.id);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success('Evento excluído.');
      }
    });
  }

  return (
    <div className="card">
      <span id="agenda-interna-novo" style={{ display: 'block', scrollMarginTop: 90 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">Agenda interna</div>
          <p className="muted tiny" style={{ marginTop: 4 }}>
            Reuniões e datas internas da Tucan em {monthLabel.split(' ')[0]}
            {googleConnected ? ' · sincronizado com o Google Agenda' : ''}
          </p>
        </div>

        {mode === 'closed' && (
          <button onClick={openCreate} className="btn btn-ghost btn-sm" style={{ color: 'var(--green)', borderColor: 'var(--green-100)' }}>
            <Icon name="plus" size={13} />
            Novo evento
          </button>
        )}
      </div>

      {mode !== 'closed' && (
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 12, background: 'var(--bg)', marginBottom: 14 }}
        >
          <input
            type="text"
            placeholder="Título da reunião/evento"
            value={form.title ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="input"
            required
          />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="date"
              value={form.event_date ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
              className="input"
              style={{ flex: '1 1 160px' }}
              required
            />
            <input
              type="time"
              value={form.start_time ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
              className="input"
              style={{ flex: '1 1 110px' }}
              placeholder="Início"
            />
            <input
              type="time"
              value={form.end_time ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
              className="input"
              style={{ flex: '1 1 110px' }}
              placeholder="Fim"
            />
          </div>

          <input
            type="text"
            placeholder="Local (opcional)"
            value={form.location ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="input"
          />

          <textarea
            placeholder="Descrição (opcional)"
            value={form.description ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="input"
            rows={2}
            style={{ resize: 'vertical' }}
          />

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={closeForm} className="btn btn-ghost btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="btn btn-primary btn-sm">
              {isPending ? 'Salvando…' : mode === 'create' ? 'Criar evento' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      )}

      {events.length === 0 ? (
        <p className="muted tiny">Nenhum evento interno em {monthLabel.split(' ')[0]}.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map((event) => (
            <div
              key={event.id}
              id={`agenda-interna-${event.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10,
                background: 'var(--bg)', border: '1px solid var(--line-soft)',
                scrollMarginTop: 90,
              }}
            >
              <div
                style={{
                  width: 44, textAlign: 'center', flexShrink: 0,
                  fontSize: 11, fontWeight: 800, color: 'var(--ink-2)',
                  textTransform: 'uppercase', lineHeight: 1.2,
                }}
              >
                {formatEventDate(event.event_date).split(' ').map((part, i) => (
                  <div key={i} style={i === 0 ? { fontSize: 16 } : { color: 'var(--muted)' }}>{part.replace('.', '')}</div>
                ))}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {event.title}
                </div>
                <div className="muted tiny" style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <span>
                    {event.start_time ? `${event.start_time.slice(0, 5)}${event.end_time ? `–${event.end_time.slice(0, 5)}` : ''}` : 'Dia inteiro'}
                    {event.location ? ` · ${event.location}` : ''}
                  </span>
                  {event.google_event_id && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      · <Icon name="link" size={11} /> Google Agenda
                    </span>
                  )}
                </div>
              </div>

              <button onClick={() => openEdit(event)} className="btn btn-ghost btn-sm" style={{ width: 32, height: 32, padding: 0 }} aria-label="Editar evento">
                <Icon name="edit" size={13} />
              </button>
              <button onClick={() => handleDelete(event)} className="btn btn-ghost btn-sm" style={{ width: 32, height: 32, padding: 0, color: '#b91c1c' }} aria-label="Excluir evento">
                <Icon name="trash" size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
