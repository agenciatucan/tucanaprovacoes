"use server";
// ============================================================
// SERVER ACTIONS - Gestao de equipe interna
// ============================================================

import {
  getSupabaseServerClient,
  getSupabaseServiceClient,
} from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

type TeamRole = "admin" | "equipe";

type Result<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireAdmin(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!data || data.role !== "admin") return null;

  return data;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getTeamInviteRedirectUrl() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  return `${appUrl}/auth/callback?next=/definir-senha`;
}

async function countAdmins(
  serviceClient: Awaited<ReturnType<typeof getSupabaseServiceClient>>
) {
  const { count } = await serviceClient
    .from("user_profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");

  return count ?? 0;
}

// Convidar novo membro interno.
// Cria/convida usuario com role admin ou equipe.
// Se o usuario ja existir, atualiza o role e envia link para criar/redefinir senha.
export async function inviteTeamMember(input: {
  name: string;
  email: string;
  role: TeamRole;
}): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const me = await requireAdmin(supabase);

  if (!me) {
    return { success: false, error: "Sem permissão" };
  }

  const serviceClient = await getSupabaseServiceClient();

  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const role: TeamRole = input.role === "admin" ? "admin" : "equipe";

  if (!name) {
    return { success: false, error: "Informe o nome do usuário" };
  }

  if (!email || !email.includes("@")) {
    return { success: false, error: "Informe um e-mail válido" };
  }

  const redirectTo = getTeamInviteRedirectUrl();

  const { data: existingProfile, error: existingProfileError } =
    await serviceClient
      .from("user_profiles")
      .select("id, auth_user_id, name, email, role")
      .eq("email", email)
      .maybeSingle();

  if (existingProfileError) {
    logger.error("inviteTeamMember/existingProfile", existingProfileError.message);

    return {
      success: false,
      error: "Erro ao verificar usuário existente",
    };
  }

  if (existingProfile) {
    const { error: updateError } = await serviceClient
      .from("user_profiles")
      .update({
        name,
        role,
      })
      .eq("id", existingProfile.id);

    if (updateError) {
      logger.error("inviteTeamMember/updateProfile", updateError.message);

      return {
        success: false,
        error: "Erro ao atualizar o usuário existente",
      };
    }

    const { error: inviteError } =
      await serviceClient.auth.admin.inviteUserByEmail(email, {
        data: { name, role },
        redirectTo,
      });

    if (inviteError) {
      const { error: resetError } =
        await serviceClient.auth.resetPasswordForEmail(email, {
          redirectTo,
        });

      if (resetError) {
        logger.error("inviteTeamMember/resetUser", resetError.message);

        return {
          success: false,
          error:
            "Usuário atualizado, mas não foi possível enviar o e-mail de acesso",
        };
      }
    }

    revalidatePath("/admin/configuracoes");

    return { success: true, data: undefined };
  }

  const { data: inviteData, error: inviteError } =
    await serviceClient.auth.admin.inviteUserByEmail(email, {
      data: { name, role },
      redirectTo,
    });

  if (inviteError || !inviteData?.user) {
    logger.error("inviteTeamMember/invite", inviteError?.message);

    return {
      success: false,
      error: inviteError?.message ?? "Erro ao enviar convite",
    };
  }

  // Aguarda o trigger do Supabase criar o user_profiles.
  await new Promise((resolve) => setTimeout(resolve, 300));

  const { data: profileFromTrigger, error: triggerLookupError } =
    await serviceClient
      .from("user_profiles")
      .select("id")
      .eq("auth_user_id", inviteData.user.id)
      .maybeSingle();

  if (triggerLookupError) {
    logger.error("inviteTeamMember/triggerLookup", triggerLookupError.message);
  }

  if (profileFromTrigger) {
    const { error: updateRoleError } = await serviceClient
      .from("user_profiles")
      .update({
        name,
        email,
        role,
      })
      .eq("id", profileFromTrigger.id);

    if (updateRoleError) {
      logger.error("inviteTeamMember/updateRole", updateRoleError.message);

      return {
        success: false,
        error: "Convite enviado, mas houve erro ao atualizar a permissão",
      };
    }

    revalidatePath("/admin/configuracoes");

    return { success: true, data: undefined };
  }

  // Fallback: cria o perfil manualmente se o trigger nao rodou.
  const { error: manualProfileError } = await serviceClient
    .from("user_profiles")
    .insert({
      auth_user_id: inviteData.user.id,
      name,
      email,
      role,
    });

  if (manualProfileError) {
    logger.error("inviteTeamMember/manualProfile", manualProfileError.message);

    return {
      success: false,
      error: "Convite enviado, mas houve erro ao criar o perfil do usuário",
    };
  }

  revalidatePath("/admin/configuracoes");

  return { success: true, data: undefined };
}

