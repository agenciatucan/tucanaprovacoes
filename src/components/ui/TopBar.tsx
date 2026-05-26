'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Icon } from './Icon';
import { signOut } from '@/actions/auth';

interface Props {
  variant: 'admin' | 'client';
  initials?: string;
  name?: string;
}

const CLIENT_LINKS = [
  { href: '/cliente', label: 'Cronogramas' },
  { href: '/cliente/aprovados', label: 'Aprovados' },
  { href: '/cliente/historico', label: 'Histórico' },
];

const ADMIN_LINKS = [
  { href: '/admin', label: 'Visão geral' },
  { href: '/admin/clientes', label: 'Clientes' },
  { href: '/admin/cronogramas', label: 'Cronogramas' },
  { href: '/admin/kanban', label: 'Kanban' },
  { href: '/admin/calendario', label: 'Calendário' },
  { href: '/admin/observacoes', label: 'Observações' },
];

export function TopBar({ variant, initials = 'TU', name }: Props) {
  const pathname = usePathname();
  const links = variant === 'admin' ? ADMIN_LINKS : CLIENT_LINKS;
  const [menuOpen, setMenuOpen] = useState(false);

  const homeHref = variant === 'admin' ? '/admin' : '/cliente';

  function isActive(href: string) {
    return (
      pathname === href ||
      (href !== '/admin' && href !== '/cliente' && pathname.startsWith(href))
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between bg-[#25411e] px-4 shadow-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/15 lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>

          <Link href={homeHref as Route} className="flex items-center">
            <Image
              src="/assets/tucan-logo.png"
              alt="Tucan"
              height={22}
              width={88}
              style={{
                filter: 'brightness(0) invert(1)',
                height: 22,
                width: 'auto',
              }}
              priority
            />
          </Link>
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href as Route}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                isActive(link.href)
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            className="hidden h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/15 sm:inline-flex"
            aria-label="Notificações"
            type="button"
          >
            <Icon name="bell" size={16} />
          </button>

          <div className="flex items-center gap-2">
            {name && (
              <span className="hidden max-w-[140px] truncate text-sm font-medium text-white/70 sm:block">
                {name}
              </span>
            )}

            <div
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eb6013] text-sm font-bold text-white"
              title={name}
            >
              {initials}
            </div>

            <form action={signOut}>
              <button
                type="submit"
                className="hidden h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/70 transition hover:bg-[#eb6013]/30 hover:text-white sm:inline-flex"
                title="Sair"
              >
                <Icon name="logout" size={15} />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Overlay mobile */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity lg:hidden ${
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Menu mobile */}
      <aside
        className={`fixed left-0 top-0 z-[60] flex h-dvh w-[82%] max-w-80 flex-col bg-[#25411e] shadow-2xl transition-transform duration-300 lg:hidden ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <Link
            href={homeHref as Route}
            className="flex items-center"
            onClick={() => setMenuOpen(false)}
          >
            <Image
              src="/assets/tucan-logo.png"
              alt="Tucan"
              height={24}
              width={96}
              style={{
                filter: 'brightness(0) invert(1)',
                height: 24,
                width: 'auto',
              }}
              priority
            />
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/15"
            aria-label="Fechar menu"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href as Route}
              onClick={() => setMenuOpen(false)}
              className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive(link.href)
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eb6013] text-sm font-bold text-white">
              {initials}
            </div>

            <div className="min-w-0">
              {name && (
                <p className="truncate text-sm font-semibold text-white">
                  {name}
                </p>
              )}
              <p className="text-xs text-white/50">
                {variant === 'admin' ? 'Painel admin' : 'Área do cliente'}
              </p>
            </div>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-[#eb6013]/30 hover:text-white"
            >
              <Icon name="logout" size={15} />
              Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}