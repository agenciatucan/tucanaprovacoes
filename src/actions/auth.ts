"use server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/schemas";
import { redirect } from "next/navigation";

type Result<T = void> = { success: true; data: T } | { success: false; error: string };

export async function signIn(input: unknown): Promise<Result> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  // Log detalhado no terminal do Next.js para debug
  if (error) {
    console.error("❌ Supabase signIn error:", {
      message: error.message,
      status: error.status,
      code: (error as any).code,
    });
    return { success: false, error: `Erro: ${error.message}` };
  }

  console.log("✅ Login OK:", data.user?.email, "role:", data.user?.user_metadata?.role);
  return { success: true, data: undefined };
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function verifyApprovalToken(
  token: string,
  email: string
): Promise<Result<{ campaign_id: string }>> {
  if (!token || token.length !== 64) {
    return { success: false, error: "Link inválido" };
  }

  const supabase = await getSupabaseServerClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, client_id, token_expires_at, status")
    .eq("approval_token", token)
    .single();

  if (!campaign) return { success: false, error: "Link inválido ou expirado" };
  if (new Date(campaign.token_expires_at) < new Date()) return { success: false, error: "Este link expirou." };
  if (campaign.status === "arquivado") return { success: false, error: "Este cronograma foi arquivado" };

  const { data: clientUser } = await supabase
    .from("client_users")
    .select("user_id")
    .eq("client_id", campaign.client_id)
    .maybeSingle();

  if (!clientUser) return { success: false, error: "Acesso não autorizado" };
  return { success: true, data: { campaign_id: campaign.id } };
}