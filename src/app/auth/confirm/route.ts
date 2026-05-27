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

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type       = searchParams.get('type') as EmailOtpType | null;
  const next       = searchParams.get('next') ?? '/definir-senha';

  if (token_hash && type) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      // Sessão criada com sucesso — redirecionar para definir senha
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error('[auth/confirm] verifyOtp error:', error.message);
  }

  // Token inválido ou expirado
  return NextResponse.redirect(`${origin}/login?erro=link_invalido`);
}
