"use server";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import {
  planningScheduleSchema,
  planningItemSchema,
  type PlanningScheduleInput,
  type PlanningItemInput,
} from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { notifyPlanningForApproval } from "@/lib/whatsapp-notifications";

type Result<T = void> = { success: true; data: T } | { success: false; error: string };

async function requireStaff(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();
  if (!data || !["admin", "equipe"].includes(data.role)) return null;
  return data;
}

function makeToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function tokenExpiry(days = 60) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ── CRUD de planejamentos ─────────────────────────────────────

export async function createPlanningSchedule(
  input: PlanningScheduleInput
): Promise<Result<{ id: string }>> {
  const parsed = planningScheduleSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { data, error } = await supabase
    .from("planning_schedules")
    .insert({ ...parsed.data, created_by: profile.id })
    .select("id")
    .single();

  if (error || !data) {
    logger.error("createPlanningSchedule", error?.message ?? "erro desconhecido");
    return { success: false, error: "Erro ao criar planejamento" };
  }

  revalidatePath("/admin/planejamento");
  revalidatePath(`/admin/clientes/${parsed.data.client_id}`);
  return { success: true, data: { id: data.id } };
}

export async function updatePlanningSchedule(
  id: string,
  input: Partial<Pick<PlanningScheduleInput, "title" | "month_year" | "notes">>
): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { data: schedule } = await supabase
    .from("planning_schedules")
    .select("client_id, status")
    .eq("id", id)
    .single();

  if (!schedule) return { success: false, error: "Planejamento não encontrado" };
  if (schedule.status === "aprovado") return { success: false, error: "Planejamento já aprovado não pode ser editado" };

  const { error } = await supabase
    .from("planning_schedules")
    .update(input)
    .eq("id", id);

  if (error) return { success: false, error: "Erro ao atualizar planejamento" };

  revalidatePath("/admin/planejamento");
  revalidatePath(`/admin/planejamento/${id}`);
  return { success: true, data: undefined };
}

export async function deletePlanningSchedule(id: string): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { data: schedule } = await supabase
    .from("planning_schedules")
    .select("client_id, status")
    .eq("id", id)
    .single();

  if (!schedule) return { success: false, error: "Planejamento não encontrado" };
  if (schedule.status === "aprovado") return { success: false, error: "Planejamento aprovado não pode ser excluído" };

  const { error } = await supabase
    .from("planning_schedules")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: "Erro ao excluir planejamento" };

  revalidatePath("/admin/planejamento");
  revalidatePath(`/admin/clientes/${schedule.client_id}`);
  return { success: true, data: undefined };
}

export async function sendPlanningForApproval(id: string): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { data: schedule } = await supabase
    .from("planning_schedules")
    .select("client_id, status")
    .eq("id", id)
    .single();

  if (!schedule) return { success: false, error: "Planejamento não encontrado" };
  if (!["rascunho", "em_revisao"].includes(schedule.status)) {
    return { success: false, error: "Planejamento já foi enviado para aprovação" };
  }

  const { count } = await supabase
    .from("planning_items")
    .select("id", { count: "exact", head: true })
    .eq("planning_schedule_id", id);

  if (!count || count === 0) {
    return { success: false, error: "Adicione ao menos um tema antes de enviar" };
  }

  const { error } = await supabase
    .from("planning_schedules")
    .update({ status: "enviado_para_aprovacao" })
    .eq("id", id);

  if (error) return { success: false, error: "Erro ao enviar para aprovação" };

  revalidatePath("/admin/planejamento");
  revalidatePath(`/admin/planejamento/${id}`);

  // Notifica cliente via WhatsApp (fire-and-forget)
  notifyPlanningForApproval(id).catch(() => {});

  return { success: true, data: undefined };
}

// ── CRUD de itens ─────────────────────────────────────────────

export async function createPlanningItem(
  input: PlanningItemInput
): Promise<Result<{ id: string }>> {
  const parsed = planningItemSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { data: schedule } = await supabase
    .from("planning_schedules")
    .select("status")
    .eq("id", parsed.data.planning_schedule_id)
    .single();

  if (!schedule) return { success: false, error: "Planejamento não encontrado" };
  if (schedule.status === "aprovado") return { success: false, error: "Planejamento aprovado não pode ser editado" };

  const { data, error } = await supabase
    .from("planning_items")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error || !data) return { success: false, error: "Erro ao criar tema" };

  revalidatePath(`/admin/planejamento/${parsed.data.planning_schedule_id}`);
  return { success: true, data: { id: data.id } };
}

export async function updatePlanningItem(
  id: string,
  input: Partial<Pick<PlanningItemInput, "week_label" | "title" | "content_type" | "order_index" | "notes">>
): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { error } = await supabase
    .from("planning_items")
    .update(input)
    .eq("id", id);

  if (error) return { success: false, error: "Erro ao atualizar tema" };
  return { success: true, data: undefined };
}

export async function deletePlanningItem(id: string, scheduleId: string): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { error } = await supabase
    .from("planning_items")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: "Erro ao excluir tema" };

  revalidatePath(`/admin/planejamento/${scheduleId}`);
  return { success: true, data: undefined };
}

// ── Aprovação pública (via token) ─────────────────────────────

export async function getPlanningByToken(
  token: string
): Promise<Result<{ schedule: Record<string, unknown>; items: Record<string, unknown>[] }>> {
  const supabase = await getSupabaseServerClient();

  const { data: schedule } = await supabase
    .from("planning_schedules")
    .select("*, clients(id, name, company_name, logo_url)")
    .eq("approval_token", token)
    .gt("token_expires_at", new Date().toISOString())
    .single();

  if (!schedule) return { success: false, error: "Link inválido ou expirado" };

  const { data: items } = await supabase
    .from("planning_items")
    .select("*")
    .eq("planning_schedule_id", schedule.id)
    .order("order_index");

  return { success: true, data: { schedule, items: items ?? [] } };
}

