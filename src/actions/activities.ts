"use server";
// ============================================================
// SERVER ACTIONS — Atividades internas
// ============================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { activitySchema, type ActivityInput } from "@/lib/validations/schemas";
import { logger } from "@/lib/logger";

type Result<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireStaff() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!data || !["admin", "equipe"].includes(data.role)) return null;
  return { ...data, supabase };
}

async function requireAdmin() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!data || data.role !== "admin") return null;
  return { ...data, supabase };
}

// Com o novo fluxo, status e kanban_column têm os mesmos slugs.
// Atividades arquivadas ficam com kanban_column = 'entrada' (não aparecem no kanban).
function statusToKanbanColumn(status: string): string {
  const validColumns = new Set([
    'entrada', 'em_analise', 'atribuido', 'em_producao',
    'em_aprovacao', 'ajustes', 'concluido',
  ]);
  return validColumns.has(status) ? status : 'entrada';
}

function revalidateActivityPaths() {
  revalidatePath("/admin/atividades");
  revalidatePath("/admin/kanban");
  revalidatePath("/admin");
}

// ── Criar atividade ──────────────────────────────────────────
export async function createActivity(
  input: ActivityInput
): Promise<Result<{ id: string }>> {
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const ctx = await requireStaff();
  if (!ctx) return { success: false, error: "Sem permissão" };

  const { supabase, id: profileId } = ctx;
  const kanban_column = statusToKanbanColumn(parsed.data.status);

  const { data, error } = await supabase
    .from("activities")
    .insert({
      ...parsed.data,
      kanban_column,
      created_by: profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    logger.error("createActivity", error?.message);
    return { success: false, error: "Erro ao criar atividade" };
  }

  revalidateActivityPaths();
  return { success: true, data: { id: data.id } };
}

// ── Atualizar atividade ──────────────────────────────────────
export async function updateActivity(
  id: string,
  input: ActivityInput
): Promise<Result> {
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const ctx = await requireStaff();
  if (!ctx) return { success: false, error: "Sem permissão" };

  const { supabase } = ctx;
  const kanban_column = statusToKanbanColumn(parsed.data.status);

  const { error } = await supabase
    .from("activities")
    .update({ ...parsed.data, kanban_column })
    .eq("id", id)
    .is("archived_at", null);

  if (error) {
    logger.error("updateActivity", error.message);
    return { success: false, error: "Erro ao atualizar atividade" };
  }

  revalidateActivityPaths();
  revalidatePath(`/admin/atividades/${id}/editar`);
  return { success: true, data: undefined };
}

// ── Alterar status ───────────────────────────────────────────
export async function updateActivityStatus(
  id: string,
  status: string
): Promise<Result> {
  const ctx = await requireStaff();
  if (!ctx) return { success: false, error: "Sem permissão" };

  const { supabase } = ctx;
  const kanban_column = statusToKanbanColumn(status);

  const { error } = await supabase
    .from("activities")
    .update({ status, kanban_column })
    .eq("id", id)
    .is("archived_at", null);

  if (error) {
    logger.error("updateActivityStatus", error.message);
    return { success: false, error: "Erro ao atualizar status" };
  }

  revalidateActivityPaths();
  return { success: true, data: undefined };
}

// ── Arquivar atividade ───────────────────────────────────────
export async function archiveActivity(id: string): Promise<Result> {
  const ctx = await requireStaff();
  if (!ctx) return { success: false, error: "Sem permissão" };

  const { supabase } = ctx;

  const { error } = await supabase
    .from("activities")
    .update({ archived_at: new Date().toISOString(), status: "arquivada" })
    .eq("id", id);

  if (error) {
    logger.error("archiveActivity", error.message);
    return { success: false, error: "Erro ao arquivar atividade" };
  }

  revalidateActivityPaths();
  return { success: true, data: undefined };
}

// ── Restaurar atividade arquivada ────────────────────────────
export async function restoreActivity(id: string): Promise<Result> {
  const ctx = await requireStaff();
  if (!ctx) return { success: false, error: "Sem permissão" };

  const { supabase } = ctx;

  const { error } = await supabase
    .from("activities")
    .update({ archived_at: null, status: "entrada", kanban_column: "entrada" })
    .eq("id", id);

  if (error) {
    logger.error("restoreActivity", error.message);
    return { success: false, error: "Erro ao restaurar atividade" };
  }

  revalidateActivityPaths();
  return { success: true, data: undefined };
}

// ── Excluir atividade (admin only) ───────────────────────────
export async function deleteActivity(id: string): Promise<void> {
  const ctx = await requireAdmin();
  if (!ctx) return;

  const { supabase } = ctx;

  const { error } = await supabase.from("activities").delete().eq("id", id);

  if (error) {
    logger.error("deleteActivity", error.message);
    return;
  }

  revalidateActivityPaths();
  redirect("/admin/atividades" as Route);
}
