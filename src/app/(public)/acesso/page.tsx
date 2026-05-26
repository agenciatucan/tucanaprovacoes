import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import TokenPasteForm from '@/components/auth/TokenPasteForm';

export const metadata: Metadata = { title: 'Acesso com link de convite' };

export default function AcessoPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Image src="/assets/tucan-logo.png" alt="Tucan Marketing Digital" height={26} width={105} style={{ height: 26, width: 'auto', margin: '0 auto' }} />
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22, fontWeight: 700 }}>
              T
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Link de convite</h1>
            <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
              Cole abaixo o link ou código que você recebeu da Tucan para acessar o cronograma.
            </p>
          </div>

          <TokenPasteForm />
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
          Tem conta?{' '}
          <Link href="/login" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>
            Entrar pelo login
          </Link>
        </p>
      </div>
    </div>
  );
}
