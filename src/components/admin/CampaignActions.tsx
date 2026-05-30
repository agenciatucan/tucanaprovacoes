'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import {
  sendCampaignForApproval,
  regenerateApprovalToken,
} from '@/actions/campaigns';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

interface Props {
  campaignId: string;
  status: string;
  approvalLink: string;
  accessCode?: string | null;
  isLocked?: boolean | null;
  editHref: string;
}

function extractTokenFromLink(link: string) {
  try {
    const url = new URL(link);
    const parts = url.pathname.split('/').filter(Boolean);
    const acessoIndex = parts.findIndex((part) => part === 'acesso');

    if (acessoIndex >= 0 && parts[acessoIndex + 1]) {
      return decodeURIComponent(parts[acessoIndex + 1] ?? '');
    }

    return '';
  } catch {
    const match = link.match(/\/acesso\/([^/?#]+)/);
    return match?.[1] ?? '';
  }
}

export default function CampaignActions({
  campaignId,
  status,
  approvalLink,
  accessCode,
  isLocked,
  editHref,
}: Props) {
  const router = useRouter();

  const [link, setLink] = useState(approvalLink);
  const [isPending, startTransition] = useTransition();

  const isArchived = status === 'arquivado';
  const canSend = ['rascunho', 'em_revisao'].includes(status) && !isArchived;
  const canEdit = !isLocked && status !== 'aprovado' && !isArchived;

  const token = useMemo(() => extractTokenFromLink(link), [link]);

  async function copyToClipboard(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch {
      toast.error('Não foi possível copiar.');
    }
  }

  async function handleCopyLink() {
    await copyToClipboard(link, 'Link do cliente copiado!');
  }

  async function handleCopyCode() {
    if (!accessCode) {
      toast.error('Código de acesso não encontrado.');
      return;
    }

    await copyToClipboard(accessCode, 'Código de acesso copiado!');
  }

  async function handleCopyToken() {
    if (!token) {
      toast.error('Token não encontrado.');
      return;
    }

    await copyToClipboard(token, 'Token copiado!');
  }

  function handleSendForApproval() {
    startTransition(async () => {
      const result = await sendCampaignForApproval(campaignId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success('Cronograma enviado para aprovação!');
      router.refresh();
    });
  }

  function handleRegenerateLink() {
    startTransition(async () => {
      const result = await regenerateApprovalToken(campaignId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const newToken = result.data.approval_token;

      let newLink = link;

      try {
        const url = new URL(link);
        url.pathname = `/acesso/${newToken}`;
        newLink = url.toString();
      } catch {
        newLink = link.replace(/\/acesso\/[^/?#]+/, `/acesso/${newToken}`);
      }

      setLink(newLink);
      toast.success('Novo link gerado!');
      router.refresh();
    });
  }

  return (
    <div className="campaign-actions">
      <style>
        {`
          .campaign-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
            align-items: flex-end;
            width: 100%;
          }

          .campaign-actions-row {
            display: flex;
            gap: 8px;
            align-items: center;
            justify-content: flex-end;
            flex-wrap: wrap;
            width: 100%;
          }

          .campaign-access-box {
            width: 100%;
            max-width: 620px;
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 14px;
          }

          .campaign-access-box-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 12px;
          }

          .campaign-access-title {
            display: flex;
            align-items: center;
            gap: 7px;
            font-size: 13px;
            font-weight: 900;
            color: var(--ink);
          }

          .campaign-access-helper {
            margin-top: 3px;
            font-size: 12px;
            color: var(--muted);
            line-height: 1.45;
          }

          .campaign-access-primary {
            background: var(--green-50);
            border: 1px solid var(--green-100);
            border-radius: 16px;
            padding: 12px;
            margin-bottom: 10px;
          }

          .campaign-access-label {
            margin-bottom: 6px;
            color: var(--green);
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: .08em;
          }

          .campaign-access-code-row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 8px;
            align-items: center;
          }

          .campaign-access-code {
            height: 42px;
            border-radius: 12px;
            border: 1px solid var(--green-100);
            background: #fff;
            padding: 0 12px;
            color: var(--green);
            font-size: 18px;
            font-weight: 900;
            letter-spacing: .04em;
            font-family:
              ui-monospace,
              SFMono-Regular,
              Menlo,
              Monaco,
              Consolas,
              "Liberation Mono",
              "Courier New",
              monospace;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .campaign-access-token-box {
            margin-top: 10px;
            border-top: 1px solid var(--line-soft);
            padding-top: 10px;
          }

          .campaign-access-token-summary {
            cursor: pointer;
            color: var(--muted);
            font-size: 12px;
            font-weight: 800;
            user-select: none;
          }

          .campaign-access-token-summary:hover {
            color: var(--ink);
          }

          .campaign-access-token-fields {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 8px;
            align-items: center;
            margin-top: 8px;
          }

          .campaign-token-field {
            min-width: 0;
            height: 38px;
            border-radius: 12px;
            border: 1px solid var(--line);
            background: var(--bg);
            padding: 0 11px;
            color: var(--ink-2);
            font-size: 12px;
            font-family:
              ui-monospace,
              SFMono-Regular,
              Menlo,
              Monaco,
              Consolas,
              "Liberation Mono",
              "Courier New",
              monospace;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .campaign-archived-badge {
            font-size: 12px;
            font-weight: 700;
            color: #92400e;
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 10px;
            padding: 8px 10px;
          }

          @media (max-width: 900px) {
            .campaign-actions {
              align-items: stretch;
            }

            .campaign-actions-row {
              justify-content: flex-start;
            }

            .campaign-access-box {
              max-width: none;
            }
          }

          @media (max-width: 640px) {
            .campaign-actions-row {
              display: grid;
              grid-template-columns: 1fr;
            }

            .campaign-actions-row .btn,
            .campaign-actions-row a {
              width: 100%;
              justify-content: center;
            }

            .campaign-access-code-row,
            .campaign-access-token-fields {
              grid-template-columns: 1fr;
            }

            .campaign-access-code,
            .campaign-token-field {
              width: 100%;
            }
          }
        `}
      </style>

      <div className="campaign-actions-row">
        {isArchived && (
          <span className="campaign-archived-badge">Cronograma arquivado</span>
        )}

        {canEdit && (
          <Link href={editHref as Route} className="btn btn-ghost btn-sm">
            <Icon name="edit" size={14} />
            Editar
          </Link>
        )}

        {canSend && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSendForApproval}
            disabled={isPending}
          >
            <Icon name="upload" size={14} />
            {isPending ? 'Enviando…' : 'Enviar para aprovação'}
          </button>
        )}
      </div>

      {!isArchived && (
        <div className="campaign-access-box">
          <div className="campaign-access-box-header">
            <div>
              <div className="campaign-access-title">
                <Icon name="link" size={14} />
                Acesso do cliente
              </div>

              <div className="campaign-access-helper">
                Envie o link ou o código curto para o cliente acessar sem
                cadastro.
              </div>
            </div>
          </div>

          <div className="campaign-access-primary">
            <div className="campaign-access-label">Código de acesso</div>

            <div className="campaign-access-code-row">
              <input
                className="campaign-access-code"
                value={accessCode || 'Sem código'}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
                title={accessCode ?? ''}
              />

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleCopyCode}
                disabled={isPending || !accessCode}
              >
                <Icon name="copy" size={14} />
                Copiar código
              </button>
            </div>
          </div>

          <div className="campaign-actions-row" style={{ justifyContent: 'flex-start' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleCopyLink}
              disabled={isPending}
            >
              <Icon name="link" size={14} />
              Copiar link do cliente
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleRegenerateLink}
              disabled={isPending}
            >
              <Icon name="refresh" size={14} />
              Gerar novo link
            </button>
          </div>

          <details className="campaign-access-token-box">
            <summary className="campaign-access-token-summary">
              Ver token técnico
            </summary>

            <div className="campaign-access-token-fields">
              <input
                className="campaign-token-field"
                value={token || 'Token não encontrado'}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
                title={token}
              />

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleCopyToken}
                disabled={isPending || !token}
              >
                <Icon name="copy" size={14} />
                Copiar token
              </button>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}