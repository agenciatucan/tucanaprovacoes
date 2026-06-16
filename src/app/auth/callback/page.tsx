'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

function CallbackCard({ msg }: { msg: string }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f6f6f6',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 18,
          background: '#fff',
          border: '1px solid #e5e5e5',
          padding: 28,
          textAlign: 'center',
          boxShadow: '0 16px 40px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: '#25411e',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontWeight: 700,
          }}
        >
          T
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 22,
            lineHeight: 1.2,
            letterSpacing: '-0.03em',
            color: '#1f1f1f',
          }}
        >
          Confirmando acesso
        </h1>

        <p
          style={{
            margin: '10px 0 0',
            fontSize: 14,
            lineHeight: 1.5,
            color: '#666',
          }}
        >
          {msg}
        </p>
      </div>
    </main>
  );
}

function navigate(path: string) {
  window.location.href = path;
}

function AuthCallbackContent() {
  const searchParams = useSearchParams();

  const [msg, setMsg] = useState('Confirmando acesso…');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setMsg('A confirmação está demorando mais que o esperado. Verifique sua conexão.');
      navigate('/login?erro=timeout');
    }, 15000);

    async function handleCallback() {
      const supabase = getSupabaseBrowserClient();

      const nextParam = searchParams.get('next');

      const next =
        nextParam && nextParam.startsWith('/')
          ? nextParam
          : '/cliente';

      try {
        const url = new URL(window.location.href);

        const code = url.searchParams.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (!error) {
            clearTimeout(timeout);
            setMsg('Acesso confirmado! Redirecionando…');
            navigate(next);
            return;
          }
        }

        const hash = window.location.hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(hash);

        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        const errorDescription =
          hashParams.get('error_description') ||
          url.searchParams.get('error_description');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!error) {
            clearTimeout(timeout);
            setMsg('Acesso confirmado! Redirecionando…');
            navigate(next);
            return;
          }
        }

        clearTimeout(timeout);

        if (errorDescription) {
          setMsg('Link inválido ou expirado. Solicite um novo acesso.');
          navigate('/login?erro=link_invalido');
          return;
        }

        setMsg('Link inválido ou expirado. Solicite um novo acesso.');
        navigate('/login?erro=link_invalido');
      } catch {
        clearTimeout(timeout);
        setMsg('Erro ao confirmar acesso. Tente novamente.');
        navigate('/login?erro=callback');
      }
    }

    handleCallback();

    return () => clearTimeout(timeout);
  }, [searchParams]);

  return <CallbackCard msg={msg} />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackCard msg="Confirmando acesso…" />}>
      <AuthCallbackContent />
    </Suspense>
  );
}