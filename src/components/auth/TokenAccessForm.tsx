'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { identifyPublicVisitor } from '@/actions/public-access';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';
import type { Route } from 'next';

interface Props {
  defaultAccess?: string;
  campaignName?: string;
  mode?: 'full' | 'identify-only';
}

export default function TokenAccessForm({
  defaultAccess = '',
  campaignName,
  mode = 'full',
}: Props) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  const [access, setAccess] = useState(defaultAccess);
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isIdentifyOnly = mode === 'identify-only';

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);

    startTransition(async () => {
      const result = await identifyPublicVisitor({
        access,
        visitorName,
        visitorEmail,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(result.data.redirectTo as Route);
      router.refresh();
    });
  }

  return (
    <div className="public-access-wrapper">
      <style>
        {`
          .public-access-wrapper {
            min-height: 100vh;
            background: var(--bg);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 32px 18px;
          }

          .public-access-card {
            width: 100%;
            max-width: 680px;
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 28px;
            padding: 42px;
            box-shadow: 0 18px 55px rgba(0, 0, 0, .06);
          }

          .public-access-icon {
            width: 72px;
            height: 72px;
            border-radius: 24px;
            background: var(--green);
            color: #fff;
            display: grid;
            place-items: center;
            margin: 0 auto 24px;
            font-size: 34px;
            font-weight: 900;
          }

          .public-access-title {
            margin: 0;
            text-align: center;
            font-size: 32px;
            line-height: 1.1;
            letter-spacing: -0.04em;
            font-weight: 800;
            color: var(--ink);
          }

          .public-access-text {
            max-width: 500px;
            margin: 14px auto 30px;
            text-align: center;
            color: var(--muted);
            font-size: 18px;
            line-height: 1.55;
          }

          .public-access-campaign {
            margin: 0 auto 24px;
            max-width: 480px;
            border-radius: 16px;
            background: var(--green-50);
            color: var(--green);
            padding: 12px 14px;
            text-align: center;
            font-size: 13px;
            line-height: 1.45;
            font-weight: 700;
          }

          .public-access-form {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .public-access-error {
            border-radius: 14px;
            border: 1px solid #fecaca;
            background: #fef2f2;
            color: #b91c1c;
            padding: 12px 14px;
            font-size: 13px;
            line-height: 1.45;
            font-weight: 700;
          }

          .public-access-submit {
            min-height: 56px;
            border-radius: 16px;
            font-size: 18px;
            font-weight: 800;
            margin-top: 4px;
          }

          .public-access-login {
            margin-top: 28px;
            text-align: center;
            color: var(--muted);
            font-size: 16px;
          }

          .public-access-login a {
            color: var(--green);
            text-decoration: none;
            font-weight: 800;
          }

          .public-access-hint {
            margin-top: -6px;
            color: var(--muted);
            font-size: 12px;
            line-height: 1.45;
          }

          @media (max-width: 640px) {
            .public-access-wrapper {
              align-items: flex-start;
              padding: 22px 14px;
            }

            .public-access-card {
              padding: 26px 20px;
              border-radius: 24px;
            }

            .public-access-icon {
              width: 62px;
              height: 62px;
              border-radius: 20px;
              font-size: 28px;
              margin-bottom: 20px;
            }

            .public-access-title {
              font-size: 27px;
            }

            .public-access-text {
              font-size: 15px;
              margin-bottom: 24px;
            }

            .public-access-submit {
              font-size: 16px;
              min-height: 52px;
            }
          }
        `}
      </style>

      <div className="public-access-card">
        <div className="public-access-icon">T</div>

        <h1 className="public-access-title">
          {isIdentifyOnly ? 'Identifique seu acesso' : 'Link de convite'}
        </h1>

        <p className="public-access-text">
          {isIdentifyOnly
            ? 'Antes de abrir o cronograma, informe seu nome para registrarmos quem visualizou, aprovou ou solicitou ajustes.'
            : 'Cole abaixo o link ou código que você recebeu da Tucan para acessar o cronograma.'}
        </p>

        {campaignName && (
          <div className="public-access-campaign">
            Cronograma encontrado:
            <br />
            {campaignName}
          </div>
        )}

        <form onSubmit={handleSubmit} className="public-access-form">
          {!isIdentifyOnly && (
            <div className="field">
              <label className="field-label" htmlFor="access">
                Link ou código de acesso
              </label>

              <input
                id="access"
                className="input"
                value={access}
                onChange={(event) => setAccess(event.target.value)}
                placeholder="https://portal.agenciatucan.com.br/acesso/... ou TUCAN-ABC123"
                required
                disabled={isPending}
                autoComplete="off"
              />
            </div>
          )}

          {isIdentifyOnly && (
            <input type="hidden" name="access" value={access} />
          )}

          <div className="field">
            <label className="field-label" htmlFor="visitorName">
              Seu nome <span style={{ color: 'var(--orange)' }}>*</span>
            </label>

            <input
              id="visitorName"
              className="input"
              value={visitorName}
              onChange={(event) => setVisitorName(event.target.value)}
              placeholder="Ex.: Maria Fernanda"
              required
              minLength={3}
              disabled={isPending}
              autoComplete="name"
            />

            <div className="public-access-hint">
              Esse nome aparecerá no histórico de aprovações e ajustes.
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="visitorEmail">
              E-mail{' '}
              <span className="muted" style={{ fontWeight: 400 }}>
                (opcional)
              </span>
            </label>

            <input
              id="visitorEmail"
              className="input"
              type="email"
              value={visitorEmail}
              onChange={(event) => setVisitorEmail(event.target.value)}
              placeholder="email@exemplo.com"
              disabled={isPending}
              autoComplete="email"
            />
          </div>

          {error && <div className="public-access-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary public-access-submit"
            disabled={isPending}
          >
            {isPending ? (
              'Validando…'
            ) : (
              <>
                Acessar cronograma
                <Icon name="arrow" size={20} />
              </>
            )}
          </button>
        </form>

        <div className="public-access-login">
          Tem conta?{' '}
          <Link href="/login">
            Entrar pelo login
          </Link>
        </div>
      </div>
    </div>
  );
}