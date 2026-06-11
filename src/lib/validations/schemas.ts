// ============================================================
// SCHEMAS ZOD — Validação de entrada do usuário
// TODA mutação de dados passa por aqui antes de ir ao banco
// ============================================================
import { z } from "zod";

// Constantes reutilizáveis
const UUID = z.string().uuid("ID inválido");
const DATE_STR = z.string().date("Data inválida");
// Aceita string, "", null ou undefined — transforma tudo "vazio" em null para o banco.
// .nullish() = .optional().nullable() garante que null (enviado por alguns forms) não
// cause "Invalid input" no erro de union do Zod.
const OPTIONAL_TEXT = (max: number) =>
  z.string().max(max).nullish().or(z.literal("")).transform(v => v || null);

// ── Login ─────────────────────────────────────────────────────
export const loginSchema = z.object({
  email:    z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ── Acesso por token (link individual) ────────────────────────
export const tokenAccessSchema = z.object({
  token: z.string().min(64).max(64, "Token inválido"),
  email: z.string().email("E-mail inválido"),
});
export type TokenAccessInput = z.infer<typeof tokenAccessSchema>;

// ── Clientes ──────────────────────────────────────────────────
export const clientSchema = z.object({
  name:              z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  company_name:      z.string().min(2, "Nome da empresa obrigatório").max(150),
  email:             z.string().email("E-mail inválido"),
  whatsapp:          z.string()
                       .regex(/^\+?[\d\s\-()]{10,20}$/, "WhatsApp inválido")
                       .nullish().or(z.literal("")).transform(v => v || null),
  internal_owner_id: UUID.optional().nullable(),
  status:            z.enum(["ativo", "inativo"]).default("ativo"),
  internal_notes:    OPTIONAL_TEXT(1000),
  logo_url:                  z.string().url().nullish().or(z.literal("")).transform(v => v || null),
  requires_planning_approval: z.boolean().optional().default(false),
});
export type ClientInput = z.infer<typeof clientSchema>;

// ── Planejamento mensal ───────────────────────────────────────
export const planningScheduleSchema = z.object({
  client_id:  UUID,
  title:      z.string().min(3, "Título deve ter pelo menos 3 caracteres").max(200),
  month_year: z.string().regex(/^\d{4}-\d{2}$/, "Formato inválido (use AAAA-MM)"),
  notes:      OPTIONAL_TEXT(3000),
});
export type PlanningScheduleInput = z.infer<typeof planningScheduleSchema>;

export const planningItemSchema = z.object({
  planning_schedule_id: UUID,
  client_id:            UUID,
  week_label:           z.string().min(1, "Semana obrigatória").max(50),
  title:                z.string().min(2, "Título do tema obrigatório").max(500),
  content_type:         z.enum(["arte", "reels", "carrossel", "story", "outro"]).default("arte"),
  order_index:          z.number().int().min(0).default(0),
  notes:                OPTIONAL_TEXT(1000),
});
export type PlanningItemInput = z.infer<typeof planningItemSchema>;

// ── Cronogramas ───────────────────────────────────────────────
export const campaignSchema = z.object({
  client_id:    UUID,
  name:         z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(200),
  type:         z.enum(["mensal", "quinzenal", "semanal", "campanha"]),
  start_date:   DATE_STR,
  end_date:     DATE_STR.nullish().or(z.literal("")).transform(v => v || null),
  period_label: z.string().min(2, "Período obrigatório").max(100),
  overview:     OPTIONAL_TEXT(3000),
});
export type CampaignInput = z.infer<typeof campaignSchema>;

// ── Posts / Cards ─────────────────────────────────────────────
export const contentItemSchema = z.object({
  campaign_id:      UUID,
  week_label:       z.string().min(1, "Semana obrigatória").max(50),
  order_index:      z.number().int().min(0),
  format:           z.enum(["reels", "carrossel", "post_estatico", "story", "outro"]),
  title:            z.string().min(1, "Título obrigatório").max(200),
  theme:            OPTIONAL_TEXT(500),
  objective:        OPTIONAL_TEXT(500),
  creative_concept: OPTIONAL_TEXT(1000),
  caption:          OPTIONAL_TEXT(3000),
  script:           OPTIONAL_TEXT(5000),
  reference_url: z
    .string()
    .url("URL inválida")
    .refine((url) => {
      try {
        const { protocol, hostname } = new URL(url);
        // Apenas HTTP/HTTPS — bloqueia javascript:, data:, file:, etc.
        if (!['http:', 'https:'].includes(protocol)) return false;
        // Bloqueia localhost e ranges de IP privados (SSRF)
        if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname)) return false;
        if (/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(hostname)) return false;
        return true;
      } catch { return false; }
    }, "Apenas URLs HTTP/HTTPS externas são permitidas")
    .nullish()
    .or(z.literal(""))
    .transform(v => v || null),
  internal_notes:   OPTIONAL_TEXT(1000),
  scheduled_date:   DATE_STR.nullish().or(z.literal("")).transform(v => v || null),
});
export type ContentItemInput = z.infer<typeof contentItemSchema>;

