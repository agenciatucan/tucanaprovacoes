import { Metadata } from 'next';
import Image from 'next/image';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '5fr 6fr' }}>
      {/* Left — brand panel */}
      <div className="pattern-green" style={{ position: 'relative', color: '#fff', padding: '40px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
        {/* Tucano watermark */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'url(/assets/tucano.png)', backgroundSize: '110px', backgroundRepeat: 'repeat', transform: 'rotate(-12deg) scale(1.2)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          <Image src="/assets/tucan-logo.png" alt="Tucan" height={26} width={105} style={{ height: 26, width: 'auto', filter: 'brightness(0) invert(1)' }} />
        </div>

        <div style={{ position: 'relative' }}>
          <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.5)' }}>Portal de aprovações</div>
          <div style={{ marginTop: 12, fontSize: 40, lineHeight: 1.05, letterSpacing: '-0.035em', fontWeight: 700, maxWidth: 420 }}>
            Bem-vindo de volta.
          </div>
          <p style={{ margin: '18px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.6, maxWidth: 380 }}>
            Acompanhe cronogramas, aprove posts e converse com o time da Tucan sem sair daqui.
          </p>
        </div>

        <div style={{ position: 'relative', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          © 2026 Tucan · Comunicação estratégica
        </div>
      </div>

      {/* Right — form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, background: '#fff' }}>
        <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div>
            <h1 className="h1" style={{ fontSize: 28 }}>Entrar no portal</h1>
            <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
              Use o e-mail cadastrado pela equipe Tucan.
            </p>
          </div>
          <LoginForm />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
            <div className="divider" style={{ flex: 1 }} />
            <span className="tiny muted">ou</span>
            <div className="divider" style={{ flex: 1 }} />
          </div>
          <a href="/acesso" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
            Acessar por link de convite
          </a>
          <p className="tiny muted" style={{ textAlign: 'center', marginTop: 8 }}>
            Problemas para entrar? Fale com seu gerente de conta na Tucan.
          </p>
        </div>
      </div>
    </div>
  );
}
