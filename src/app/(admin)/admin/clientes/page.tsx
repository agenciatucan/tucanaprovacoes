import { Metadata } from 'next';
import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Clientes' };

const ACCENT_COLORS = ['#25411e','#eb6013','#92400e','#1d4ed8','#7c3aed','#db2777','#066a3a','#5a5a5a'];

export default async function AdminClientesPage() {
  const supabase = await getSupabaseServerClient();
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, company_name, email, status, internal_owner_id, created_at, user_profiles(name)')
    .order('created_at', { ascending: false });

  const total = clients?.length ?? 0;

  return (
    <div className="page" style={{ maxWidth: 1320 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div className="eyebrow">Tucan · Interno</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Clientes</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>{total} clientes cadastrados</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm"><Icon name="download" size={14} /> Exportar</button>
          <Link href="/admin/clientes/novo" className="btn btn-primary">
            <Icon name="plus" size={16} /> Novo cliente
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 12, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
          <div style={{ position: 'absolute', left: 12, top: 11, pointerEvents: 'none' }}>
            <Icon name="search" size={16} color="var(--muted-2)" />
          </div>
          <input className="input" placeholder="Buscar cliente, empresa…" style={{ paddingLeft: 38, height: 38, borderColor: 'transparent', background: 'var(--bg)' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="chip" style={{ height: 30, background: 'var(--green)', color: '#fff' }}>Todos · {total}</span>
          <span className="chip" style={{ height: 30 }}>Ativos · {clients?.filter(c => c.status === 'ativo').length ?? 0}</span>
          <span className="chip" style={{ height: 30 }}>Inativos · {clients?.filter(c => c.status === 'inativo').length ?? 0}</span>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm"><Icon name="filter" size={14} /> Filtros</button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        {/* Head */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1fr 0.8fr 60px', gap: 16, padding: '12px 20px', background: 'var(--bg)', borderBottom: '1px solid var(--line)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
          <div>Cliente</div>
          <div>E-mail</div>
          <div>Responsável</div>
          <div>Status</div>
          <div />
        </div>

        {clients?.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
            Nenhum cliente cadastrado ainda.{' '}
            <Link href="/admin/clientes/novo" style={{ color: 'var(--orange)', fontWeight: 600 }}>Adicionar o primeiro →</Link>
          </div>
        )}

        {clients?.map((c, i) => {
          const initials = c.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
          const accentColor = ACCENT_COLORS[i % ACCENT_COLORS.length]!;
          const owner = Array.isArray(c.user_profiles) ? c.user_profiles[0] : c.user_profiles;

          return (
            <Link key={c.id} href={`/admin/clientes/${c.id}`} style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1fr 0.8fr 60px', gap: 16, padding: '14px 20px', alignItems: 'center', borderBottom: i === clients.length - 1 ? 'none' : '1px solid var(--line-soft)', textDecoration: 'none', color: 'inherit', cursor: 'pointer', transition: 'background .12s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: accentColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                  <div className="muted tiny">{c.company_name}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{c.email}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{owner?.name ?? '—'}</div>
              <div><StatusBadge kind={c.status === 'ativo' ? 'aprovado' : 'rascunho'} label={c.status === 'ativo' ? 'Ativo' : 'Inativo'} /></div>
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
