import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireStaffOrAdmin } from '@/lib/auth/require-admin';
import { Icon } from '@/components/ui/Icon';
import PersonalTasksPanel, { type PersonalTaskItem } from '@/components/admin/PersonalTasksPanel';

export const metadata: Metadata = { title: 'Minhas tarefas' };

function formatMonthHref(date: Date) {
  return `/admin/minhas-tarefas?year=${date.getFullYear()}&month=${
    date.getMonth() + 1
  }` as Route;
}

export default async function MinhasTarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { year: yearStr, month: monthStr } = await searchParams;
  const profile = await requireStaffOrAdmin();

  const now = new Date();
  const brLocale = (opts: Intl.DateTimeFormatOptions) =>
    now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', ...opts });
  const todayYear = parseInt(brLocale({ year: 'numeric' }), 10);
  const todayMonth = parseInt(brLocale({ month: 'numeric' }), 10);
  const todayDay = parseInt(brLocale({ day: 'numeric' }), 10);

  const year = yearStr ? parseInt(yearStr) : todayYear;
  const month = monthStr ? parseInt(monthStr) - 1 : todayMonth - 1;

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  const firstStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
    lastOfMonth.getDate()
  ).padStart(2, '0')}`;

  const prevHref = formatMonthHref(new Date(year, month - 1, 1));
  const nextHref = formatMonthHref(new Date(year, month + 1, 1));

  const monthLabel = firstOfMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const monthTitle = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const supabase = await getSupabaseServerClient();

  const { data: tasksRaw } = await supabase
    .from('personal_tasks')
    .select('id, title, description, task_date, start_time, end_time, done')
    .eq('owner_id', profile.id)
    .gte('task_date', firstStr)
    .lte('task_date', lastStr)
    .order('task_date', { ascending: true })
    .order('start_time', { ascending: true });

  const tasks: PersonalTaskItem[] = (tasksRaw ?? []) as PersonalTaskItem[];

  const todayIso = `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;
  const defaultDate = year === todayYear && month === todayMonth - 1 ? todayIso : firstStr;

  const pendingCount = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 18, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">Tucan · Interno</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Minhas tarefas</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
            {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''} em {monthTitle.split(' ')[0]}
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
          <Link href={prevHref} className="calendar-nav-button" style={{ width: 38, height: 38, border: '1px solid var(--line)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'var(--ink)' }}>
            <Icon name="arrow-left" size={14} />
          </Link>

          <div style={{ minWidth: 180, textAlign: 'center', fontWeight: 800, fontSize: 15 }}>{monthTitle}</div>

          <Link href={nextHref} className="calendar-nav-button" style={{ width: 38, height: 38, border: '1px solid var(--line)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'var(--ink)' }}>
            <Icon name="arrow" size={14} />
          </Link>
        </div>

        <Link href={"/admin/minhas-tarefas" as Route} className="btn btn-ghost btn-sm">
          Hoje
        </Link>
      </div>

      <PersonalTasksPanel tasks={tasks} monthLabel={monthTitle} defaultDate={defaultDate} />
    </div>
  );
}
