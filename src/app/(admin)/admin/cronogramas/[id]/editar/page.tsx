import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import CampaignForm from '@/components/admin/CampaignForm';

export const metadata: Metadata = { title: 'Editar cronograma' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarCronogramaPage({ params }: Props) {
  const { id } = await params;

  const supabase = await getSupabaseServerClient();

  const [{ data: campaign }, { data: clients }] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', id).single(),
    supabase
      .from('clients')
      .select('id, name, company_name')
      .eq('status', 'ativo')
      .order('name'),
  ]);

  if (!campaign) {
    notFound();
  }

  return (
    <div className="page" style={{ maxWidth: 860, paddingBottom: 60 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 26,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            className="muted"
            style={{
              fontSize: 13,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: 14,
            }}
          >
            <Link
              href="/admin/cronogramas"
              style={{
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              Cronogramas
            </Link>

            <span>/</span>

            <Link
              href={`/admin/cronogramas/${id}` as Route}
              style={{
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              {campaign.name}
            </Link>

            <span>/</span>

            <span>Editar</span>
          </div>

          <h1 className="h1" style={{ fontSize: 30 }}>
            Editar cronograma
          </h1>

          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
            Atualize as informações do cronograma.
          </p>
        </div>

        <Link
          href={`/admin/cronogramas/${id}` as Route}
          className="btn btn-ghost btn-sm"
          style={{
            marginTop: 44,
          }}
        >
          ← Voltar
        </Link>
      </div>

      <CampaignForm
        clients={clients ?? []}
        initial={{
          id: campaign.id,
          client_id: campaign.client_id,
          name: campaign.name,
          type: campaign.type,
          status: campaign.status,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          period_label: campaign.period_label,
          overview: campaign.overview,
        }}
      />
    </div>
  );
}