import { Metadata } from 'next';
import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import FilterSelect from '@/components/ui/FilterSelect';

export const metadata: Metadata = { title: 'Kanban' };

const COLUMNS = [
  { key: 'pendente',     label: 'Pendente',           color: 'var(--muted-2)',       bg: 'var(--bg-2)' },
  { key: 'em_revisao',   label: 'Ajustes solicitados', color: 'var(--st-revisao-fg)', bg: 'var(--st-revisao-bg)' },
  { key: 'aprovado',     label: 'Aprovado',             color: 'var(--st-aprovado-fg)',bg: 'var(--st-aprovado-bg)' },
  { key: 'em_producao',  label: 'Em produção',          color: 'var(--st-agendado-fg)',bg: 'var(--st-agendado-bg)' },
  { key: 'finalizado',   label: 'Finalizado',           color: 'var(--st-publicado-fg)',bg: 'var(--st-publicado-bg)' },
];

const FMT_LABEL: Record<string, string> = {
  reels: 'Reels', carrossel: 'Carrossel', post_estatico: 'Post estático', story: 'Story', outro: 'Outro',
};
const FMT_CLASS: Record<string, string> = {
  reels: 'fmt fmt-reels', carrossel: 'fmt fmt-carrossel',
  post_estatico: 'fmt fmt-estatico', story: 'fmt fmt-stories',
};

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; cronograma?: string }>;
}) {
  const { cliente: filterClient, cronograma: filterCampaign } = await searchParams;
  const supabase = await getSupabaseServerClient();

  let query = supabase
    .from('content_items')
    .select('id, title, format, week_label, general_status, campaign_id, campaigns(id, name, clients(name, company_name))')
    .order('order_index');

  if (filterCampaign) query = query.eq('campaign_id', filterCampaign);
  if (filterClient) query = query.eq('client_id', filterClient);

  const { data: items } = await query.limit(300);

  const { data: clients } = await supabase.from('clients').select('id, name, company_name').eq('status', 'ativo').order('name');

  // Group by status
  const grouped: Record<string, typeof items> = {};
  COLUMNS.forEach((c) => { grouped[c.key] = []; });
  items?.forEach((item) => {
    if (grouped[item.general_status]) grouped[item.general_status]!.push(item);
    else grouped['pendente']!.push(item);
  });

  return (
    <div className="page" style={{ maxWidth: 1600, paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">Tucan · Interno</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Kanban</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>Visão geral de todos os posts por status.</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '10px 14px', display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <Icon name="filter" size={14} color="var(--muted)" />
        <FilterSelect
          basePath="/admin/kanban"
          paramName="cliente"
          value={filterClient ?? ''}
          placeholder="Todos os clientes"
          style={{ minWidth: 180 }}
          options={(clients ?? []).map((c) => ({ value: c.id, label: c.company_name ?? c.name ?? '' }))}
        />
        {(filterClient || filterCampaign) && (
          <Link href="/admin/kanban" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
            Limpar filtros
          </Link>
        )}
        <div style={{ flex: 1 }} />
        <span className="muted tiny">{items?.length ?? 0} posts</span>
      </div>

      {/* Kanban board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, alignItems: 'start' }}>
        {COLUMNS.map((col) => {
          const colItems = grouped[col.key] ?? [];
          return (
            <div key={col.key}>
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 12px', borderRadius: 10, background: col.bg }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: col.color, flex: 1 }}>{col.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: col.color, opacity: 0.7 }}>{colItems.length}</span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {colItems.map((item) => {
                  const campaign = Array.isArray(item.campaigns) ? item.campaigns[0] : item.campaigns;
                  const client = Array.isArray(campaign?.clients) ? campaign?.clients[0] : campaign?.clients;
                  return (
                    <Link
                      key={item.id}
                      href={`/admin/posts/${item.id}`}
                      className="card"
                      style={{ padding: 12, textDecoration: 'none', color: 'inherit', display: 'block', transition: 'box-shadow .15s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
                        <span className={FMT_CLASS[item.format] ?? 'fmt'} style={{ fontSize: 11 }}>{FMT_LABEL[item.format] ?? item.format}</span>
                        <span className="chip" style={{ fontSize: 10, height: 18, background: 'var(--bg-2)' }}>{item.week_label}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{item.title}</div>
                      <div className="muted tiny" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {client?.company_name ?? client?.name ?? '—'}
                      </div>
                    </Link>
                  );
                })}

                {colItems.length === 0 && (
                  <div style={{ padding: '16px 12px', borderRadius: 10, border: '2px dashed var(--line)', textAlign: 'center' }}>
                    <span className="muted tiny">Nenhum post</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
