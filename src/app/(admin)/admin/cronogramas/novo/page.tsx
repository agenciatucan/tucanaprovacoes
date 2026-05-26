import { Metadata } from 'next';
import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import CampaignForm from '@/components/admin/CampaignForm';

export const metadata: Metadata = { title: 'Novo cronograma' };

export default async function NovoCronogramaPage() {
  const supabase = await getSupabaseServerClient();

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, company_name')
    .eq('status', 'ativo')
    .order('name');

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      {/* Breadcrumb */}
      <div className="crumb" style={{ marginBottom: 20 }}>
        <Link href="/admin/cronogramas">Cronogramas</Link>
        <span>/</span>
        Novo cronograma
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1">Novo cronograma</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>Preencha as informações para criar um novo cronograma de aprovação.</p>
        </div>
        <Link href="/admin/cronogramas" className="btn btn-ghost btn-sm">
          <Icon name="arrow-left" size={14} /> Voltar
        </Link>
      </div>

      <div className="card card-lg">
        {(!clients || clients.length === 0) ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <p className="muted" style={{ marginBottom: 12 }}>Nenhum cliente ativo. Crie um cliente primeiro.</p>
            <Link href="/admin/clientes/novo" className="btn btn-primary">
              <Icon name="plus" size={16} /> Novo cliente
            </Link>
          </div>
        ) : (
          <CampaignForm clients={clients ?? []} />
        )}
      </div>
    </div>
  );
}
