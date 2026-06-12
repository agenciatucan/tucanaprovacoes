"use server";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { clientSchema, type ClientInput } from "@/lib/validations/schemas";
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

async function requireAdmin(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!data || data.role !== "admin") return null;
  return data;
}

export async function uploadClientLogo(formData: FormData): Promise<Result<{ url: string }>> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const file = formData.get("file") as File | null;
  if (!file || !file.size) return { success: false, error: "Nenhum arquivo enviado" };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${crypto.randomUUID()}.${ext}`;

  const serviceClient = await getSupabaseServiceClient();
  const { error } = await serviceClient.storage
    .from("client-logos")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    logger.error("uploadClientLogo", error.message);
    return { success: false, error: "Erro ao fazer upload da logo" };
  }

  const { data: { publicUrl } } = serviceClient.storage
    .from("client-logos")
    .getPublicUrl(path);

  return { success: true, data: { url: publicUrl } };
}

export async function createClient(input: ClientInput): Promise<Result<{ id: string }>> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  // Verificar e-mail duplicado
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("email", parsed.data.email)
    .maybeSingle();

  if (existing) return { success: false, error: "Já existe um cliente com este e-mail" };

  const { data, error } = await supabase
    .from("clients")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error || !data) return { success: false, error: "Erro ao criar cliente" };

  revalidatePath("/admin/clientes");
  return { success: true, data: { id: data.id } };
}

export async function updateClient(id: string, input: ClientInput): Promise<Result> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { error } = await supabase
    .from("clients")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { success: false, error: "Erro ao atualizar cliente" };

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${id}`);
  return { success: true, data: undefined };
}

// ── Inativação em cascata (via RPC PostgreSQL) ────────────────
// Arquiva o cliente + todos os cronogramas ativos em uma transação no banco.
export async function inactivateClient(clientId: string): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { error } = await supabase.rpc("inactivate_client", {
    p_client_id: clientId,
  });

  if (error) {
    logger.error("inactivateClient", error.message);
    return { success: false, error: error.message ?? "Erro ao inativar cliente" };
  }

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${clientId}`);
  revalidatePath("/admin/cronogramas");
  return { success: true, data: undefined };
}

// ── Reativação (somente o cliente — cronogramas ficam arquivados) ─
export async function reactivateClient(clientId: string): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { error } = await supabase.rpc("reactivate_client", {
    p_client_id: clientId,
  });

  if (error) {
    logger.error("reactivateClient", error.message);
    return { success: false, error: error.message ?? "Erro ao reativar cliente" };
  }

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${clientId}`);
  return { success: true, data: undefined };
}

// ── Exclusão definitiva (apenas admin) ────────────────────────
// Remove o cliente e, em cascata, todos os cronogramas, conteúdos,
// aprovações, comentários, arquivos e acessos vinculados a ele.
export async function deleteClient(clientId: string): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireAdmin(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId);

  if (error) {
    logger.error("deleteClient", error.message);
    return { success: false, error: "Erro ao excluir cliente" };
  }

  revalidatePath("/admin/clientes");
  revalidatePath("/admin");
  revalidatePath("/admin/cronogramas");
  revalidatePath("/admin/kanban");
  revalidatePath("/admin/calendario");
  return { success: true, data: undefined };
}
