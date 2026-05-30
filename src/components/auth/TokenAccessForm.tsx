'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { identifyPublicVisitor } from '@/actions/public-access';

type TokenAccessFormProps = {
  access?: unknown;
  defaultAccess?: unknown;
  token?: string;
  campaignName?: string | null;
  mode?: 'full' | 'compact' | 'identify-only';
};

function getTokenFromAccess(access: unknown): string | null {
  if (typeof access === 'string') {
    return access.trim() || null;
  }

  const accessData = access as
    | {
        token?: string | null;
        approval_token?: string | null;
        public_token?: string | null;
        campaign?: {
          token?: string | null;
          approval_token?: string | null;
          public_token?: string | null;
        } | null;
      }
    | null
    | undefined;

  return (
    accessData?.token ||
    accessData?.approval_token ||
    accessData?.public_token ||
    accessData?.campaign?.token ||
    accessData?.campaign?.approval_token ||
    accessData?.campaign?.public_token ||
    null
  );
}

function getFallbackPath(params: {
  access?: unknown;
  defaultAccess?: unknown;
  token?: string;
}) {
  const accessData = params.access as
    | {
        path?: string | null;
        href?: string | null;
        url?: string | null;
        redirectTo?: string | null;
      }
    | null
    | undefined;

  const directPath =
    accessData?.path ||
    accessData?.href ||
    accessData?.url ||
    accessData?.redirectTo ||
    null;

  if (typeof directPath === 'string' && directPath.startsWith('/')) {
    return directPath;
  }

  const finalToken =
    params.token ||
    getTokenFromAccess(params.access) ||
    getTokenFromAccess(params.defaultAccess);

  if (finalToken) {
    return `/acesso/${finalToken}`;
  }

  return '/';
}

export default function TokenAccessForm({
  access,
  defaultAccess,
  token,
  campaignName,
  mode = 'full',
}: TokenAccessFormProps) {
  const router = useRouter();

  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);

    if (!visitorName.trim()) {
      setError('Informe seu nome para continuar.');
      return;
    }

    startTransition(async () => {
      const result = await identifyPublicVisitor({
        access: access ?? defaultAccess ?? token,
        defaultAccess,
        token,
        visitorName: visitorName.trim(),
        visitorEmail: visitorEmail.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error || 'Não foi possível registrar o acesso.');
        return;
      }

      const safePath =
        result.data.path ||
        result.data.redirectTo ||
        result.data.href ||
        result.data.url ||
        getFallbackPath({ access, defaultAccess, token });

      router.replace((typeof safePath === 'string' && safePath ? safePath : '/') as Route);
      router.refresh();
    });
  }

  const compact = mode === 'compact';

  return (
    <main
      className={
        mode === 'identify-only'
          ? 'flex min-h-screen items-center justify-center bg-[#f6f6f6] px-4 py-8'
          : undefined
      }
    >
      <div
        className={
          compact
            ? 'w-full rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm'
            : 'mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm'
        }
      >
        <div className="mb-6">
          <p className="mb-2 text-sm font-semibold text-[#eb6013]">
            Aprovação pública
          </p>

          <h1 className="text-2xl font-bold text-zinc-900">
            Acesso ao cronograma
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {campaignName
              ? `Para visualizar o cronograma ${campaignName}, informe seu nome.`
              : 'Para visualizar o cronograma, informe seu nome.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="visitorName"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              Nome
            </label>

            <input
              id="visitorName"
              type="text"
              value={visitorName}
              onChange={(event) => setVisitorName(event.target.value)}
              placeholder="Digite seu nome"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-[#25411e] focus:ring-2 focus:ring-[#25411e]/10"
            />
          </div>

          <div>
            <label
              htmlFor="visitorEmail"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              E-mail opcional
            </label>

            <input
              id="visitorEmail"
              type="email"
              value={visitorEmail}
              onChange={(event) => setVisitorEmail(event.target.value)}
              placeholder="Digite seu e-mail"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-[#25411e] focus:ring-2 focus:ring-[#25411e]/10"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-[#25411e] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Entrando...' : 'Acessar cronograma'}
          </button>
        </form>
      </div>
    </main>
  );
}
