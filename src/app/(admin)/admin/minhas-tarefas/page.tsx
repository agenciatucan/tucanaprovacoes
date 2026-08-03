import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireStaffOrAdmin } from '@/lib/auth/require-admin';
import { Icon } from '@/components/ui/Icon';
import PersonalTasksPanel, { type PersonalTaskItem, type WeekDay } from '@/components/admin/PersonalTasksPanel';

export const metadata: Metadata = { title: 'Minhas tarefas' };

const WEEKDAY_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function formatWeekHref(date: Date) {
  return `/admin/minhas-tarefas?date=${toIso(date)}` as Route;
}

export default async function MinhasTarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const profile = await requireStaffOrAdmin();

  const now = new Date();
  const brLocale = (opts: Intl.DateTimeFormatOptions) =>
    now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', ...opts });
  const todayYear = parseInt(brLocale({ year: 'numeric' }), 10);
  const todayMonth = parseInt(brLocale({ month: 'numeric' }), 10);
  const todayDay = parseInt(brLocale({ day: 'numeric' }), 10);
  const todayIso = `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;

  let referenceDate = new Date(todayYear, todayMonth - 1, todayDay);
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const y = parseInt(dateParam.slice(0, 4), 10);
    const m = parseInt(dateParam.slice(5, 7), 10);
    const d = parseInt(dateParam.slice(8, 10), 10);
    referenceDate = new Date(y, m - 1, d);
  }

  const weekStart = new Date(referenceDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const weekDays: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const isoDate = toIso(d);
    return {
      isoDate,
      weekdayLabel: WEEKDAY_LABELS[i] ?? '',
      dayNumber: d.getDate(),
      isToday: isoDate === todayIso,
    };
  });

  const firstStr = weekDays[0]!.isoDate;
  const lastStr = weekDays[6]!.isoDate;

  const prevHref = formatWeekHref(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() - 7));
  const nextHref = formatWeekHref(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7));

  const startLabel = new Date(`${firstStr}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const endLabel = new Date(`${lastStr}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const weekLabel = `${startLabel.replace('.', '')} – ${endLabel.replace('.', '')}`;

  const supabase = await getSupabaseServerClient();

  const { data: tasksRaw } = await supabase
    .from('personal_tasks')
    .select('id, title, description, task_date, start_time, end_time, done, period')
    .eq('owner_id', profile.id)
    .gte('task_date', firstStr)
    .lte('task_date', lastStr)
    .order('task_date', { ascending: true })
    .order('created_at', { ascending: true });

  const tasks: PersonalTaskItem[] = (tasksRaw ?? []) as PersonalTaskItem[];

  const pendingCount = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 18, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">Tucan · Interno</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Minhas tarefas</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
            {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''} nesta semana
            {pendingCount > 0 && (
              <> · <strong style={{ color: 'var(--orange)' }}>{pendingCount} pendente{pendingCount !== 1 ? 's' : ''}</strong></>
            )}
            {doneCount > 0 && <> · {doneCount} concluída{doneCount !== 1 ? 's' : ''}</>}
          </p>
        </div>
      </div>

      <div
        className="card"
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: 12, marginBottom: 16, flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href={prevHref} style={{ width: 38, height: 38, border: '1px solid var(--line)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'var(--ink)' }}>
            <Icon name="arrow-left" size={14} />
          </Link>

          <div style={{ minWidth: 200, textAlign: 'center', fontWeight: 800, fontSize: 15 }}>{weekLabel}</div>

          <Link href={nextHref} style={{ width: 38, height: 38, border: '1px solid var(--line)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'var(--ink)' }}>
            <Icon name="arrow" size={14} />
          </Link>
        </div>

        <Link href={"/admin/minhas-tarefas" as Route} className="btn btn-ghost btn-sm">
          Hoje
        </Link>
      </div>

      <PersonalTasksPanel tasks={tasks} weekDays={weekDays} />
    </div>
  );
}
