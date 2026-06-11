import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/google/crypto';
import { exchangeCodeForTokens, fetchGoogleAccountEmail } from '@/lib/google/calendar';
import { logger } from '@/lib/logger';

function redirectToSettings(request: Request, status: 'conectado' | 'erro') {
  const url = new URL('/admin/configuracoes', request.url);
  url.searchParams.set('google_calendar', status);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || !['admin', 'equipe'].includes(profile.role)) {
    return NextResponse.redirect(new URL('/cliente', request.url));
  }

  const cookieState = request.headers
    .get('cookie')
    ?.split('; ')
    .find((c) => c.startsWith('google_oauth_state='))
    ?.split('=')[1];

  if (errorParam || !code || !state || !cookieState || state !== cookieState) {
    if (errorParam !== 'access_denied') {
      logger.error('googleOAuthCallback', `Falha na validação do callback: ${errorParam ?? 'state inválido'}`);
    }
    return redirectToSettings(request, 'erro');
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/google/oauth/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    if (!tokens.refresh_token) {
      logger.error('googleOAuthCallback', 'Google não retornou refresh_token (reconecte com prompt=consent)');
      return redirectToSettings(request, 'erro');
    }

    const email = await fetchGoogleAccountEmail(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { data: existing } = await supabase
      .from('google_calendar_connections')
      .select('id')
      .limit(1)
      .maybeSingle();

    const payload = {
      google_account_email: email ?? 'Conta Google',
      access_token_enc: encryptToken(tokens.access_token),
      refresh_token_enc: encryptToken(tokens.refresh_token),
      token_expires_at: expiresAt,
      sync_token: null,
      connected_by: profile.id,
    };

    if (existing) {
      await supabase.from('google_calendar_connections').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('google_calendar_connections').insert(payload);
    }

    const response = redirectToSettings(request, 'conectado');
    response.cookies.delete('google_oauth_state');
    return response;
  } catch (err) {
    logger.error('googleOAuthCallback', err instanceof Error ? err.message : 'Erro desconhecido');
    return redirectToSettings(request, 'erro');
  }
}