// Salva observação do cliente em um tema específico (via token público)
export async function savePlanningItemNote(
  token: string,
  itemId: string,
  note: string
): Promise<Result> {
  const service = await getSupabaseServiceClient();

  const { data: schedule } = await service
    .from("planning_schedules")
    .select("id, status")
    .eq("approval_token", token)
    .gt("token_expires_at", new Date().toISOString())
    .single();

  if (!schedule) return { success: false, error: "Link inválido ou expirado" };
  if (schedule.status === "aprovado") return { success: false, error: "Planejamento já aprovado" };

  const { data: item } = await service
    .from("planning_items")
    .select("id")
    .eq("id", itemId)
    .eq("planning_schedule_id", schedule.id)
    .single();

  if (!item) return { success: false, error: "Tema não encontrado" };

  const { error } = await service
    .from("planning_items")
    .update({ client_note: note.trim() || null })
    .eq("id", itemId);

  if (error) return { success: false, error: "Erro ao salvar observação" };

  return { success: true, data: undefined };
}

// Aprovação do planejamento — cria cronograma automaticamente
export async function approvePlanning(token: string): Promise<Result> {
  const service = await getSupabaseServiceClient();

  const { data: schedule } = await service
    .from("planning_schedules")
    .select("id, status, client_id, title, month_year, created_by")
    .eq("approval_token", token)
    .gt("token_expires_at", new Date().toISOString())
    .single();

  if (!schedule) return { success: false, error: "Link inválido ou expirado" };
  if (schedule.status === "aprovado") return { success: false, error: "Planejamento já aprovado" };

  // Marca como aprovado
  const { error: approvalError } = await service
    .from("planning_schedules")
    .update({ status: "aprovado" })
    .eq("id", schedule.id);

  if (approvalError) return { success: false, error: "Erro ao aprovar planejamento" };

  // Busca os itens para criar o cronograma
  const { data: items } = await service
    .from("planning_items")
    .select("*")
    .eq("planning_schedule_id", schedule.id)
    .order("order_index");

  if (items && items.length > 0) {
    const parts = (schedule.month_year as string).split("-");
    const year  = Number(parts[0]);
    const month = Number(parts[1]);
    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 0);
    const periodLabel = startDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    const { data: campaign, error: campaignError } = await service
      .from("campaigns")
      .insert({
        client_id:        schedule.client_id,
        name:             schedule.title,
        type:             "mensal",
        status:           "em_producao",
        period_label:     periodLabel,
        start_date:       startDate.toISOString().split("T")[0],
        end_date:         endDate.toISOString().split("T")[0],
        is_locked:        false,
        approval_token:   makeToken(),
        token_expires_at: tokenExpiry(30),
        created_by:       schedule.created_by,
      })
      .select("id")
      .single();

    if (!campaignError && campaign) {
      const formatMap: Record<string, string> = {
        arte:      "post_estatico",
        reels:     "reels",
        carrossel: "carrossel",
        story:     "story",
        outro:     "outro",
      };

      const contentItems = (items as Record<string, unknown>[]).map((item) => ({
        campaign_id:     campaign.id,
        client_id:       item.client_id,
        week_label:      item.week_label,
        order_index:     item.order_index,
        format:          formatMap[item.content_type as string] ?? "outro",
        title:           item.title,
        theme:           item.title,
        theme_status:    "aprovado", // temas aprovados pelo cliente
        caption_status:  "aguardando",
        artwork_status:  "aguardando",
        general_status:  "pendente",
        is_locked:       false,
        created_by:      schedule.created_by,
      }));

      await service.from("content_items").insert(contentItems);

      // Vincula cronograma ao planejamento
      await service
        .from("planning_schedules")
        .update({ campaign_id: campaign.id })
        .eq("id", schedule.id);

      revalidatePath("/admin/cronogramas");
      revalidatePath(`/admin/cronogramas/${campaign.id}`);
      revalidatePath(`/admin/clientes/${schedule.client_id}`);
    }
  }

  revalidatePath("/admin/planejamento");
  revalidatePath(`/admin/planejamento/${schedule.id}`);
  return { success: true, data: undefined };
}

export async function requestPlanningAdjustment(
  token: string,
  note: string,
  itemNotes?: { itemId: string; note: string }[]
): Promise<Result> {
  if (!note || note.trim().length < 5) {
    return { success: false, error: "Descreva o ajuste solicitado (mínimo 5 caracteres)" };
  }

  const service = await getSupabaseServiceClient();

  const { data: schedule } = await service
    .from("planning_schedules")
    .select("id, status, client_id")
    .eq("approval_token", token)
    .gt("token_expires_at", new Date().toISOString())
    .single();

  if (!schedule) return { success: false, error: "Link inválido ou expirado" };
  if (schedule.status === "aprovado") return { success: false, error: "Planejamento já aprovado" };

  const { error } = await service
    .from("planning_schedules")
    .update({ status: "em_revisao", notes: note.trim() })
    .eq("id", schedule.id);

  if (error) return { success: false, error: "Erro ao solicitar ajuste" };

  // Salva notas por tema se fornecidas
  if (itemNotes && itemNotes.length > 0) {
    for (const { itemId, note: itemNote } of itemNotes) {
      if (itemNote.trim()) {
        await service
          .from("planning_items")
          .update({ client_note: itemNote.trim() })
          .eq("id", itemId)
          .eq("planning_schedule_id", schedule.id);
      }
    }
  }

  revalidatePath("/admin/planejamento");
  revalidatePath(`/admin/planejamento/${schedule.id}`);
  return { success: true, data: undefined };
}
