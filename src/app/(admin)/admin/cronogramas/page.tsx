import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import SearchInput from '@/components/ui/SearchInput';

export const metadata: Metadata = { title: 'Cronogramas' };

const TYPE_LABEL: Record<string, string> = {
  mensal: 'Mensal', quinzenal: 'Quinzenal', semanal: 'Semanal', campanha: 'Campanha',
};

const STATUS_KIND: Record<string, string> = {
  rascunho: 'rascunho',
  enviado_para_aprovacao: 'aguardando',
  em_revisao: 'revisao',
  aprovado: 'aprovado',
  em_producao: 'agendado',
  finalizado: 'publicado',
  arquivado: 'rascunho',
};

export default async function AdminCronogramasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const { status: filterStatus, search: filterSearch } = await searchParams;
  const supabase = await getSupabaseServerClient();

  let query = supabase
    .from('campaigns')
    .select('id, name, type, status, period_label, created_at, updated_at, clients(id, name, company_name), content_items(id, general_status)')
    .order('updated_at', { ascending: false });

  if (filterStatus && filterStatus !== 'todos') {
    query = query.eq('status', filterStatus);
  }

  if (filterSearch?.trim()) {
    query = query.ilike('name', `%${filterSearch.trim()}%`);
  }

  const { data: campaigns } = await query;

  const filters = [
    { key: 'todos',                   label: 'Todos' },
    { key: 'rascunho',                label: 'Rascunho' },
    { key: 'enviado_para_aprovacao',  label: 'Aguardando' },
    { key: 'em_revisao',              label: 'Em revisão' },
    { key: 'aprovado',                label: 'Aprovados' },
    { key: 'em_producao',             label: 'Em produção' },
    { key: 'finalizado',              label: 'Finalizados' },
  ];

  return (
    <div className="page" style={{ maxWidth: 1320 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div className="eyebrow">Tucan · Interno</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Cronogramas</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>{campaigns?.length ?? 0} cronogramas encontrados</p>
        </div>
        <Link href="/admin/cronogramas/novo" className="btn btn-primary">
          <Icon name="plus" size={16} /> Novo cronograma
        </Link>
      </div>

      {/* Filter bar */}
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchInput
          basePath="/admin/cronogramas"
          paramName="search"
          defaultValue={filterSearch ?? ''}
          preserveParams={{ status: filterStatus && filterStatus !== 'todos' ? filterStatus : undefined }}
          placeholder="Buscar cronograma…"
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filters.map((f) => {
            const active = (!filterStatus && f.key === 'todos') || filterStatus === f.key;
            const search = filterSearch ? `&search=${filterSearch}` : '';
            const href = (f.key === 'todos'
              ? `/admin/cronogramas${filterSearch ? `?search=${filterSearch}` : ''}`
              : `/admin/cronogramas?status=${f.key}${search}`) as Route;
            return (
              <Link
                key={f.key}
                href={href}
                className="chip"
                style={{ height: 30, textDecoration: 'none', background: active ? 'var(--green)' : undefined, color: active ? '#fff' : undefined }}>
                {f.label}
              </Link>
            );
          })}
        </div>
        {(filterStatus || filterSearch) && (
          <Link href="/admin/cronogramas" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
            Limpar filtros
          </Link>
        )}
      </div>

      {/* List */}
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        {/* Head */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 0.8fr 1fr 0.9fr 60px', gap: 16, padding: '11px 20px', background: 'var(--bg)', borderBottom: '1px solid var(--line)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
          <div>Cronograma</div>
          <div>Cliente</div>
          <div>Tipo</div>
          <div>Progresso</div>
          <div>Status</div>
          <div />
        </div>

        {(!campaigns || campaigns.length === 0) && (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
            Nenhum cronograma encontrado.{' '}
            <Link href="/admin/cronogramas/novo" style={{ color: 'var(--orange)', fontWeight: 600 }}>Criar o primeiro →</Link>
          </div>
        )}

        {campaigns?.map((c, i) => {
          const client = Array.isArray(c.clients) ? c.clients[0] : c.clients;
          const items = Array.isArray(c.content_items) ? c.content_items : [];
          const total = items.length;
          const approved = items.filter((it: { general_status: string }) => ['aprovado', 'finalizado'].includes(it.general_status)).length;
          const pct = total ? Math.round((approved / total) * 100) : 0;
          const kind = STATUS_KIND[c.status] ?? 'rascunho';

          return (
            <Link
              key={c.id}
              href={`/admin/cronogramas/${c.id}`}
              style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 0.8fr 1fr 0.9fr 60px', gap: 16, padding: '14px 20px', alignItems: 'center', borderBottom: i === campaigns.length - 1 ? 'none' : '1px solid var(--line-soft)', textDecoration: 'none', color: 'inherit', transition: 'background .12s' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                <div className="muted tiny" style={{ marginTop: 2 }}>{c.period_label}</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{client?.company_name ?? client?.name ?? '—'}</div>
              <div><span className="chip" style={{ fontSize: 11 }}>{TYPE_LABEL[c.type] ?? c.type}</span></div>
              <div>
                {total > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="progress" style={{ flex: 1, maxWidth: 100 }}>
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="tiny muted">{approved}/{total}</span>
                  </div>
                ) : (
                  <span className="muted tiny">Sem posts</span>
                )}
              </div>
              <div><StatusBadge kind={kind as Parameters<typeof StatusBadge>[0]['kind']} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Icon name="chevron" size={14} color="var(--muted-2)" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
