import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { GOOGLE_OAUTH_SCOPE } from '@/lib/google/calendar';

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || !['admin', 'equipe'].includes(profile.role)) {
    return NextResponse.redirect(new URL('/cliente', request.url));
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/google/oauth/callback`;
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_OAUTH_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });

  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}
