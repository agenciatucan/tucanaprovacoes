"use server";
// ============================================================
// SERVER ACTIONS — Gestão de equipe (admin only)
// ============================================================

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result<T = void> = { success: true; data: T } | { success: false; error: string };

async function requireAdmin(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("user_profiles").select("id, role").eq("auth_user_id", user.id).single();
  if (!data || data.role !== "admin") return null;
  return data;
}

// ── Alterar role de membro ───────────────────────────────────
// Permite mudar entre 'admin' e 'equipe'.
// Admin não pode alterar o próprio role (evita ficar sem admin).
export async function updateMemberRole(
  targetProfileId: string,
  newRole: "admin" | "equipe",
): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const me = await requireAdmin(supabase);
  if (!me) return { success: false, error: "Sem permissão" };

  if (me.id === targetProfileId) {
    return { success: false, error: "Você não pode alterar o próprio role" };
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ role: newRole })
    .eq("id", targetProfileId);

  if (error) return { success: false, error: "Erro ao atualizar permissão" };

  revalidatePath("/admin/configuracoes");
  return { success: true, data: undefined };
}

// ── Remover membro da equipe ────────────────────────────────
// Rebaixa o role para 'cliente' (soft remove — mantém o auth user e o perfil).
// Admin não pode remover a si mesmo.
export async function removeMember(targetProfileId: string): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const me = await requireAdmin(supabase);
  if (!me) return { success: false, error: "Sem permissão" };

  if (me.id === targetProfileId) {
    return { success: false, error: "Você não pode remover a si mesmo" };
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ role: "cliente" })
    .eq("id", targetProfileId);

  if (error) return { success: false, error: "Erro ao remover membro" };

  revalidatePath("/admin/configuracoes");
  return { success: true, data: undefined };
}