// ── Aprovação por campo (PDF seção 11) ────────────────────────
export const approvalSchema = z.object({
  content_item_id: UUID.optional(),
  campaign_id:     UUID,
  approval_type:   z.enum(["tema", "legenda", "arte", "post_completo", "cronograma"]),
  status:          z.enum([
    "aprovado",
    "ajuste_solicitado",
    "substituir_tema",  // específico para tema
    "nao_se_aplica",    // específico para arte
  ]),
  note: z.string().max(1000).optional(),
})
.refine(
  (data) => {
    // Observação obrigatória ao solicitar ajuste (PDF seção 9.3 + 11.2)
    const requiresNote = ["ajuste_solicitado", "substituir_tema"].includes(data.status);
    if (requiresNote && (!data.note || data.note.trim().length < 5)) return false;
    return true;
  },
  {
    message: "Para solicitar um ajuste, descreva o que precisa ser alterado.",
    path: ["note"],
  }
)
.refine(
  (data) => {
    // substituir_tema só é válido para tipo "tema"
    if (data.status === "substituir_tema" && data.approval_type !== "tema") return false;
    // nao_se_aplica só é válido para tipo "arte"
    if (data.status === "nao_se_aplica" && data.approval_type !== "arte") return false;
    return true;
  },
  { message: "Status incompatível com o tipo de aprovação", path: ["status"] }
);
export type ApprovalInput = z.infer<typeof approvalSchema>;

// ── Comentário / Observação ───────────────────────────────────
export const commentSchema = z.object({
  content_item_id: UUID,
  campaign_id:     UUID,
  message:         z.string().min(5, "Observação muito curta").max(1000),
});
export type CommentInput = z.infer<typeof commentSchema>;

// ── Upload de arquivo ─────────────────────────────────────────
export const fileUploadSchema = z.object({
  content_item_id:  UUID,
  campaign_id:      UUID,
  file_type:        z.enum(["imagem", "video", "pdf", "roteiro", "referencia", "capa"]),
  visible_to_client: z.boolean().default(true),
});
export type FileUploadInput = z.infer<typeof fileUploadSchema>;

// ── Resolver observação ───────────────────────────────────────
export const resolveCommentSchema = z.object({
  comment_id: UUID,
});
export type ResolveCommentInput = z.infer<typeof resolveCommentSchema>;

// ── Aprovação completa do cronograma ─────────────────────────
export const approveCampaignSchema = z.object({
  campaign_id: UUID,
  note:        OPTIONAL_TEXT(500),
});
export type ApproveCampaignInput = z.infer<typeof approveCampaignSchema>;

// ── Atividades ────────────────────────────────────────────────
export const ACTIVITY_CATEGORIES = [
  'criacao', 'video', 'social_media', 'trafego_pago', 'atendimento',
  'gravacao', 'relatorio', 'administrativo', 'ajustes', 'estrategia',
] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const ACTIVITY_CATEGORY_LABEL: Record<string, string> = {
  criacao:        'Criação',
  video:          'Vídeo',
  social_media:   'Social Media',
  trafego_pago:   'Tráfego Pago',
  atendimento:    'Atendimento',
  gravacao:       'Gravação',
  relatorio:      'Relatório',
  administrativo: 'Administrativo',
  ajustes:        'Ajustes',
  estrategia:     'Estratégia',
};

export const ACTIVITY_PRIORITIES = ['baixa', 'media', 'alta', 'urgente'] as const;
export type ActivityPriority = (typeof ACTIVITY_PRIORITIES)[number];

// Novo fluxo da agência: 7 etapas
export const ACTIVITY_STATUSES = [
  'entrada', 'em_analise', 'atribuido', 'em_producao',
  'em_aprovacao', 'ajustes', 'concluido',
] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export const ACTIVITY_STATUS_LABEL: Record<string, string> = {
  entrada:      'Entrada',
  em_analise:   'Em análise',
  atribuido:    'Atribuído',
  em_producao:  'Em produção',
  em_aprovacao: 'Em aprovação',
  ajustes:      'Ajustes',
  concluido:    'Concluído',
};

export const activitySchema = z.object({
  title:          z.string().min(2, 'Título obrigatório').max(200),
  description:    OPTIONAL_TEXT(2000),
  client_id:      UUID.nullish().or(z.literal('')).transform(v => v || null),
  responsible_id: UUID.nullish().or(z.literal('')).transform(v => v || null),
  category:       z.enum(ACTIVITY_CATEGORIES),
  priority:       z.enum(ACTIVITY_PRIORITIES).default('media'),
  status:         z.enum(ACTIVITY_STATUSES).default('entrada'),
  due_date:       DATE_STR.nullish().or(z.literal('')).transform(v => v || null),
  visibility:     z.enum(['interna', 'cliente']).default('interna'),
});
export type ActivityInput = z.infer<typeof activitySchema>;
