import { Metadata } from 'next';
import SetPasswordForm from '@/components/auth/SetPasswordForm';
import Image from 'next/image';

// Force dynamic so the middleware can inject the CSP nonce into <script> tags.
// Static pages don't get per-request nonces, causing 'strict-dynamic' CSP to
// block all JavaScript (which freezes the form at "Validando...").
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Criar senha — Tucan' };

export default function DefinirSenhaPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[5fr_6fr]">
      {/* Left — brand panel */}
      <div className="pattern-green relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'url(/assets/tucano.png)',
            backgroundSize: '110px',
            backgroundRepeat: 'repeat',
            transform: 'rotate(-12deg) scale(1.2)',
          }}
        />

        <div className="relative">
          <Image
            src="/assets/tucan-logo.png"
            alt="Tucan"
            height={26}
            width={105}
            style={{
              height: 26,
              width: 'auto',
              filter: 'brightness(0) invert(1)',
            }}
          />
        </div>

        <div className="relative">
          <div className="eyebrow text-white/50">Bem-vindo ao portal</div>

          <div className="mt-3 max-w-sm text-4xl font-bold leading-tight tracking-[-0.03em]">
            Crie seu acesso
          </div>

          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/70">
            Defina uma senha para acessar o portal e acompanhar seus cronogramas.
          </p>
        </div>

        <div className="relative text-xs text-white/50">
          © 2026 Tucan · Comunicação estratégica
        </div>
      </div>

      {/* Right — form */}
      <div className="flex min-h-screen items-center justify-center bg-white px-5 py-10 sm:px-8 lg:p-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-10 lg:hidden">
            <Image
              src="/assets/tucan-logo.png"
              alt="Tucan"
              height={26}
              width={105}
              style={{ height: 26, width: 'auto' }}
            />
          </div>

          <h1 className="mb-2 text-3xl font-bold tracking-[-0.04em] text-[#1f1f1f]">
            Criar sua senha
          </h1>

          <p className="mb-7 text-sm leading-relaxed text-[var(--muted)]">
            Escolha uma senha segura para acessar o portal.
          </p>

          <SetPasswordForm userRole="cliente" />
        </div>
      </div>
    </div>
  );
}