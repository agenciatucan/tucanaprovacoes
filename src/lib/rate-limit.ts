// Rate limiting leve usando o banco de dados (Supabase).
// Funciona em ambientes serverless/edge (sem estado em memória).
//
// Estratégia: conta registros na tabela `audit_logs` (ou tabela dedicada)
// dentro de uma janela de tempo. Se exceder o limite, rejeita a ação.
//
// Para produção com alto volume, substitua por Upstash Redis + @upstash/ratelimit.

import { getSupabaseServiceClient } from '@/lib/supabase/server';

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

interface RateLimitOptions {
  /** Identificador único do sujeito (IP, email, campaign_id, etc.) */
  key: string;
  /** Nome da ação para agrupar contagens (ex: 'signIn', 'publicApproval') */
  action: string;
  /** Máximo de tentativas permitidas na janela */
  limit: number;
  /** Duração da janela em segundos */
  windowSeconds: number;
}

export async function checkRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const { key, action, limit, windowSeconds } = opts;

  try {
    const supabase = await getSupabaseServiceClient();
    const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

    // Conta tentativas recentes para este par (action, key)
    const { count } = await supabase
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .eq('action', `rate_limit:${action}`)
      .eq('target_id', key)
      .gte('created_at', windowStart);

    if ((count ?? 0) >= limit) {
      return { allowed: false, retryAfterSeconds: windowSeconds };
    }

    // Registra esta tentativa
    await supabase.from('audit_logs').insert({
      action: `rate_limit:${action}`,
      target_id: key,
      target_type: 'rate_limit',
    });

    return { allowed: true };
  } catch {
    // Se o rate limiter falhar (ex: tabela inexistente), permitir a ação.
    // Melhor falha aberta do que bloquear usuários legítimos.
    return { allowed: true };
  }
}
