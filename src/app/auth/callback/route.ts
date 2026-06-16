// ============================================================
// Rota de callback de autenticação — server-side
//
// Supabase redireciona para cá após verificar um convite ou
// link de redefinição de senha, incluindo um código PKCE na
// query string: ?code=CODE&next=/definir-senha
//
// A troca do código acontece no servidor (sem depender de
// JavaScript no browser do cliente). Em seguida, os tokens
// são passados para a página de destino via hash fragment
// para que o formulário client-side possa estabelecer a
// sessão local.
// ============================================================

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const ALLOWED_NEXT_PATHS = ['/definir-senha', '/admin', '/cliente'];

function getSafeNext(raw: string | null): string {
  if (!raw) return '/cliente';
  const trimmed = raw.trim();
  if (ALLOWED_NEXT_PATHS.includes(trimmed)) return trimmed;
  return '/cliente';
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = getSafeNext(searchParams.get('next'));

  if (code) {
    try {
      const supabase = await getSupabaseServerClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data?.session) {
        const { access_token, refresh_token } = data.session;
        const hash = `#access_token=${encodeURIComponent(access_token)}&refresh_token=${encodeURIComponent(refresh_token)}`;
        return NextResponse.redirect(`${origin}${next}${hash}`);
      }

      logger.error('auth/callback', error?.message ?? 'sessão não retornada');
    } catch (err: any) {
      logger.error('auth/callback', err?.message ?? String(err));
    }
  }

  // Sem código ou troca falhou — redireciona para /definir-senha
  // onde o usuário pode solicitar um novo link de acesso.
  return NextResponse.redirect(`${origin}/definir-senha`);
}
