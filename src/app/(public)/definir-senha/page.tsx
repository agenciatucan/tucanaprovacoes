import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import SetPasswordForm from '@/components/auth/SetPasswordForm';
import Image from 'next/image';

export const metadata: Metadata = { title: 'Criar senha — Tucan' };

export default async function DefinirSenhaPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Se não tem sessão, o link expirou ou foi inválido
  if (!user) redirect('/login?erro=link_invalido');

  // Se já tem senha definida (não é um invite novo), redirecionar
  // Checar pelo last_sign_in_at vs created_at — se são iguais, ainda não logou antes
  const isFirstAccess = !user.last_sign_in_at || user.last_sign_in_at === user.created_at;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('name, role')
    .eq('auth_user_id', user.id)
    .single();

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '5fr 6fr' }}>
      {/* Left — brand panel */}
      <div className="pattern-green" style={{ position: 'relative', color: '#fff', padding: '40px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'url(/assets/tucano.png)', backgroundSize: '110px', backgroundRepeat: 'repeat', transform: 'rotate(-12deg) scale(1.2)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          <Image src="/assets/tucan-logo.png" alt="Tucan" height={26} width={105}
            style={{ height: 26, width: 'auto', filter: 'brightness(0) invert(1)' }} />
        </div>

        <div style={{ position: 'relative' }}>
          <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.5)' }}>Bem-vindo ao portal</div>
          <div style={{ marginTop: 12, fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.03em', fontWeight: 700, maxWidth: 380 }}>
            {profile?.name ? `Olá, ${profile.name.split(' ')[0]}!` : 'Quase lá!'}
          </div>
          <p style={{ margin: '16px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.6, maxWidth: 360 }}>
            Crie uma senha para acessar o portal e acompanhar seus cronogramas.
          </p>
        </div>

        <div style={{ position: 'relative', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          © 2026 Tucan · Comunicação estratégica
        </div>
      </div>

      {/* Right — form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, background: '#fff' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h1 className="h1" style={{ fontSize: 26, marginBottom: 8 }}>Criar sua senha</h1>
          <p className="muted" style={{ fontSize: 14, marginBottom: 28 }}>
            Escolha uma senha segura para o seu acesso.
          </p>
          <SetPasswordForm userRole={profile?.role ?? 'cliente'} />
        </div>
      </div>
    </div>
  );
}
