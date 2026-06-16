"use server";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/schemas";
import { redirect } from "next/navigation";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

type Result<T = void> = { success: true; data: T } | { success: false; error: string };

export async function signIn(input: unknown): Promise<Result> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  // Rate limit: máximo 10 tentativas por email a cada 15 minutos
  const rl = await checkRateLimit({
    key: parsed.data.email.toLowerCase(),
    action: 'signIn',
    limit: 10,
    windowSeconds: 900,
  });
  if (!rl.allowed) {
    return { success: false, error: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente." };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    logger.error("signIn", { message: error.message, status: error.status });
    return { success: false, error: `Erro: ${error.message}` };
  }

  return { success: true, data: undefined };
}

// Action ligada diretamente ao `action` do <form> de login (além do onSubmit
// client-side). Isso garante que, se o usuário tocar em "Entrar" antes do React
// hidratar no celular (conexão lenta + autopreenchimento de senha), o navegador
// faça um POST de verdade para esta action — em vez do submit nativo padrão
// (GET para a própria URL com email/senha como query string, expondo a senha
// na barra de endereço e recarregando a página com o formulário vazio).
export async function signInFormAction(formData: FormData): Promise<void> {
  const result = await signIn({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    redirect(`/login?error=${encodeURIComponent(result.error)}`);
  }

  // Após login bem-sucedido, redireciona para a rota apropriada baseado na role
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();
    
    if (profile && ['admin', 'equipe'].includes(profile.role)) {
      redirect('/admin');
    }
  }
  
  redirect('/cliente');
}

// Recuperação de senha via service role (sem PKCE — funciona em qualquer browser)
export async function requestPasswordReset(email: string): Promise<Result> {
  if (!email?.trim()) return { success: false, error: "E-mail obrigatório" };

  // Rate limit: máximo 5 solicitações por e-mail a cada 15 minutos
  const rl = await checkRateLimit({
    key: email.trim().toLowerCase(),
    action: 'passwordReset',
    limit: 5,
    windowSeconds: 900,
  });
  if (!rl.allowed) {
    return { success: false, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };
  }

  const serviceClient = await getSupabaseServiceClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await serviceClient.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${appUrl}/auth/callback?next=/definir-senha`,
  });

  if (error) {
    logger.error("requestPasswordReset", error.message);
    // Não expor se o e-mail existe ou não (segurança)
    return { success: true, data: undefined };
  }

  return { success: true, data: undefined };
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Atualiza a senha do usuário após convite ou redefinição.
//
// accessToken (opcional): token JWT do hash da URL (/definir-senha#access_token=...).
//   Quando presente, o service client verifica o token e atualiza via admin API —
//   sem depender de setSession nem de sessão nos cookies. Isso elimina a chamada
//   _getUser que travava em webviews de e-mail e conexões lentas.
//
// Sem accessToken: usa a sessão do servidor nos cookies HttpOnly (fluxo normal
//   após autenticação completa via /auth/callback).
export async function updatePassword(password: string, accessToken?: string): Promise<Result> {
  if (!password || password.length < 8) {
    return { success: false, error: "A senha precisa ter pelo menos 8 caracteres" };
  }

  if (accessToken) {
    const serviceClient = await getSupabaseServiceClient();

    const { data: { user }, error: userError } = await serviceClient.auth.getUser(accessToken);
    if (userError || !user) {
      logger.error("updatePassword:getUser", userError?.message ?? "user not found");
      return { success: false, error: "Link de acesso inválido ou expirado. Solicite um novo." };
    }

    const { error } = await serviceClient.auth.admin.updateUserById(user.id, { password });
    if (error) {
      logger.error("updatePassword:admin", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: undefined };
  }

  // Fallback: sessão nos cookies HttpOnly (set pelo Route Handler /auth/callback)
  const supabase = await getSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: "Sessão não encontrada. Solicite um novo link de acesso." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    logger.error("updatePassword", error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data: undefined };
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