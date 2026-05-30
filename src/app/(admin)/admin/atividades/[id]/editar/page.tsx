import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import ActivityForm from '@/components/admin/ActivityForm';
import { Icon } from '@/components/ui/Icon';
import { deleteActivity } from '@/actions/activities';

export const metadata: Metadata = { title: 'Editar atividade' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarAtividadePage({ params }: Props) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || !['admin', 'equipe'].includes(profile.role)) redirect('/admin');

  const [{ data: activity }, { data: clients }, { data: teamMembers }] = await Promise.all([
    supabase.from('activities').select('*').eq('id', id).single(),
    supabase.from('clients').select('id, name, company_name').eq('status', 'ativo').order('name'),
    supabase.from('user_profiles').select('id, name, role').in('role', ['admin', 'equipe']).order('name'),
  ]);

  if (!activity) notFound();

  const isAdmin = profile.role === 'admin';

  // Inline server action para delete (fecha sobre `id` do escopo)
  async function handleDelete() {
    'use server';
    await deleteActivity(id);
  }

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="crumb" style={{ marginBottom: 18 }}>
        <Link href={'/admin/atividades' as Route}>Atividades</Link>
        <span>/</span>
        Editar
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">Tucan · Interno</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Editar atividade</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14, maxWidth: 480, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activity.title}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && (
            <form action={handleDelete}>
              <button
                type="submit"
                className="btn btn-ghost btn-sm"
                style={{ color: '#dc2626', fontSize: 12 }}
              >
                Excluir
              </button>
            </form>
          )}
          <Link href={'/admin/atividades' as Route} className="btn btn-ghost btn-sm">
            <Icon name="arrow-left" size={14} />
            Voltar
          </Link>
        </div>
      </div>

      <ActivityForm
        clients={clients ?? []}
        teamMembers={teamMembers ?? []}
        defaultValues={{
          id: activity.id,
          title:          activity.title,
          description:    activity.description,
          client_id:      activity.client_id,
          responsible_id: activity.responsible_id,
          category:       activity.category as any,
          priority:       activity.priority as any,
          status:         activity.status as any,
          due_date:       activity.due_date,
          visibility:     activity.visibility as any,
        }}
        returnHref="/admin/atividades"
      />
    </div>
  );
}
