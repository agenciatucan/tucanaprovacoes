"use server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  planningScheduleSchema,
  planningItemSchema,
  type PlanningScheduleInput,
  type PlanningItemInput,
} from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

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

  const { data: itemsCount } = await supabase
    .from("planning_items")
    .select("id", { count: "exact", head: true })
    .eq("planning_schedule_id", id);

  if ((itemsCount as unknown as number) === 0) {
    return { success: false, error: "Adicione ao menos um tema antes de enviar" };
  }

  const { error } = await supabase
    .from("planning_schedules")
    .update({ status: "enviado_para_aprovacao" })
    .eq("id", id);

  if (error) return { success: false, error: "Erro ao enviar para aprovação" };

  revalidatePath("/admin/planejamento");
  revalidatePath(`/admin/planejamento/${id}`);
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

export async function approvePlanning(token: string): Promise<Result> {
  const supabase = await getSupabaseServerClient();

  const { data: schedule } = await supabase
    .from("planning_schedules")
    .select("id, status, client_id")
    .eq("approval_token", token)
    .gt("token_expires_at", new Date().toISOString())
    .single();

  if (!schedule) return { success: false, error: "Link inválido ou expirado" };
  if (schedule.status === "aprovado") return { success: false, error: "Planejamento já aprovado" };

  const { error } = await supabase
    .from("planning_schedules")
    .update({ status: "aprovado" })
    .eq("id", schedule.id);

  if (error) return { success: false, error: "Erro ao aprovar planejamento" };

  revalidatePath("/admin/planejamento");
  revalidatePath(`/admin/planejamento/${schedule.id}`);
  return { success: true, data: undefined };
}

export async function requestPlanningAdjustment(
  token: string,
  note: string
): Promise<Result> {
  if (!note || note.trim().length < 5) {
    return { success: false, error: "Descreva o ajuste solicitado (mínimo 5 caracteres)" };
  }

  const supabase = await getSupabaseServerClient();

  const { data: schedule } = await supabase
    .from("planning_schedules")
    .select("id, status, client_id")
    .eq("approval_token", token)
    .gt("token_expires_at", new Date().toISOString())
    .single();

  if (!schedule) return { success: false, error: "Link inválido ou expirado" };
  if (schedule.status === "aprovado") return { success: false, error: "Planejamento já aprovado" };

  const { error } = await supabase
    .from("planning_schedules")
    .update({ status: "em_revisao", notes: note.trim() })
    .eq("id", schedule.id);

  if (error) return { success: false, error: "Erro ao solicitar ajuste" };

  revalidatePath("/admin/planejamento");
  revalidatePath(`/admin/planejamento/${schedule.id}`);
  return { success: true, data: undefined };
}
