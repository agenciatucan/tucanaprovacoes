import { Metadata } from 'next';
import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import ClientForm from '@/components/admin/ClientForm';

export const metadata: Metadata = { title: 'Novo cliente' };

export default async function NovoClientePage() {
  const supabase = await getSupabaseServerClient();

  const { data: staffUsers } = await supabase
    .from('user_profiles')
    .select('id, name')
    .in('role', ['admin', 'equipe'])
    .order('name');

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <div className="crumb" style={{ marginBottom: 20 }}>
        <Link href="/admin/clientes">Clientes</Link>
        <span>/</span>
        Novo cliente
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1">Novo cliente</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>O e-mail do aprovador será usado para o acesso ao portal.</p>
        </div>
        <Link href="/admin/clientes" className="btn btn-ghost btn-sm">
          <Icon name="arrow-left" size={14} /> Voltar
        </Link>
      </div>

      <div className="card card-lg">
        <ClientForm staffUsers={staffUsers ?? []} />
      </div>
    </div>
  );
}
