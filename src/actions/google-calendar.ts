"use server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
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

export async function disconnectGoogleCalendar(): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { data: existing } = await supabase
    .from("google_calendar_connections")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("google_calendar_connections").delete().eq("id", existing.id);
    if (error) {
      logger.error("disconnectGoogleCalendar", error.message);
      return { success: false, error: "Erro ao desconectar o Google Agenda" };
    }
  }

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/calendario");
  return { success: true, data: undefined };
}
