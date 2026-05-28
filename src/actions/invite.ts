"use server";

import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireStaff() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!data || !["admin", "equipe"].includes(data.role)) return null;

  return data;
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function getPasswordRedirectUrl() {
  return `${getAppUrl()}/auth/callback?next=/definir-senha`;
}

async function sendInviteOrResetEmail(email: string, name: string) {
  const serviceClient = await getSupabaseServiceClient();
  const redirectTo = getPasswordRedirectUrl();

  const { error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: { name, role: "cliente" },
    redirectTo,
  });

  if (!inviteError) return { success: true as const };

  const { error: resetError } = await serviceClient.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (!resetError) return { success: true as const };

  return {
    success: false as const,
    error: resetError.message || inviteError.message || "Erro ao enviar convite",
  };
}

export async function inviteClientUser(
  clientId: string,
  email: string,
  name: string,
): Promise<Result> {
  const staff = await requireStaff();

  if (!staff) {
    return { success: false, error: "Sem permissão" };
  }

  const serviceClient = await getSupabaseServiceClient();
  const supabase = await getSupabaseServerClient();
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  const { data: existingProfile, error: profileLookupError } = await supabase
    .from("user_profiles")
    .select("id, name")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (profileLookupError) {
    return { success: false, error: "Erro ao buscar usuário" };
  }

  if (existingProfile) {
    if (cleanName && cleanName !== existingProfile.name) {
      await serviceClient
        .from("user_profiles")
        .update({ name: cleanName })
        .eq("id", existingProfile.id);
    }

    const { data: existingLink, error: linkLookupError } = await serviceClient
      .from("client_users")
      .select("id")
      .eq("client_id", clientId)
      .eq("user_id", existingProfile.id)
      .maybeSingle();

    if (linkLookupError) {
      return { success: false, error: "Erro ao verificar vínculo do usuário" };
    }

    if (!existingLink) {
      const { error: insertError } = await serviceClient
        .from("client_users")
        .insert({ client_id: clientId, user_id: existingProfile.id, role: "aprovador" });

      if (insertError) {
        return { success: false, error: "Erro ao vincular usuário ao cliente" };
      }
    }

    const emailResult = await sendInviteOrResetEmail(cleanEmail, cleanName || existingProfile.name);

    if (!emailResult.success) {
      return { success: false, error: emailResult.error };
    }

    revalidatePath(`/admin/clientes/${clientId}`);
    return { success: true, data: undefined };
  }

  const { data: inviteData, error: inviteError } =
    await serviceClient.auth.admin.inviteUserByEmail(cleanEmail, {
      data: { name: cleanName, role: "cliente" },
      redirectTo: getPasswordRedirectUrl(),
    });

  if (inviteError || !inviteData?.user) {
    const errCode = (inviteError as any)?.code ?? "";
    const errMsg = inviteError?.message ?? "Erro ao enviar convite";

    if (
      errCode === "unexpected_failure" ||
      errMsg.toLowerCase().includes("rate") ||
      errMsg.toLowerCase().includes("sending")
    ) {
      return {
        success: false,
        error:
          "Falha ao enviar e-mail. O SMTP padrão do Supabase pode ter atingido o limite — configure um SMTP próprio em Authentication → SMTP Settings.",
      };
    }

    return { success: false, error: errMsg };
  }

  await new Promise((resolve) => setTimeout(resolve, 300));

  const { data: newProfile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_user_id", inviteData.user.id)
    .maybeSingle();

  let profileId = newProfile?.id;

  if (!profileId) {
    const { data: manualProfile, error: profileError } = await serviceClient
      .from("user_profiles")
      .insert({ auth_user_id: inviteData.user.id, name: cleanName, email: cleanEmail, role: "cliente" })
      .select("id")
      .single();

    if (profileError || !manualProfile) {
      return {
        success: false,
        error: "Convite enviado, mas houve erro ao criar o perfil do cliente.",
      };
    }

    profileId = manualProfile.id;
  }

  const { error: linkError } = await serviceClient
    .from("client_users")
    .insert({ client_id: clientId, user_id: profileId, role: "aprovador" });

  if (linkError) {
    return {
      success: false,
      error: "Convite enviado, mas houve erro ao vincular o usuário ao cliente.",
    };
  }

  revalidatePath(`/admin/clientes/${clientId}`);
  return { success: true, data: undefined };
}

export async function removeClientAccess(
  clientUserId: string,
  clientId: string,
): Promise<Result> {
  const staff = await requireStaff();

  if (!staff) {
    return { success: false, error: "Sem permissão" };
  }

  const serviceClient = await getSupabaseServiceClient();

  const { error } = await serviceClient
    .from("client_users")
    .delete()
    .eq("id", clientUserId);

  if (error) {
    return { success: false, error: "Erro ao remover acesso" };
  }

  revalidatePath(`/admin/clientes/${clientId}`);
  return { success: true, data: undefined };
}
