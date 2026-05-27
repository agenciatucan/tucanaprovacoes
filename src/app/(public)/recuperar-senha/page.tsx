'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { requestPasswordReset } from '@/actions/auth';

export default function RecuperarSenhaPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    // Usa server action com service role — sem PKCE, funciona em qualquer browser
    const result = await requestPasswordReset(email.trim());

    if (!result.success) {
      setError('Não foi possível enviar o e-mail. Tente novamente.');
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '5fr 6fr' }}>
      {/* Left — brand */}
      <div className="pattern-green" style={{ position: 'relative', color: '#fff', padding: '40px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'url(/assets/tucano.png)', backgroundSize: '110px', backgroundRepeat: 'repeat', transform: 'rotate(-12deg) scale(1.2)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          <Image src="/assets/tucan-logo.png" alt="Tucan" height={26} width={105}
            style={{ height: 26, width: 'auto', filter: 'brightness(0) invert(1)' }} />
        </div>

        <div style={{ position: 'relative' }}>
          <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.5)' }}>Recuperação de acesso</div>
          <div style={{ marginTop: 12, fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.03em', fontWeight: 700, maxWidth: 380 }}>
            Vamos te ajudar a entrar.
          </div>
          <p style={{ margin: '16px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.6, maxWidth: 360 }}>
            Informe seu e-mail e enviaremos um link para você criar uma nova senha.
          </p>
        </div>

        <div style={{ position: 'relative', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          © 2026 Tucan · Comunicação estratégica
        </div>
      </div>

      {/* Right — form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, background: '#fff' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'var(--green-50)', color: 'var(--green)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', fontSize: 28,
              }}>
                ✉
              </div>
              <h1 className="h1" style={{ fontSize: 24, marginBottom: 8 }}>E-mail enviado!</h1>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
                Se <strong>{email}</strong> tiver cadastro no portal, você receberá um link em instantes.
                Verifique também a caixa de spam.
              </p>
              <Link href="/login" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                ← Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="h1" style={{ fontSize: 26, marginBottom: 8 }}>Recuperar senha</h1>
              <p className="muted" style={{ fontSize: 14, marginBottom: 28 }}>
                Digite o e-mail cadastrado pela equipe Tucan.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="field">
                  <label className="field-label" htmlFor="email">E-mail</label>
                  <input
                    id="email"
                    type="email"
                    required
                    className="input"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </div>

                {error && (
                  <p style={{ fontSize: 13, color: '#b91c1c', fontWeight: 500 }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {loading ? 'Enviando…' : 'Enviar link de acesso →'}
                </button>

                <Link href="/login" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                  ← Voltar para o login
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
