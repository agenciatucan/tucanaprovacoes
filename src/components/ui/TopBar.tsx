'use client';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Icon } from './Icon';
import { signOut } from '@/actions/auth';

interface Props {
  variant: 'admin' | 'client';
  initials?: string;
  name?: string;
}

const CLIENT_LINKS = [
  { href: '/cliente',            label: 'Cronogramas' },
  { href: '/cliente/aprovados',  label: 'Aprovados' },
  { href: '/cliente/historico',  label: 'Histórico' },
];

const ADMIN_LINKS = [
  { href: '/admin',                 label: 'Visão geral' },
  { href: '/admin/clientes',        label: 'Clientes' },
  { href: '/admin/cronogramas',     label: 'Cronogramas' },
  { href: '/admin/kanban',          label: 'Kanban' },
  { href: '/admin/calendario',      label: 'Calendário' },
  { href: '/admin/observacoes',     label: 'Observações' },
];

export function TopBar({ variant, initials = 'TU', name }: Props) {
  const pathname = usePathname();
  const links = variant === 'admin' ? ADMIN_LINKS : CLIENT_LINKS;

  return (
    <header className="topbar">
      <Link href={variant === 'admin' ? '/admin' : '/cliente'}>
        <Image src="/assets/tucan-logo.png" alt="Tucan" height={22} width={88}
          style={{ filter: 'brightness(0) invert(1)', height: 22, width: 'auto' }} />
      </Link>

      <nav className="topbar-nav">
        {links.map((l) => (
          <Link key={l.href} href={l.href as Route}
            className={`topbar-link ${pathname === l.href || (l.href !== '/admin' && l.href !== '/cliente' && pathname.startsWith(l.href)) ? 'active' : ''}`}>
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="topbar-right">
        <button className="btn-icon" style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff' }}
          aria-label="Notificações">
          <Icon name="bell" size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {name && (
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </span>
          )}
          <div className="avatar" title={name}>{initials}</div>
          <form action={signOut}>
            <button
              type="submit"
              className="btn-icon"
              title="Sair"
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.6)', transition: 'color .15s, background .15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#fff'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(235,96,19,0.3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}>
              <Icon name="logout" size={15} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
