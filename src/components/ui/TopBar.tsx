'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Icon } from './Icon';
import { signOut } from '@/actions/auth';
import NotificationBell from './NotificationBell';

interface Props {
  variant: 'admin' | 'client';
  initials?: string;
  name?: string;
  role?: string;
  unreadCount?: number;
}

const CLIENT_LINKS = [
  { href: '/cliente', label: 'Cronogramas' },
  { href: '/cliente/aprovados', label: 'Aprovados' },
  { href: '/cliente/historico', label: 'Histórico' },
];

const ADMIN_LINKS = [
  { href: '/admin', label: 'Visão geral', adminOnly: false },
  { href: '/admin/clientes', label: 'Clientes', adminOnly: false },
  { href: '/admin/cronogramas', label: 'Cronogramas', adminOnly: false },
  { href: '/admin/atividades', label: 'Atividades', adminOnly: false },
  { href: '/admin/kanban', label: 'Kanban', adminOnly: false },
  { href: '/admin/calendario', label: 'Calendário', adminOnly: false },
  { href: '/admin/observacoes', label: 'Observações', adminOnly: false },
  { href: '/admin/configuracoes', label: 'Configurações', adminOnly: true },
];

export function TopBar({
  variant,
  initials = 'TU',
  name,
  role,
  unreadCount = 0,
}: Props) {
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);

  const allLinks = variant === 'admin' ? ADMIN_LINKS : CLIENT_LINKS;

  const links =
    variant === 'admin'
      ? allLinks.filter(
          (link) =>
            !('adminOnly' in link) || !link.adminOnly || role === 'admin'
        )
      : allLinks;

  const homeHref = variant === 'admin' ? '/admin' : '/cliente';

  function isActive(href: string) {
    return (
      pathname === href ||
      (href !== '/admin' &&
        href !== '/cliente' &&
        pathname.startsWith(`${href}/`))
    );
  }

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

  return (
    <>
      <header className="topbar">
        <div className="topbar-brand">
          <Link href={homeHref as Route} className="topbar-logo">
            <Image
              src="/assets/tucan-logo.png"
              alt="Tucan"
              height={22}
              width={88}
              priority
              style={{
                filter: 'brightness(0) invert(1)',
                height: 22,
                width: 'auto',
              }}
            />
          </Link>

          <button
            type="button"
            className="topbar-mobile-toggle"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileOpen}
          >
            <Icon name={mobileOpen ? 'x' : 'list'} size={19} />
          </button>
        </div>

        <nav className="topbar-nav topbar-nav-desktop">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href as Route}
              className={`topbar-link ${isActive(link.href) ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="topbar-right">
          {variant === 'admin' ? (
            <NotificationBell initialCount={unreadCount} />
          ) : (
            <button
              type="button"
              className="btn-icon topbar-notification-button"
              aria-label="Notificações"
            >
              <Icon name="bell" size={16} />
            </button>
          )}

          <div className="topbar-user">
            {name && <span className="topbar-user-name">{name}</span>}

            <div className="avatar" title={name}>
              {initials}
            </div>

            <form action={signOut} className="topbar-signout">
              <button type="submit" className="btn-icon topbar-logout-button" title="Sair">
                <Icon name="logout" size={15} />
              </button>
            </form>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <>
          <button
            type="button"
            className="topbar-mobile-backdrop"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
          />

          <div className="topbar-mobile-menu">
            <div className="topbar-mobile-menu-head">
              <div>
                <div className="eyebrow" style={{ color: 'rgba(255,255,255,.45)' }}>
                  {variant === 'admin' ? 'Painel interno' : 'Portal do cliente'}
                </div>

                <div className="topbar-mobile-menu-name">
                  {name ?? 'Tucan'}
                </div>
              </div>

              <div className="avatar">{initials}</div>
            </div>

            <nav className="topbar-mobile-nav">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href as Route}
                  className={`topbar-mobile-link ${
                    isActive(link.href) ? 'active' : ''
                  }`}
                >
                  {link.label}
                  <Icon name="chevron" size={15} />
                </Link>
              ))}
            </nav>

            <form action={signOut} className="topbar-mobile-signout">
              <button type="submit" className="topbar-mobile-signout-button">
                <Icon name="logout" size={15} />
                Sair da conta
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}