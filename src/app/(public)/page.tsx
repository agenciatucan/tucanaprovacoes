import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';

export default function LandingPage() {
  const features = [
    { icon: 'check',    label: 'Aprovação em um clique' },
    { icon: 'calendar', label: 'Cronogramas por semana' },
    { icon: 'chat',     label: 'Observações em contexto' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Top nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px clamp(16px, 4vw, 48px)' }}>
        <Image src="/assets/tucan-logo.png" alt="Tucan Marketing Digital" height={26} width={105} style={{ height: 26, width: 'auto' }} />
        <a href="https://www.agenciatucan.com.br" target="_blank" rel="noreferrer" style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 500, textDecoration: 'none' }}>Sobre a Tucan</a>
      </div>

      {/* Hero — split */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 48, padding: '24px clamp(16px, 4vw, 48px) 48px', alignItems: 'stretch' }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 0 }}>
          <div className="eyebrow" style={{ color: 'var(--orange)' }}>
            Portal Tucan · Aprovações
          </div>
          <h1 style={{ margin: '20px 0 20px', fontSize: 'clamp(40px,5vw,64px)', lineHeight: 0.98, letterSpacing: '-0.04em', fontWeight: 700, color: 'var(--green)', maxWidth: 520 }}>
            Aprove cronogramas<br />sem ruído.
          </h1>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.55, color: 'var(--muted)', maxWidth: 460 }}>
            O portal da Tucan reúne cronogramas editoriais, posts e observações em um só lugar.
            Acompanhe semana a semana, aprove com um clique, peça ajustes sem perder o histórico.
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
            <Link href="/login" className="btn btn-primary btn-lg">
              Entrar no portal <Icon name="arrow" size={16} />
            </Link>
            <Link href="/acesso" className="btn btn-ghost btn-lg">
              Tenho um link de convite
            </Link>
          </div>

          <div style={{ display: 'flex', gap: 20, marginTop: 40, flexWrap: 'wrap' }}>
            {features.map((f) => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-2)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--green-50)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={f.icon} size={16} stroke={2} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — tucano hero card */}
        <div style={{ background: 'var(--green)', borderRadius: 28, overflow: 'hidden', position: 'relative', color: '#fff', padding: 'clamp(20px, 5vw, 36px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Repeating tucano watermark */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.07, backgroundImage: 'url(/assets/tucano.png)', backgroundSize: '120px', backgroundRepeat: 'repeat', transform: 'rotate(-8deg) scale(1.1)', transformOrigin: 'center', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.6)' }}>O que muda</div>
            <span className="chip" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>v1.0</span>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <Image src="/assets/tucano.png" alt="" width={220} height={220} style={{ width: 220, height: 'auto', display: 'block', marginBottom: 20 }} />
            <div style={{ fontSize: 32, lineHeight: 1.05, letterSpacing: '-0.03em', fontWeight: 700, maxWidth: 380 }}>
              Cada cronograma com um lugar.<br />Cada post com um destino.
            </div>
            <div style={{ marginTop: 18, fontSize: 14, color: 'rgba(255,255,255,0.65)', maxWidth: 380, lineHeight: 1.55 }}>
              Substitui PDF, planilha e mensagem solta no WhatsApp. Sem precisar instalar nada.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
