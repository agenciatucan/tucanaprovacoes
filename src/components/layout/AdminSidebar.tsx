"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Kanban,
  Calendar,
  MessageSquare,
  Settings,
  ClipboardList,
  X,
} from "lucide-react";
import type { UserRole } from "@/types/database.types";

const NAV_ITEMS = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "equipe"],
  },
  {
    href: "/admin/clientes",
    label: "Clientes",
    icon: Users,
    roles: ["admin", "equipe"],
  },
  {
    href: "/admin/cronogramas",
    label: "Cronogramas",
    icon: CalendarDays,
    roles: ["admin", "equipe"],
  },
  {
    href: "/admin/planejamento",
    label: "Planejamento",
    icon: ClipboardList,
    roles: ["admin", "equipe"],
  },
  {
    href: "/admin/kanban",
    label: "Kanban",
    icon: Kanban,
    roles: ["admin", "equipe"],
  },
  {
    href: "/admin/calendario",
    label: "Calendário",
    icon: Calendar,
    roles: ["admin", "equipe"],
  },
  {
    href: "/admin/observacoes",
    label: "Observações",
    icon: MessageSquare,
    roles: ["admin", "equipe"],
  },
  {
    href: "/admin/configuracoes",
    label: "Config.",
    icon: Settings,
    roles: ["admin"],
  },
];

interface Props {
  role: UserRole;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ role, isOpen = false, onClose }: Props) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay mobile */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-dvh w-72 flex-col bg-[#25411e] transition-transform duration-300 lg:static lg:z-auto lg:h-full lg:w-60 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eb6013]">
              <span className="text-sm font-bold text-white">T</span>
            </div>

            <div>
              <p className="text-sm font-semibold leading-tight text-white">
                Portal Tucan
              </p>
              <p className="text-xs text-white/50">Painel interno</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href as Route}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Rodapé */}
        <div className="border-t border-white/10 p-3">
          <p className="text-center text-xs text-white/30">
            Tucan Marketing Digital
          </p>
        </div>
      </aside>
    </>
  );
}