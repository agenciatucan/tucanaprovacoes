import { Metadata } from 'next';
import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import ResolveCommentButton from '@/components/admin/ResolveCommentButton';
import FilterSelect from '@/components/ui/FilterSelect';

export const metadata: Metadata = { title: 'Observações' };

export default async function ObservacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; cliente?: string }>;
}) {
  const { status: filterStatus, cliente: filterCliente } = await searchParams;
  const supabase = await getSupabaseServerClient();

  let query = supabase
    .from('comments_history')
    .select(`
      id, message, status, created_at, resolved_at,
      user_profiles(name),
      campaigns(id, name),
      content_items(id, title, format),
      clients(id, name, company_name)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (filterStatus && filterStatus !== 'todos') {
    query = query.eq('status', filterStatus);
  } else {
    // Por padrão mostra as abertas primeiro
    query = query.eq('status', 'aberta');
  }

  if (filterCliente) {
    query = query.eq('client_id', filterCliente);
  }

  const { data: comments } = await query;

  const { data: clients } = await supabase
    .from('clients').select('id, name, company_name').eq('status', 'ativo').order('name');

  const total = comments?.length ?? 0;
  const showing = filterStatus === 'resolvida' ? 'Resolvidas' : 'Abertas';

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div className="eyebrow">Tucan · Interno</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Observações</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>{total} {showing.toLowerCase()} encontradas</p>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'aberta',    label: 'Abertas' },
            { key: 'resolvida', label: 'Resolvidas' },
            { key: 'todos',     label: 'Todas' },
          ].map((f) => {
            const active = (!filterStatus && f.key === 'aberta') || filterStatus === f.key;
            return (
              <Link
                key={f.key}
                href={f.key === 'aberta' ? '/admin/observacoes' : `/admin/observacoes?status=${f.key}`}
                className="chip"
                style={{ textDecoration: 'none', height: 30, background: active ? 'var(--green)' : undefined, color: active ? '#fff' : undefined }}>
                {f.label}
              </Link>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        {/* Filter by client */}
        {clients && clients.length > 0 && (
          <FilterSelect
            basePath="/admin/observacoes"
            paramName="cliente"
            value={filterCliente ?? ''}
            preserveParams={{ status: filterStatus !== 'aberta' ? filterStatus : undefined }}
            placeholder="Todos os clientes"
            options={clients.map((c) => ({ value: c.id, label: c.company_name || c.name || '' }))}
          />
        )}
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {total === 0 && (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <p className="muted">Nenhuma observação {showing.toLowerCase()} encontrada.</p>
          </div>
        )}

        {comments?.map((c) => {
          const author = (Array.isArray(c.user_profiles) ? c.user_profiles[0] : c.user_profiles)?.name ?? 'Usuário';
          const campaign = Array.isArray(c.campaigns) ? c.campaigns[0] : c.campaigns;
          const item = Array.isArray(c.content_items) ? c.content_items[0] : c.content_items;
          const client = Array.isArray(c.clients) ? c.clients[0] : c.clients;
          const isOpen = c.status === 'aberta';

          return (
            <div key={c.id} className="card" style={{ border: isOpen ? '1px solid var(--orange-100)' : '1px solid var(--line)', background: isOpen ? 'var(--orange-50)' : '#fff' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {/* Avatar */}
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {author.slice(0, 2).toUpperCase()}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{author}</span>
                    {client && <span className="chip" style={{ fontSize: 11, height: 20 }}>{client.company_name ?? client.name}</span>}
                    {isOpen && <span className="status status-aguardando" style={{ height: 20, fontSize: 11 }}>Aberta</span>}
                    {!isOpen && <span className="status status-aprovado" style={{ height: 20, fontSize: 11 }}>Resolvida</span>}
                  </div>

                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)' }}>{c.message}</p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10, alignItems: 'center' }}>
                    <span className="muted tiny">{new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    {campaign && (
                      <Link href={`/admin/cronogramas/${campaign.id}`} className="muted tiny" style={{ color: 'var(--green)', textDecoration: 'none', fontWeight: 600 }}>
                        <Icon name="calendar" size={11} /> {campaign.name}
                      </Link>
                    )}
                    {item && (
                      <Link href={`/admin/posts/${item.id}`} className="muted tiny" style={{ color: 'var(--ink-2)', textDecoration: 'none' }}>
                        <Icon name="file" size={11} /> {item.title}
                      </Link>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {isOpen && (
                  <ResolveCommentButton commentId={c.id} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
