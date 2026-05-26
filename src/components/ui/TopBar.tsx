'use client';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Icon } from './Icon';

interface Props {
  variant: 'admin' | 'client';
  initials?: string;
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

export function TopBar({ variant, initials = 'TU' }: Props) {
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
        <div className="avatar">{initials}</div>
      </div>
    </header>
  );
}
