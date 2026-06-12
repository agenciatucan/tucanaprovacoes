import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import ActivityForm from '@/components/admin/ActivityForm';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Nova atividade' };

export default async function NovaAtividadePage() {
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || !['admin', 'equipe'].includes(profile.role)) {
    redirect('/admin');
  }

  const [{ data: clients }, { data: teamMembers }] = await Promise.all([
    supabase.from('clients').select('id, name, company_name').eq('status', 'ativo').order('name'),
    supabase.from('user_profiles').select('id, name, role').in('role', ['admin', 'equipe']).order('name'),
  ]);

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div className="crumb" style={{ marginBottom: 0 }}>
          <Link href={'/admin/atividades' as Route}>Atividades</Link>
          <span>/</span>
          Nova atividade
        </div>
        <Link href={'/admin/atividades' as Route} className="btn btn-ghost btn-sm">
          <Icon name="chevron-left" size={14} />
          Voltar
        </Link>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="eyebrow">Tucan · Interno</div>
        <h1 className="h1" style={{ marginTop: 6 }}>Nova atividade</h1>
        <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
          Crie uma tarefa interna que aparecerá no Pipeline.
        </p>
      </div>

      <ActivityForm
        clients={clients ?? []}
        teamMembers={teamMembers ?? []}
        returnHref="/admin/atividades"
      />
    </div>
  );
}
