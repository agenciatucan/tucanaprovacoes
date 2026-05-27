'use client';
// ============================================================
// Callback universal de auth — trata dois formatos de link:
//
// 1. PKCE (resetPasswordForEmail via browser client):
//    /auth/callback?code=XXX → exchangeCodeForSession(code)
//
// 2. Implicit / hash fragment (serviceClient resetPasswordForEmail):
//    /auth/callback#access_token=XXX&refresh_token=XXX → setSession()
//
// Em ambos os casos, redireciona para /definir-senha após criar sessão.
// ============================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router  = useRouter();
  const [msg, setMsg] = useState('Verificando acesso…');

  useEffect(() => {
    async function handleCallback() {
      const supabase = getSupabaseBrowserClient();

      // ── Caso 1: PKCE — código na query string ───────────────
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          setMsg('Acesso confirmado! Redirecionando…');
          router.push('/definir-senha');
          return;
        }
        console.error('[auth/callback] exchangeCode error:', error.message);
        setMsg('Link inválido ou expirado. Redirecionando…');
        setTimeout(() => router.push('/login?erro=link_invalido'), 1500);
        return;
      }

      // ── Caso 2: Implicit — tokens no hash fragment ──────────
      const hash   = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken  = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) {
          setMsg('Acesso confirmado! Redirecionando…');
          router.push('/definir-senha');
          return;
        }
        console.error('[auth/callback] setSession error:', error.message);
      }

      // ── Sem parâmetros válidos ───────────────────────────────
      setMsg('Link inválido ou expirado. Redirecionando…');
      setTimeout(() => router.push('/login?erro=link_invalido'), 1500);
    }

    handleCallback();
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
      background: '#fff',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid #16a34a',
        borderTopColor: 'transparent',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: '#6b7280', fontSize: 14 }}>{msg}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
