'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signInFormAction } from '@/actions/auth';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

export default function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Cancela o submit nativo (que iria para a action de fallback abaixo) e
    // assume o fluxo client-side, com loading/toast/redirect mais amigáveis.
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const result = await signIn({ email: form.get('email'), password: form.get('password') });

    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    // Redireciona para a rota passada na URL ou deixa o middleware decidir
    const searchParams = new URLSearchParams(window.location.search);
    const redirect = searchParams.get('redirect');

    // Força reload completo para o middleware calcular a rota correta por role
    if (redirect && redirect.startsWith('/')) {
      window.location.href = redirect;
    } else {
      // Rota genérica — middleware vai redirecionar para /admin ou /cliente
      router.refresh();
      router.push('/');
    }
  }

  return (
    <form action={signInFormAction} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="field">
        <label className="field-label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="seu@email.com.br" />
      </div>
      <div className="field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label className="field-label" htmlFor="password">Senha</label>
          <a href="/recuperar-senha" className="btn-text tiny" style={{ color: 'var(--orange)', fontWeight: 600, fontSize: 12 }}>Esqueci a senha</a>
        </div>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" placeholder="••••••••" />
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 4 }}>
        {loading ? 'Entrando…' : <><span>Entrar</span> <Icon name="arrow" size={16} /></>}
      </button>
    </form>
  );
}
