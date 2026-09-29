'use client';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/Icon';
import DatePicker from '@/components/ui/DatePicker';
import {
  createPersonalTask,
  updatePersonalTask,
  toggleTaskDone,
  deletePersonalTask,
} from '@/actions/personal-tasks';
import type { PersonalTaskItem, TaskPeriod } from '@/components/admin/PersonalTasksPanel';

const PERIOD_LABELS: Record<TaskPeriod, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

const PERIOD_ORDER: Record<TaskPeriod, number> = { manha: 0, tarde: 1, noite: 2 };
const PERIOD_COLOR: Record<TaskPeriod, string> = {
  manha: 'var(--orange)',
  tarde: 'var(--green)',
  noite: '#6d5bd0',
};

const WEEKDAY_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

interface Props {
  tasks: PersonalTaskItem[];
  monthYear: number;
  monthIndex: number; // 0-11
  todayIso: string;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function isoFor(year: number, monthIndex: number, day: number) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

export default function MonthTasksList({ tasks, monthYear, monthIndex, todayIso }: Props) {
  const [, startTransition] = useTransition();
  const [hideDone, setHideDone] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(todayIso);
  const [newPeriod, setNewPeriod] = useState<TaskPeriod>('manha');

  const visibleTasks = hideDone ? tasks.filter((t) => !t.done) : tasks;

  const groups = useMemo(() => {
    const byDate = new Map<string, PersonalTaskItem[]>();
    for (const task of visibleTasks) {
      const list = byDate.get(task.task_date) ?? [];
      list.push(task);
      byDate.set(task.task_date, list);
    }
    for (const list of byDate.values()) {
      list.sort((a, b) => PERIOD_ORDER[a.period] - PERIOD_ORDER[b.period]);
    }
    return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [visibleTasks]);

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

  function handleAdd() {
    const title = newTitle.trim();
    if (!title || !newDate) return;

    setNewTitle('');

    startTransition(async () => {
      const result = await createPersonalTask({ title, task_date: newDate, period: newPeriod });
      if (!result.success) toast.error(result.error);
    });
  }

  const monthStartIso = isoFor(monthYear, monthIndex, 1);
  const monthEndDay = new Date(monthYear, monthIndex + 1, 0).getDate();
  const monthEndIso = isoFor(monthYear, monthIndex, monthEndDay);

  return (
    <div>
      <style>
        {`
          .mtasks-add {
            display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
            padding: 12px; border-radius: 14px; margin-bottom: 14px;
          }
          .mtasks-add-input {
            flex: 1; min-width: 180px;
          }
          .mtasks-add .input {
            min-height: 38px; height: 38px; font-size: 13.5px; padding: 0 12px;
          }
          .mtasks-add-date { width: 148px; flex: none; }
          .mtasks-add-period { width: 112px; flex: none; }

          .mtasks-toolbar {
            display: flex; justify-content: flex-end; margin-bottom: 10px;
          }

          .mtasks-card {
            background: #fff; border: 1px solid var(--line); border-radius: 14px;
            overflow: hidden;
          }
          .mtasks-row {
            display: flex; align-items: stretch;
            border-bottom: 1px solid var(--line-soft);
          }
          .mtasks-row:last-child { border-bottom: none; }

          .mtasks-daybadge {
            flex-shrink: 0; width: 64px;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            gap: 1px; padding: 10px 6px;
            border-right: 1px solid var(--line-soft);
            background: var(--bg);
          }
          .mtasks-daybadge-weekday {
            font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em;
            color: var(--muted); text-transform: uppercase;
          }
          .mtasks-daybadge-num { font-size: 19px; font-weight: 800; color: var(--ink); line-height: 1.1; }
          .mtasks-row-today .mtasks-daybadge {
            background: var(--orange); border-right-color: var(--orange);
          }
          .mtasks-row-today .mtasks-daybadge-weekday,
          .mtasks-row-today .mtasks-daybadge-num { color: #fff; }

          .mtasks-daytasks {
            flex: 1; min-width: 0; display: flex; flex-direction: column;
            padding: 6px 4px;
          }

          .mtasks-item {
            display: grid; grid-template-columns: 22px 7px 1fr 20px; align-items: center;
            gap: 8px; padding: 5px 8px; border-radius: 8px;
          }
          .mtasks-item:hover { background: var(--bg); }
          .mtasks-item input[type="checkbox"] {
            width: 15px; height: 15px; cursor: pointer; accent-color: var(--green);
          }
          .mtasks-item-dot {
            width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
          }
          .mtasks-item-text {
            font-size: 13.5px; line-height: 1.4; cursor: text;
            overflow-wrap: anywhere; padding: 2px 0; min-width: 0;
          }
          .mtasks-item-text-done { text-decoration: line-through; color: var(--muted); }
          .mtasks-item-edit-input {
            font-size: 13.5px; line-height: 1.4; border: none; width: 100%;
            border-bottom: 1px solid var(--line); background: transparent;
            padding: 2px 0; font-family: inherit; color: inherit;
          }
          .mtasks-item-edit-input:focus { outline: none; border-color: var(--green); }
          .mtasks-item-del {
            opacity: 0; width: 20px; height: 20px; padding: 0;
            display: flex; align-items: center; justify-content: center;
            border-radius: 5px; background: transparent; border: none; cursor: pointer;
            color: var(--muted-2); transition: opacity .1s;
          }
          .mtasks-item:hover .mtasks-item-del { opacity: 1; }
          .mtasks-item-del:hover { background: var(--line-soft); color: #b91c1c; }

          .mtasks-empty {
            padding: 48px 20px; text-align: center; color: var(--muted); font-size: 13.5px;
            border: 1px dashed var(--line); border-radius: 14px;
          }

          @media (max-width: 620px) {
            .mtasks-item-del { opacity: 1; }
            .mtasks-add { flex-direction: column; align-items: stretch; }
            .mtasks-add-date, .mtasks-add-period { width: 100%; }
            .mtasks-daybadge { width: 48px; padding: 8px 4px; }
          }
        `}
      </style>

      <div className="mtasks-add card">
        <input
          className="input mtasks-add-input"
          placeholder="Nova tarefa do mês"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
          }}
        />
        <DatePicker
          value={newDate}
          onChange={setNewDate}
          min={monthStartIso}
          max={monthEndIso}
          className="mtasks-add-date"
        />
        <select
          className="input mtasks-add-period"
          value={newPeriod}
          onChange={(e) => setNewPeriod(e.target.value as TaskPeriod)}
        >
          {Object.entries(PERIOD_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <button onClick={handleAdd} className="btn btn-primary btn-sm">
          <Icon name="plus" size={13} /> Adicionar
        </button>
      </div>

      <div className="mtasks-toolbar">
        <button onClick={() => setHideDone((v) => !v)} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
          {hideDone ? 'Mostrar concluídas' : 'Ocultar concluídas'}
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="mtasks-empty">Nenhuma tarefa neste mês.</div>
      ) : (
        <div className="mtasks-card">
          {groups.map(([dateIso, dayTasks]) => {
            const d = new Date(`${dateIso}T00:00:00`);
            const isToday = dateIso === todayIso;

            return (
              <div key={dateIso} className={`mtasks-row${isToday ? ' mtasks-row-today' : ''}`}>
                <div className="mtasks-daybadge">
                  <span className="mtasks-daybadge-weekday">{WEEKDAY_SHORT[d.getDay()]}</span>
                  <span className="mtasks-daybadge-num">{d.getDate()}</span>
                </div>

                <div className="mtasks-daytasks">
                  {dayTasks.map((task) => (
                    <div key={task.id} className="mtasks-item">
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => handleToggleDone(task)}
                        aria-label={task.done ? 'Marcar como pendente' : 'Marcar como concluída'}
                      />

                      <span
                        className="mtasks-item-dot"
                        style={{ background: PERIOD_COLOR[task.period] }}
                        title={PERIOD_LABELS[task.period]}
                      />

                      {editingId === task.id ? (
                        <input
                          className="mtasks-item-edit-input"
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
                          className={`mtasks-item-text${task.done ? ' mtasks-item-text-done' : ''}`}
                          onClick={() => startEdit(task)}
                        >
                          {task.title}
                        </span>
                      )}

                      <button onClick={() => handleDelete(task)} className="mtasks-item-del" aria-label="Excluir tarefa">
                        <Icon name="x" size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
