import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import CampaignForm from '@/components/admin/CampaignForm';

export const metadata: Metadata = { title: 'Editar cronograma' };

interface Props { params: Promise<{ id: string }>; }

export default async function EditarCronogramaPage({ params }: Props) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const [{ data: campaign }, { data: clients }] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', id).single(),
    supabase.from('clients').select('id, name, company_name').eq('status', 'ativo').order('name'),
  ]);

  if (!campaign) notFound();

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <div className="crumb" style={{ marginBottom: 20 }}>
        <Link href="/admin/cronogramas">Cronogramas</Link>
        <span>/</span>
        <Link href={`/admin/cronogramas/${id}`}>{campaign.name}</Link>
        <span>/</span>
        Editar
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1">Editar cronograma</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>Atualize as informações do cronograma.</p>
        </div>
        <Link href={`/admin/cronogramas/${id}`} className="btn btn-ghost btn-sm">
          <Icon name="arrow-left" size={14} /> Voltar
        </Link>
      </div>

      <div className="card card-lg">
        <CampaignForm
          clients={clients ?? []}
          initial={{
            id: campaign.id,
            client_id: campaign.client_id,
            name: campaign.name,
            type: campaign.type,
            start_date: campaign.start_date,
            end_date: campaign.end_date,
            period_label: campaign.period_label,
            overview: campaign.overview,
          }}
        />
      </div>
    </div>
  );
}
