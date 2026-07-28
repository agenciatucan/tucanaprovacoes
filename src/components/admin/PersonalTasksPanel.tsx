'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/Icon';
import {
  createPersonalTask,
  updatePersonalTask,
  toggleTaskDone,
  deletePersonalTask,
  type PersonalTaskInput,
} from '@/actions/personal-tasks';

export interface PersonalTaskItem {
  id: string;
  title: string;
  description: string | null;
  task_date: string;
  start_time: string | null;
  end_time: string | null;
  done: boolean;
}

interface Props {
  tasks: PersonalTaskItem[];
  monthLabel: string;
  defaultDate: string;
}

const EMPTY_FORM: PersonalTaskInput = {
  title: '',
  description: '',
  task_date: '',
  start_time: '',
  end_time: '',
};

function formatTaskDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function PersonalTasksPanel({ tasks, monthLabel, defaultDate }: Props) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<'closed' | 'create' | string>('closed');
  const [form, setForm] = useState<PersonalTaskInput>(EMPTY_FORM);
  const [hideDone, setHideDone] = useState(false);

  function openCreate() {
    setForm({ ...EMPTY_FORM, task_date: defaultDate });
    setMode('create');
  }

  function openEdit(task: PersonalTaskItem) {
    setForm({
      title: task.title,
      description: task.description ?? '',
      task_date: task.task_date,
      start_time: task.start_time ? task.start_time.slice(0, 5) : '',
      end_time: task.end_time ? task.end_time.slice(0, 5) : '',
    });
    setMode(task.id);
  }

  function closeForm() {
    setMode('closed');
    setForm(EMPTY_FORM);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title?.trim() || !form.task_date) return;

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createPersonalTask(form)
          : await updatePersonalTask(mode, form);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(mode === 'create' ? 'Tarefa criada!' : 'Tarefa atualizada!');
      closeForm();
    });
  }

  function handleToggleDone(task: PersonalTaskItem) {
    startTransition(async () => {
      const result = await toggleTaskDone(task.id, !task.done);
      if (!result.success) toast.error(result.error);
    });
  }

  function handleDelete(task: PersonalTaskItem) {
    if (!window.confirm(`Excluir a tarefa "${task.title}"?`)) return;

    startTransition(async () => {
      const result = await deletePersonalTask(task.id);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success('Tarefa excluída.');
      }
    });
  }

  const visibleTasks = hideDone ? tasks.filter((t) => !t.done) : tasks;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">Minhas tarefas</div>
          <p className="muted tiny" style={{ marginTop: 4 }}>
            Suas atividades pessoais em {monthLabel.split(' ')[0]} — visível só para você
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setHideDone((v) => !v)}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 12 }}
          >
            {hideDone ? 'Mostrar concluídas' : 'Ocultar concluídas'}
          </button>

          {mode === 'closed' && (
            <button onClick={openCreate} className="btn btn-ghost btn-sm" style={{ color: 'var(--green)', borderColor: 'var(--green-100)' }}>
              <Icon name="plus" size={13} />
              Nova tarefa
            </button>
          )}
        </div>
      </div>

      {mode !== 'closed' && (
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 12, background: 'var(--bg)', marginBottom: 14 }}
        >
          <input
            type="text"
            placeholder="Título da tarefa"
            value={form.title ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="input"
            required
          />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="date"
              value={form.task_date ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, task_date: e.target.value }))}
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
              {isPending ? 'Salvando…' : mode === 'create' ? 'Criar tarefa' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      )}

      {visibleTasks.length === 0 ? (
        <p className="muted tiny">
          {hideDone ? 'Nenhuma tarefa pendente.' : `Nenhuma tarefa em ${monthLabel.split(' ')[0]}.`}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibleTasks.map((task) => (
            <div
              key={task.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10,
                background: 'var(--bg)', border: '1px solid var(--line-soft)',
                opacity: task.done ? 0.55 : 1,
              }}
            >
              <button
                onClick={() => handleToggleDone(task)}
                className="btn btn-ghost btn-sm"
                style={{ width: 32, height: 32, padding: 0, flexShrink: 0, color: task.done ? 'var(--green)' : 'var(--muted-2)' }}
                aria-label={task.done ? 'Marcar como pendente' : 'Marcar como concluída'}
                title={task.done ? 'Marcar como pendente' : 'Marcar como concluída'}
              >
                <Icon name="check-circle" size={16} />
              </button>

              <div style={{ width: 44, textAlign: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: 'var(--ink-2)', textTransform: 'uppercase', lineHeight: 1.2 }}>
                {formatTaskDate(task.task_date).split(' ').map((part, i) => (
                  <div key={i} style={i === 0 ? { fontSize: 16 } : { color: 'var(--muted)' }}>{part.replace('.', '')}</div>
                ))}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: task.done ? 'line-through' : 'none' }}>
                  {task.title}
                </div>
                <div className="muted tiny" style={{ marginTop: 2 }}>
                  {task.start_time ? `${task.start_time.slice(0, 5)}${task.end_time ? `–${task.end_time.slice(0, 5)}` : ''}` : 'Dia inteiro'}
                </div>
              </div>

              <button onClick={() => openEdit(task)} className="btn btn-ghost btn-sm" style={{ width: 32, height: 32, padding: 0 }} aria-label="Editar tarefa">
                <Icon name="edit" size={13} />
              </button>
              <button onClick={() => handleDelete(task)} className="btn btn-ghost btn-sm" style={{ width: 32, height: 32, padding: 0, color: '#b91c1c' }} aria-label="Excluir tarefa">
                <Icon name="trash" size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
