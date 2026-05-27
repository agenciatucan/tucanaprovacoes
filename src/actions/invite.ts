"use server";
// ============================================================
// SERVER ACTIONS — Convite de clientes ao portal
// Usa getSupabaseServiceClient (service role) para poder chamar
// auth.admin.inviteUserByEmail que requer privilégios admin.
// ============================================================

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

function getPasswordRedirectUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/auth/callback?next=/definir-senha`;
}

// ── Convidar usuário para o portal do cliente ────────────────
export async function inviteClientUser(
  clientId: string,
  email: string,
  name: string,
): Promise<Result> {
  console.log("[inviteClientUser] START", { clientId, email, name });

  const staff = await requireStaff();

  if (!staff) {
    console.log("[inviteClientUser] BLOCKED: requireStaff returned null");
    return { success: false, error: "Sem permissão" };
  }

  console.log("[inviteClientUser] staff ok:", staff.id, staff.role);

  const serviceClient = await getSupabaseServiceClient();
  const supabase = await getSupabaseServerClient();
  const redirectTo = getPasswordRedirectUrl();

  // Verificar se já existe perfil com este e-mail
  const { data: existingProfile, error: profileLookupError } = await supabase
    .from("user_profiles")
    .select("id, name")
    .eq("email", email)
    .maybeSingle();

  if (profileLookupError) {
    console.error("[inviteClientUser] profile lookup error:", profileLookupError.message);
  }

  console.log("[inviteClientUser] existingProfile:", existingProfile);

  if (existingProfile) {
    // Atualizar nome se foi informado um diferente
    if (name && name !== existingProfile.name) {
      await supabase
        .from("user_profiles")
        .update({ name })
        .eq("id", existingProfile.id);
    }

    // Checar se já tem acesso a este cliente (usa serviceClient para contornar RLS)
    const { data: existingLink, error: linkLookupError } = await serviceClient
      .from("client_users")
      .select("id")
      .eq("client_id", clientId)
      .eq("user_id", existingProfile.id)
      .maybeSingle();

    if (linkLookupError) {
      console.error("[inviteClientUser] existingLink lookup error:", linkLookupError.message);
    }

    console.log("[inviteClientUser] existingLink:", existingLink);

    if (existingLink) {
      // Tenta reenviar convite (funciona para usuários ainda não confirmados)
      const { error: resendError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
        data: { name: name || existingProfile.name, role: "cliente" },
        redirectTo,
      });

      if (resendError) {
        console.warn("[inviteClientUser] resend invite failed:", resendError.message);

        // Fallback: usuário já confirmou o email mas não criou senha
        const { error: resetError } = await serviceClient.auth.resetPasswordForEmail(email, {
          redirectTo,
        });

        if (resetError) {
          console.warn("[inviteClientUser] reset also failed:", resetError.message);
          return { success: false, error: "Este e-mail já tem acesso ativo ao portal" };
        }

        console.log("[inviteClientUser] password reset email sent for confirmed user");
        revalidatePath(`/admin/clientes/${clientId}`);
        return { success: true, data: undefined };
      }

      console.log("[inviteClientUser] SUCCESS (resend invite, unconfirmed user)");
      revalidatePath(`/admin/clientes/${clientId}`);
      return { success: true, data: undefined };
    }

    // Perfil existe mas sem vínculo com este cliente — apenas criar o vínculo
    console.log("[inviteClientUser] inserting client_users with serviceClient...");

    const { error: insertError } = await serviceClient
      .from("client_users")
      .insert({ client_id: clientId, user_id: existingProfile.id, role: "aprovador" });

    if (insertError) {
      console.error("[inviteClientUser] client_users insert error:", JSON.stringify(insertError));
      return { success: false, error: "Erro ao vincular usuário" };
    }

    // Reenviar convite — se falhar, usa reset de senha como fallback
    const { error: reinviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
      data: { name: name || existingProfile.name, role: "cliente" },
      redirectTo,
    });

    if (reinviteError) {
      console.warn("[inviteClientUser] reinvite failed, falling back to reset:", reinviteError.message);

      const { error: resetError } = await serviceClient.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetError) {
        console.warn("[inviteClientUser] reset also failed:", resetError.message);
        // Link criado mas sem e-mail — retorna sucesso mesmo assim para não bloquear o admin
      }
    }

    console.log("[inviteClientUser] SUCCESS (existing profile, new link)");
    revalidatePath(`/admin/clientes/${clientId}`);
    return { success: true, data: undefined };
  }

  // Novo usuário — enviar convite por e-mail
  console.log("[inviteClientUser] new user — sending invite email...");

  const { data: inviteData, error: inviteError } =
    await serviceClient.auth.admin.inviteUserByEmail(email, {
      data: { name, role: "cliente" },
      redirectTo,
    });

  if (inviteError || !inviteData?.user) {
    const errCode = (inviteError as any)?.code ?? "";
    const errMsg = inviteError?.message ?? String(inviteError) ?? "Erro ao enviar convite";

    console.error("[inviteClientUser] invite error:", errMsg, inviteError);

    // SMTP padrão falhando (rate limit ou indisponível)
    if (
      errCode === "unexpected_failure" ||
      errMsg.toLowerCase().includes("rate") ||
      errMsg.toLowerCase().includes("sending")
    ) {
      return {
        success: false,
        error:
          "Falha ao enviar e-mail. O SMTP padrão do Supabase atingiu o limite — configure o Resend em Authentication → SMTP Settings.",
      };
    }

    return { success: false, error: errMsg };
  }

  console.log("[inviteClientUser] invite sent, auth user id:", inviteData.user.id);

  // O trigger já criou o user_profiles — buscar pelo auth_user_id
  await new Promise((r) => setTimeout(r, 300));

  const { data: newProfile, error: newProfileError } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_user_id", inviteData.user.id)
    .single();

  if (newProfileError) {
    console.error("[inviteClientUser] newProfile lookup error:", newProfileError.message);
  }

  console.log("[inviteClientUser] newProfile:", newProfile);

  if (!newProfile) {
    // Fallback: criar o perfil manualmente se o trigger não disparou
    console.log("[inviteClientUser] trigger didn't fire, creating profile manually...");

    const { data: manualProfile, error: profileError } = await serviceClient
      .from("user_profiles")
      .insert({ auth_user_id: inviteData.user.id, name, email, role: "cliente" })
      .select("id")
      .single();

    if (profileError || !manualProfile) {
      console.error("[inviteClientUser] manual profile error:", profileError?.message);
      return {
        success: false,
        error: "Convite enviado, mas erro ao criar perfil. Contate o suporte.",
      };
    }

    console.log("[inviteClientUser] manual profile created:", manualProfile.id);

    const { error: linkError } = await serviceClient
      .from("client_users")
      .insert({ client_id: clientId, user_id: manualProfile.id, role: "aprovador" });

    if (linkError) {
      console.error("[inviteClientUser] link error (manual):", JSON.stringify(linkError));
      return {
        success: false,
        error: "Convite enviado, mas erro ao vincular cliente.",
      };
    }

    console.log("[inviteClientUser] SUCCESS (new user, manual profile)");
    revalidatePath(`/admin/clientes/${clientId}`);
    return { success: true, data: undefined };
  }

  // Criar vínculo client_users
  console.log("[inviteClientUser] creating client_users link for profile:", newProfile.id);

  const { error: linkError } = await serviceClient
    .from("client_users")
    .insert({ client_id: clientId, user_id: newProfile.id, role: "aprovador" });

  if (linkError) {
    console.error("[inviteClientUser] link error:", JSON.stringify(linkError));
    return {
      success: false,
      error: "Convite enviado, mas erro ao vincular ao cliente.",
    };
  }

  console.log("[inviteClientUser] SUCCESS (new user, trigger profile)");
  revalidatePath(`/admin/clientes/${clientId}`);
  return { success: true, data: undefined };
}

// ── Remover acesso de um usuário ao cliente ──────────────────
export async function removeClientAccess(
  clientUserId: string,
  clientId: string,
): Promise<Result> {
  console.log("[removeClientAccess] START", { clientUserId, clientId });

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
    console.error("[removeClientAccess] delete error:", JSON.stringify(error));
    return { success: false, error: "Erro ao remover acesso" };
  }

  console.log("[removeClientAccess] SUCCESS");
  revalidatePath(`/admin/clientes/${clientId}`);
  return { success: true, data: undefined };
}