// Reenviar convite/acesso.
export async function resendTeamInvite(
  targetProfileId: string
): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const me = await requireAdmin(supabase);

  if (!me) {
    return { success: false, error: "Sem permissão" };
  }

  const serviceClient = await getSupabaseServiceClient();

  const { data: profile, error: profileError } = await serviceClient
    .from("user_profiles")
    .select("name, email, role")
    .eq("id", targetProfileId)
    .maybeSingle();

  if (profileError) {
    logger.error("resendTeamInvite/profile", profileError.message);

    return {
      success: false,
      error: "Erro ao buscar usuário",
    };
  }

  if (!profile) {
    return { success: false, error: "Usuário não encontrado" };
  }

  if (!profile.email) {
    return { success: false, error: "Usuário sem e-mail cadastrado" };
  }

  if (!["admin", "equipe"].includes(profile.role)) {
    return {
      success: false,
      error: "Este usuário não faz parte da equipe interna",
    };
  }

  const redirectTo = getTeamInviteRedirectUrl();

  const { error: inviteError } =
    await serviceClient.auth.admin.inviteUserByEmail(profile.email, {
      data: {
        name: profile.name,
        role: profile.role,
      },
      redirectTo,
    });

  if (inviteError) {
    const { error: resetError } =
      await serviceClient.auth.resetPasswordForEmail(profile.email, {
        redirectTo,
      });

    if (resetError) {
      logger.error("resendTeamInvite/reset", resetError.message);

      return {
        success: false,
        error: "Não foi possível reenviar o acesso",
      };
    }
  }

  return { success: true, data: undefined };
}

// Alterar role de membro.
// Permite mudar entre admin e equipe.
// Admin nao pode alterar o proprio role.
// Tambem impede deixar o sistema sem nenhum admin.
export async function updateMemberRole(
  targetProfileId: string,
  newRole: TeamRole
): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const me = await requireAdmin(supabase);

  if (!me) {
    return { success: false, error: "Sem permissão" };
  }

  if (me.id === targetProfileId) {
    return {
      success: false,
      error: "Você não pode alterar o próprio acesso",
    };
  }

  const serviceClient = await getSupabaseServiceClient();

  const { data: targetProfile, error: targetError } = await serviceClient
    .from("user_profiles")
    .select("id, role")
    .eq("id", targetProfileId)
    .maybeSingle();

  if (targetError) {
    logger.error("updateMemberRole/target", targetError.message);

    return {
      success: false,
      error: "Erro ao buscar usuário",
    };
  }

  if (!targetProfile) {
    return { success: false, error: "Usuário não encontrado" };
  }

  if (targetProfile.role === "admin" && newRole !== "admin") {
    const adminCount = await countAdmins(serviceClient);

    if (adminCount <= 1) {
      return {
        success: false,
        error: "Não é possível remover o último admin do sistema",
      };
    }
  }

  const { error } = await serviceClient
    .from("user_profiles")
    .update({ role: newRole })
    .eq("id", targetProfileId);

  if (error) {
    logger.error("updateMemberRole/update", error.message);

    return {
      success: false,
      error: "Erro ao atualizar permissão",
    };
  }

  revalidatePath("/admin/configuracoes");

  return { success: true, data: undefined };
}

// Remover membro da equipe.
// Aqui o usuario nao e deletado do Auth; apenas deixa de ser admin/equipe.
// Ele passa para role cliente.
export async function removeMember(targetProfileId: string): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const me = await requireAdmin(supabase);

  if (!me) {
    return { success: false, error: "Sem permissão" };
  }

  if (me.id === targetProfileId) {
    return {
      success: false,
      error: "Você não pode remover a si mesmo",
    };
  }

  const serviceClient = await getSupabaseServiceClient();

  const { data: targetProfile, error: targetError } = await serviceClient
    .from("user_profiles")
    .select("id, role")
    .eq("id", targetProfileId)
    .maybeSingle();

  if (targetError) {
    logger.error("removeMember/target", targetError.message);

    return {
      success: false,
      error: "Erro ao buscar usuário",
    };
  }

  if (!targetProfile) {
    return { success: false, error: "Usuário não encontrado" };
  }

  if (targetProfile.role === "admin") {
    const adminCount = await countAdmins(serviceClient);

    if (adminCount <= 1) {
      return {
        success: false,
        error: "Não é possível remover o último admin do sistema",
      };
    }
  }

  const { error } = await serviceClient
    .from("user_profiles")
    .update({ role: "cliente" })
    .eq("id", targetProfileId);

  if (error) {
    logger.error("removeMember/update", error.message);

    return {
      success: false,
      error: "Erro ao remover membro",
    };
  }

  revalidatePath("/admin/configuracoes");

  return { success: true, data: undefined };
}