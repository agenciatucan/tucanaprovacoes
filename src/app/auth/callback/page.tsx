'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [msg, setMsg] = useState('Verificando acesso…');

  useEffect(() => {
    async function handleCallback() {
      const supabase = getSupabaseBrowserClient();
      const searchParams = new URLSearchParams(window.location.search);
      const next = searchParams.get('next') ?? '/definir-senha';
      const code = searchParams.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
          setMsg('Acesso confirmado! Redirecionando…');
          router.replace(next);
          return;
        }

        setMsg('Link inválido ou expirado. Redirecionando…');
        setTimeout(() => router.replace('/login?erro=link_invalido'), 1500);
        return;
      }

      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error) {
          setMsg('Acesso confirmado! Redirecionando…');
          router.replace(next);
          return;
        }
      }

      setMsg('Link inválido ou expirado. Redirecionando…');
      setTimeout(() => router.replace('/login?erro=link_invalido'), 1500);
    }

    handleCallback();
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        background: '#fff',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '3px solid #16a34a',
          borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p style={{ color: '#6b7280', fontSize: 14 }}>{msg}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
