'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Props {
  userRole: string;
}

export default function SetPasswordForm({ userRole }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function createSessionFromUrl() {
      const supabase = getSupabaseBrowserClient();
      const hash = window.location.hash;

      if (hash) {
        const params = new URLSearchParams(hash.replace('#', ''));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            toast.error(`Erro ao validar o link: ${error.message}`);
            setSessionReady(false);
            setCheckingSession(false);
            return;
          }

          window.history.replaceState(null, '', window.location.pathname);
          setSessionReady(true);
          setCheckingSession(false);
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Se o cliente não tem sessão local, tente checar a sessão server-side
      // via endpoint que lê os cookies HttpOnly configurados por `verifyOtp`.
      if (!session) {
        try {
          const res = await fetch('/api/auth/session');
          if (res.ok) {
            const json = await res.json();
            setSessionReady(!!json.hasSession);
            setCheckingSession(false);
            return;
          }
        } catch (e) {
          // ignore and fallback
        }
      }

      setSessionReady(!!session);
      setCheckingSession(false);
    }

    createSessionFromUrl();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('A senha precisa ter pelo menos 8 caracteres');
      return;
    }

    if (password !== confirm) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);

    const supabase = getSupabaseBrowserClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      toast.error('Sessão não encontrada. Solicite um novo link de acesso.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(`Erro: ${error.message}`);
      setLoading(false);
      return;
    }

    toast.success('Senha criada! Redirecionando…');

    setTimeout(() => {
      router.push(userRole === 'admin' || userRole === 'equipe' ? '/admin' : '/cliente');
    }, 800);
  }

  const strength =
    password.length === 0
      ? 0
      : password.length < 8
        ? 1
        : password.length < 12
          ? 2
          : 3;

  const strengthLabel = ['', 'Fraca', 'Boa', 'Forte'];
  const strengthColor = ['', '#b91c1c', 'var(--orange)', 'var(--green)'];

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!sessionReady && (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: checkingSession ? '#f6f6f6' : '#fff7ed',
            border: checkingSession ? '1px solid var(--line)' : '1px solid #fed7aa',
            color: checkingSession ? 'var(--muted)' : '#9a3412',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {checkingSession
            ? 'Validando seu link de acesso...'
            : 'Não encontramos uma sessão válida. Solicite um novo link de acesso.'}
        </div>
      )}

      {!sessionReady && !checkingSession && (
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              const email = window.prompt('Digite seu e-mail para reenviar o link:');
              if (!email) return;

              try {
                const res = await fetch('/api/auth/resend', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email }),
                });

                const json = await res.json();

                if (res.ok && json.success) {
                  toast.success('Link reenviado! Verifique seu e-mail.');
                } else {
                  toast.error(json.error || 'Erro ao reenviar link');
                }
              } catch (e: any) {
                toast.error(e?.message || 'Erro ao reenviar link');
              }
            }}
          >
            Solicitar novo link
          </button>
        </div>
      )}

      <div className="field">
        <label className="field-label" htmlFor="password">
          Nova senha <span style={{ color: 'var(--orange)' }}>*</span>
        </label>

        <div style={{ position: 'relative' }}>
          <input
            id="password"
            type={showPass ? 'text' : 'password'}
            required
            minLength={8}
            className="input"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || !sessionReady}
            style={{ paddingRight: 40 }}
          />

          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            tabIndex={-1}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              padding: 4,
            }}
          >
            {showPass ? (
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {password.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'var(--line)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: 4,
                  width: strength === 1 ? '33%' : strength === 2 ? '66%' : '100%',
                  background: strengthColor[strength],
                  transition: 'width .2s, background .2s',
                }}
              />
            </div>

            <span style={{ fontSize: 11, fontWeight: 600, color: strengthColor[strength], flexShrink: 0 }}>
              {strengthLabel[strength]}
            </span>
          </div>
        )}
      </div>

      <div className="field">
        <label className="field-label" htmlFor="confirm">
          Confirmar senha <span style={{ color: 'var(--orange)' }}>*</span>
        </label>

        <input
          id="confirm"
          type={showPass ? 'text' : 'password'}
          required
          className="input"
          placeholder="Repita a senha"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={loading || !sessionReady}
          style={{ borderColor: confirm && confirm !== password ? '#fecaca' : undefined }}
        />

        {confirm && confirm !== password && (
          <span style={{ fontSize: 12, color: '#b91c1c', fontWeight: 500, marginTop: 4, display: 'block' }}>
            As senhas não coincidem
          </span>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || !sessionReady || password.length < 8 || password !== confirm}
        className="btn btn-primary"
        style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
      >
        {loading ? 'Salvando…' : 'Criar senha e entrar →'}
      </button>
    </form>
  );
}
