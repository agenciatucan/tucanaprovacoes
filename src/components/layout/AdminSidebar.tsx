"use client";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, CalendarDays, Kanban,
  Calendar, MessageSquare, Settings, FileText
} from "lucide-react";
import type { UserRole } from "@/types/database.types";

const NAV_ITEMS = [
  { href: "/admin",            label: "Dashboard",    icon: LayoutDashboard, roles: ["admin", "equipe"] },
  { href: "/admin/clientes",   label: "Clientes",     icon: Users,           roles: ["admin", "equipe"] },
  { href: "/admin/cronogramas",label: "Cronogramas",  icon: CalendarDays,    roles: ["admin", "equipe"] },
  { href: "/admin/kanban",     label: "Kanban",       icon: Kanban,          roles: ["admin", "equipe"] },
  { href: "/admin/calendario", label: "Calendário",   icon: Calendar,        roles: ["admin", "equipe"] },
  { href: "/admin/observacoes",label: "Observações",  icon: MessageSquare,   roles: ["admin", "equipe"] },
  { href: "/admin/configuracoes",label: "Config.",    icon: Settings,        roles: ["admin"] },
];

interface Props {
  role: UserRole;
}

export default function AdminSidebar({ role }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-[#25411e] flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#eb6013] flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Portal Tucan</p>
            <p className="text-white/50 text-xs">Painel interno</p>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.filter(item => item.roles.includes(role)).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
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
      <div className="p-3 border-t border-white/10">
        <p className="text-white/30 text-xs text-center">Tucan Marketing Digital</p>
      </div>
    </aside>
  );
}
