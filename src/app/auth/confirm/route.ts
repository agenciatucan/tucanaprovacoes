// ============================================================
// Rota de confirmação de e-mail / convite
//
// Supabase envia o link de convite para:
//   https://seuapp.com/auth/confirm?token_hash=XXX&type=invite
//
// Esta rota troca o token por uma sessão (via cookie) e
// redireciona para /definir-senha onde o usuário cria a senha.
// ============================================================

import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// Rotas internas permitidas após confirmação de email/convite.
// Nunca aceitar URLs externas ou paths arbitrários do query string.
const ALLOWED_NEXT_PATHS = ['/definir-senha', '/admin', '/cliente'];

function getSafeNext(raw: string | null): string {
  if (!raw) return '/definir-senha';
  const trimmed = raw.trim();
  // Aceita apenas paths relativos internos da allowlist
  if (ALLOWED_NEXT_PATHS.includes(trimmed)) return trimmed;
  return '/definir-senha';
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type       = searchParams.get('type') as EmailOtpType | null;
  const next       = getSafeNext(searchParams.get('next'));

  if (token_hash && type) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    logger.error('auth/confirm', error.message);
  }

  return NextResponse.redirect(`${origin}/login?erro=link_invalido`);
}
