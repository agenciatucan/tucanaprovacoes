// ============================================================
// UTILITÁRIOS GERAIS
// ============================================================
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ApprovalStatus, PostStatus, CampaignStatus } from "@/types/database.types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Formatação de datas ───────────────────────────────────────
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(date));
}

export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60)    return "agora mesmo";
  if (seconds < 3600)  return `há ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `há ${Math.floor(seconds / 3600)}h`;
  return `há ${Math.floor(seconds / 86400)} dias`;
}

// ── Labels de status (PDF seções 10.1 a 10.5) ────────────────
export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  aguardando:        "Aguardando aprovação",
  aprovado:          "Aprovado",
  ajuste_solicitado: "Ajuste solicitado",
  substituir_tema:   "Substituir tema",
  nao_se_aplica:     "Não se aplica",
};

export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  pendente:     "Pendente",
  em_revisao:   "Em revisão",
  aprovado:     "Aprovado",
  programado:   "Programado",
  em_producao:  "Em produção",
  finalizado:   "Finalizado",
};

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  rascunho:               "Rascunho",
  enviado_para_aprovacao: "Enviado para aprovação",
  em_revisao:             "Em revisão",
  aprovado:               "Aprovado",
  em_producao:            "Em produção",
  finalizado:             "Finalizado",
  arquivado:              "Arquivado",
};

// ── Classes CSS para badges de status (PDF seção 14.3) ────────
export const APPROVAL_STATUS_CLASS: Record<ApprovalStatus, string> = {
  aguardando:        "bg-gray-100   text-gray-600   border-gray-200",
  aprovado:          "bg-green-100  text-green-700  border-green-200",
  ajuste_solicitado: "bg-orange-100 text-orange-700 border-orange-200",
  substituir_tema:   "bg-red-50     text-red-600    border-red-200",
  nao_se_aplica:     "bg-gray-50    text-gray-400   border-gray-100",
};

export const POST_STATUS_CLASS: Record<PostStatus, string> = {
  pendente:    "bg-gray-100   text-gray-600   border-gray-200",
  em_revisao:  "bg-blue-100   text-blue-700   border-blue-200",
  aprovado:    "bg-green-100  text-green-700  border-green-200",
  programado:  "bg-yellow-100 text-yellow-700 border-yellow-200",
  em_producao: "bg-purple-100 text-purple-700 border-purple-200",
  finalizado:  "bg-[#25411e]/10 text-[#25411e] border-[#25411e]/20",
};

// ── Formatação de arquivo ─────────────────────────────────────
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ── Truncar texto ─────────────────────────────────────────────
export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

// ── Token de aprovação ────────────────────────────────────────
export function createApprovalToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function createTokenExpiry(days = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ── Labels de formato do post ─────────────────────────────────
export const FORMAT_LABEL: Record<string, string> = {
  reels:        "Reels",
  carrossel:    "Carrossel",
  post_estatico: "Post estático",
  story:        "Story",
  outro:        "Outro",
};

// ── Progresso do cronograma ───────────────────────────────────
export function calcProgress(approved: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((approved / total) * 100);
}
