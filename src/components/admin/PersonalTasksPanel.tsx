'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/Icon';
import {
  createPersonalTask,
  updatePersonalTask,
  toggleTaskDone,
  deletePersonalTask,
} from '@/actions/personal-tasks';

export type TaskPeriod = 'manha' | 'tarde' | 'noite';

export interface PersonalTaskItem {
  id: string;
  title: string;
  description: string | null;
  task_date: string;
  start_time: string | null;
  end_time: string | null;
  done: boolean;
  period: TaskPeriod;
}

const PERIODS: { key: TaskPeriod; label: string }[] = [
  { key: 'manha', label: 'Manhã' },
  { key: 'tarde', label: 'Tarde' },
  { key: 'noite', label: 'Noite' },
];

export interface WeekDay {
  isoDate: string;
  weekdayLabel: string;
  dayNumber: number;
  isToday: boolean;
}

interface Props {
  tasks: PersonalTaskItem[];
  weekDays: WeekDay[];
}

export default function PersonalTasksPanel({ tasks, weekDays }: Props) {
  const [, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [hideDone, setHideDone] = useState(false);

  function draftKey(dayIso: string, period: TaskPeriod) {
    return `${dayIso}__${period}`;
  }

  function handleQuickAdd(dayIso: string, period: TaskPeriod) {
    const key = draftKey(dayIso, period);
    const title = (drafts[key] ?? '').trim();
    if (!title) return;

    setDrafts((d) => ({ ...d, [key]: '' }));

    startTransition(async () => {
      const result = await createPersonalTask({ title, task_date: dayIso, period });
      if (!result.success) toast.error(result.error);
    });
  }

  function startEdit(task: PersonalTaskItem) {
    setEditingId(task.id);
    setEditDraft(task.title);
  }

  function commitEdit(task: PersonalTaskItem) {
    const title = editDraft.trim();
    setEditingId(null);

    if (!title || title === task.title) return;

    startTransition(async () => {
      const result = await updatePersonalTask(task.id, {
        title,
        description: task.description,
        task_date: task.task_date,
        start_time: task.start_time,
        end_time: task.end_time,
        period: task.period,
      });
      if (!result.success) toast.error(result.error);
    });
  }

  function handleToggleDone(task: PersonalTaskItem) {
    startTransition(async () => {
      const result = await toggleTaskDone(task.id, !task.done);
      if (!result.success) toast.error(result.error);
    });
  }

  function handleDelete(task: PersonalTaskItem) {
    startTransition(async () => {
      const result = await deletePersonalTask(task.id);
      if (!result.success) toast.error(result.error);
    });
  }

  const visibleTasks = hideDone ? tasks.filter((t) => !t.done) : tasks;

  const byDay: Record<string, Record<TaskPeriod, PersonalTaskItem[]>> = {};
  for (const day of weekDays) byDay[day.isoDate] = { manha: [], tarde: [], noite: [] };
  for (const task of visibleTasks) {
    const bucket = byDay[task.task_date];
    if (bucket) bucket[task.period].push(task);
  }

  return (
    <div>
      <style>
        {`
          .ptasks-toolbar {
            display: flex; justify-content: flex-end; margin-bottom: 12px;
          }
          .ptasks-grid {
            display: grid;
            grid-template-columns: repeat(7, minmax(0, 1fr));
            gap: 10px;
          }
          .ptasks-col {
            background: #fff; border: 1px solid var(--line);
            border-radius: 14px; padding: 10px;
            display: flex; flex-direction: column; gap: 6px;
            min-height: 180px;
          }
          .ptasks-col-today { border-color: var(--orange); border-width: 2px; padding: 9px; }
          .ptasks-col-head {
            display: flex; flex-direction: column; align-items: center;
            padding-bottom: 8px; margin-bottom: 2px; border-bottom: 1px solid var(--line-soft);
          }
          .ptasks-weekday {
            font-size: 10px; font-weight: 800; letter-spacing: 0.08em;
            color: var(--muted); text-transform: uppercase;
          }
          .ptasks-daynum { font-size: 18px; font-weight: 800; margin-top: 2px; }
          .ptasks-col-today .ptasks-daynum { color: var(--orange); }

          .ptasks-period {
            display: flex; flex-direction: column; gap: 2px;
            padding: 6px 0; border-bottom: 1px dashed var(--line-soft);
          }
          .ptasks-period:last-child { border-bottom: none; }
          .ptasks-period-label {
            font-size: 9px; font-weight: 800; letter-spacing: 0.06em;
            color: var(--muted-2); text-transform: uppercase; margin-bottom: 2px;
          }

          .ptasks-item {
            display: flex; align-items: flex-start; gap: 6px;
            padding: 3px 2px; border-radius: 6px;
          }
          .ptasks-item:hover { background: var(--bg); }
          .ptasks-item input[type="checkbox"] {
            margin-top: 2px; width: 15px; height: 15px; flex-shrink: 0; cursor: pointer;
            accent-color: var(--green);
          }
          .ptasks-item-text {
            flex: 1; font-size: 12.5px; line-height: 1.35; cursor: text;
            overflow-wrap: anywhere; padding: 1px 0;
          }
          .ptasks-item-text-done { text-decoration: line-through; color: var(--muted); }
          .ptasks-item-edit-input {
            flex: 1; font-size: 12.5px; line-height: 1.35; border: none;
            border-bottom: 1px solid var(--line); background: transparent;
            padding: 1px 0; font-family: inherit; color: inherit;
          }
          .ptasks-item-edit-input:focus { outline: none; border-color: var(--green); }
          .ptasks-item-del {
            opacity: 0; flex-shrink: 0; width: 18px; height: 18px; padding: 0;
            display: flex; align-items: center; justify-content: center;
            border-radius: 5px; background: transparent; border: none; cursor: pointer;
            color: var(--muted-2); transition: opacity .1s;
          }
          .ptasks-item:hover .ptasks-item-del { opacity: 1; }
          .ptasks-item-del:hover { background: var(--line-soft); color: #b91c1c; }

          .ptasks-additem {
            display: flex; align-items: center; gap: 6px;
            padding: 3px 2px; margin-top: 2px;
          }
          .ptasks-additem-input {
            flex: 1; font-size: 12.5px; border: none; background: transparent;
            padding: 1px 0; font-family: inherit; color: var(--ink);
          }
          .ptasks-additem-input::placeholder { color: var(--muted-2); }
          .ptasks-additem-input:focus { outline: none; }

          @media (max-width: 760px) {
            .ptasks-grid { grid-template-columns: 1fr; }
            .ptasks-col { min-height: 0; }
            .ptasks-item-del { opacity: 1; }
          }
        `}
      </style>

      <div className="ptasks-toolbar">
        <button onClick={() => setHideDone((v) => !v)} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
          {hideDone ? 'Mostrar concluídas' : 'Ocultar concluídas'}
        </button>
      </div>

      <div className="ptasks-grid">
        {weekDays.map((day) => {
          const dayPeriods = byDay[day.isoDate];

          return (
            <div key={day.isoDate} className={`ptasks-col${day.isToday ? ' ptasks-col-today' : ''}`}>
              <div className="ptasks-col-head">
                <span className="ptasks-weekday">{day.weekdayLabel}</span>
                <span className="ptasks-daynum">{day.dayNumber}</span>
              </div>

              {PERIODS.map(({ key: period, label }) => {
                const periodTasks = dayPeriods?.[period] ?? [];
                const key = draftKey(day.isoDate, period);

                return (
                  <div key={period} className="ptasks-period">
                    <span className="ptasks-period-label">{label}</span>

                    {periodTasks.map((task) => (
                      <div key={task.id} className="ptasks-item">
                        <input
                          type="checkbox"
                          checked={task.done}
                          onChange={() => handleToggleDone(task)}
                          aria-label={task.done ? 'Marcar como pendente' : 'Marcar como concluída'}
                        />

                        {editingId === task.id ? (
                          <input
                            className="ptasks-item-edit-input"
                            value={editDraft}
                            autoFocus
                            onChange={(e) => setEditDraft(e.target.value)}
                            onBlur={() => commitEdit(task)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); commitEdit(task); }
                              if (e.key === 'Escape') { e.preventDefault(); setEditingId(null); }
                            }}
                          />
                        ) : (
                          <span
                            className={`ptasks-item-text${task.done ? ' ptasks-item-text-done' : ''}`}
                            onClick={() => startEdit(task)}
                          >
                            {task.title}
                          </span>
                        )}

                        <button onClick={() => handleDelete(task)} className="ptasks-item-del" aria-label="Excluir tarefa">
                          <Icon name="x" size={11} />
                        </button>
                      </div>
                    ))}

                    <div className="ptasks-additem">
                      <span style={{ color: 'var(--muted-2)', fontSize: 13, lineHeight: 1 }}>+</span>
                      <input
                        className="ptasks-additem-input"
                        placeholder="Adicionar"
                        value={drafts[key] ?? ''}
                        onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleQuickAdd(day.isoDate, period); }
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
