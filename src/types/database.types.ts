// ============================================================
// TIPOS TYPESCRIPT — Espelho fiel do banco de dados
// Sincronizado com migrations/001_initial_schema.sql
// Para regenerar: npm run db:generate
// ============================================================

// ── Enums ─────────────────────────────────────────────────────
export type UserRole       = "admin" | "equipe" | "cliente";
export type ClientStatus   = "ativo" | "inativo";
export type CampaignType   = "mensal" | "quinzenal" | "semanal" | "campanha";
export type CampaignStatus =
  | "rascunho"
  | "enviado_para_aprovacao"
  | "em_revisao"
  | "aprovado"
  | "em_producao"
  | "finalizado"
  | "arquivado";

export type ApprovalStatus =
  | "aguardando"
  | "aprovado"
  | "ajuste_solicitado"
  | "substituir_tema"  // apenas para tema
  | "nao_se_aplica";   // apenas para arte/prévia

export type PostStatus      = "pendente" | "em_revisao" | "aprovado" | "em_producao" | "programado" | "finalizado";
export type CommentStatus   = "aberta" | "resolvida";
export type FileType        = "imagem" | "video" | "pdf" | "roteiro" | "referencia" | "capa";
export type ApprovalType    = "tema" | "legenda" | "arte" | "post_completo" | "cronograma" | "planejamento";
export type PlanningStatus  = "rascunho" | "enviado_para_aprovacao" | "em_revisao" | "aprovado" | "arquivado";
export type PlanningContentType = "arte" | "reels" | "carrossel" | "story" | "outro";
export type PostFormat      = "reels" | "carrossel" | "post_estatico" | "story" | "outro";

// ── Entidades ─────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  company_name: string;
  email: string;
  whatsapp: string | null;
  internal_owner_id: string | null;
  status: ClientStatus;
  internal_notes: string | null;
  logo_url: string | null;
  requires_planning_approval: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanningSchedule {
  id: string;
  client_id: string;
  title: string;
  month_year: string;
  status: PlanningStatus;
  approval_token: string;
  token_expires_at: string;
  notes: string | null;
  campaign_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlanningItem {
  id: string;
  planning_schedule_id: string;
  client_id: string;
  week_label: string;
  title: string;
  content_type: PlanningContentType;
  order_index: number;
  notes: string | null;
  client_note: string | null;
  created_at: string;
}

export interface PlanningScheduleWithClient extends PlanningSchedule {
  client: Pick<Client, "id" | "name" | "company_name">;
}

export interface ClientUser {
  id: string;
  client_id: string;
  user_id: string;
  role: "aprovador" | "viewer";
  created_at: string;
}

export interface Campaign {
  id: string;
  client_id: string;
  name: string;
  type: CampaignType;
  start_date: string;
  end_date: string | null;
  period_label: string;
  overview: string | null;
  status: CampaignStatus;
  approval_token: string;
  token_expires_at: string;
  is_locked: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ContentItem {
  id: string;
  campaign_id: string;
  client_id: string;
  week_label: string;
  order_index: number;
  format: PostFormat;
  title: string;
  theme: string | null;
  objective: string | null;
  creative_concept: string | null;
  caption: string | null;
  script: string | null;
  reference_url: string | null;
  internal_notes: string | null;
  theme_status: ApprovalStatus;
  caption_status: ApprovalStatus;
  artwork_status: ApprovalStatus;
  general_status: PostStatus;
  is_locked: boolean;
  scheduled_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Approval {
  id: string;
  content_item_id: string | null;
  campaign_id: string;
  client_id: string;
  approval_type: ApprovalType;
  status: ApprovalStatus;
  note: string | null;
  approved_by: string;
  created_at: string;
}

export interface CommentHistory {
  id: string;
  content_item_id: string;
  campaign_id: string;
  client_id: string;
  user_id: string;
  message: string;
  status: CommentStatus;
  snapshot_theme_status: ApprovalStatus | null;
  snapshot_caption_status: ApprovalStatus | null;
  snapshot_artwork_status: ApprovalStatus | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface FileRecord {
  id: string;
  content_item_id: string;
  campaign_id: string;
  client_id: string;
  file_name: string;
  file_url: string;
  file_type: FileType;
  file_size_bytes: number;
  visible_to_client: boolean;
  uploaded_by: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  client_id: string | null;
  campaign_id: string | null;
  content_item_id: string | null;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ── Tipos compostos (queries com join) ────────────────────────
export interface CampaignWithClient extends Campaign {
  client: Pick<Client, "id" | "name" | "company_name">;
}

export interface ContentItemWithComments extends ContentItem {
  comments: CommentHistory[];
  files: Pick<FileRecord, "id" | "file_name" | "file_url" | "file_type" | "visible_to_client">[];
}

export interface CampaignProgress {
  campaign_id: string;
  total_posts: number;
  approved_posts: number;
  pending_posts: number;
  in_revision_posts: number;
  open_comments: number;
  can_approve: boolean;
}
