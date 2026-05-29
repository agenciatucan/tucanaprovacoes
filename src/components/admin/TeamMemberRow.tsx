'use client';

import { useState, useTransition } from 'react';
import {
  updateMemberRole,
  removeMember,
  resendTeamInvite,
} from '@/actions/team';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
};

interface Props {
  member: Member;
  isMe: boolean;
  isLast: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  equipe: 'Equipe',
};

const ROLE_COLORS: Record<string, { bg: string; fg: string }> = {
  admin: { bg: 'var(--st-aprovado-bg)', fg: 'var(--st-aprovado-fg)' },
  equipe: { bg: 'var(--st-agendado-bg)', fg: 'var(--st-agendado-fg)' },
};

const DEFAULT_COLORS = {
  bg: 'var(--st-rascunho-bg)',
  fg: 'var(--st-rascunho-fg)',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function formatSince(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', {
    month: 'short',
    year: 'numeric',
  });
}

export default function TeamMemberRow({ member, isMe, isLast }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const colors = ROLE_COLORS[member.role] ?? DEFAULT_COLORS;

  function handleRoleChange(newRole: 'admin' | 'equipe') {
    if (newRole === member.role) return;

    startTransition(async () => {
      const result = await updateMemberRole(member.id, newRole);

      if (result.success) {
        toast.success(`${member.name} agora é ${ROLE_LABEL[newRole]}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeMember(member.id);

      if (result.success) {
        toast.success(`${member.name} foi removido da equipe`);
        setShowRemoveConfirm(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleResendInvite() {
    startTransition(async () => {
      const result = await resendTeamInvite(member.id);

      if (result.success) {
        toast.success(`Convite reenviado para ${member.email}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div
      className={`team-member-row ${isMe ? 'me' : ''}`}
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--line-soft)',
        opacity: isPending ? 0.6 : 1,
      }}
    >
      <style>
        {`
          .team-member-row {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto auto auto;
            gap: 14px;
            align-items: center;
            padding: 16px 20px;
            background: #fff;
            transition: opacity .15s, background .15s;
          }

          .team-member-row.me {
            background: var(--green-50);
          }

          .team-member-avatar {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 13px;
          }

          .team-member-info {
            min-width: 0;
          }

          .team-member-name-row {
            display: flex;
            align-items: center;
            gap: 6px;
            min-width: 0;
          }

          .team-member-name {
            font-weight: 800;
            font-size: 14px;
            color: var(--ink);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .team-member-you {
            font-size: 11px;
            color: var(--green);
            font-weight: 800;
            flex-shrink: 0;
          }

          .team-member-email {
            margin-top: 3px;
            color: var(--muted);
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .team-member-date {
            color: var(--muted);
            font-size: 12px;
            min-width: 94px;
            text-align: right;
            white-space: nowrap;
          }

          .team-member-role-badge {
            font-size: 11px;
            font-weight: 800;
            padding: 5px 9px;
            border-radius: 8px;
            flex-shrink: 0;
            border: 0;
            font-family: inherit;
          }

          .team-member-role-select {
            height: 34px;
            padding: 0 28px 0 10px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 800;
            font-family: inherit;
            appearance: none;
            background-repeat: no-repeat;
            background-position: right 8px center;
            flex-shrink: 0;
          }

          .team-member-actions {
            display: flex;
            gap: 7px;
            align-items: center;
            justify-content: flex-end;
            flex-shrink: 0;
          }

          .team-member-remove-button {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            flex-shrink: 0;
            border: none;
            background: transparent;
            color: var(--muted);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color .15s, background .15s;
          }

          .team-member-remove-button:hover {
            color: #b91c1c;
            background: #fef2f2;
          }

          .team-member-confirm-button {
            height: 34px;
            padding: 0 11px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 800;
            border: 1px solid #fecaca;
            background: #fef2f2;
            color: #b91c1c;
            cursor: pointer;
            font-family: inherit;
          }

          .team-member-cancel-button {
            height: 34px;
            padding: 0 11px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 700;
            border: 1px solid var(--line);
            background: var(--bg-2);
            color: var(--muted);
            cursor: pointer;
            font-family: inherit;
          }

          @media (max-width: 900px) {
            .team-member-row {
              grid-template-columns: auto minmax(0, 1fr);
              gap: 12px;
              padding: 16px;
            }

            .team-member-date {
              grid-column: 2 / -1;
              text-align: left;
              min-width: 0;
              margin-top: -4px;
            }

            .team-member-role-wrap {
              grid-column: 1 / -1;
            }

            .team-member-role-select,
            .team-member-role-badge {
              width: 100%;
              height: 40px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              text-align: center;
            }

            .team-member-actions {
              grid-column: 1 / -1;
              display: grid;
              grid-template-columns: 1fr auto;
              width: 100%;
            }

            .team-member-actions .btn {
              width: 100%;
              justify-content: center;
              min-height: 40px;
            }
          }

          @media (max-width: 460px) {
            .team-member-row {
              grid-template-columns: 1fr;
            }

            .team-member-avatar {
              display: none;
            }

            .team-member-date,
            .team-member-role-wrap,
            .team-member-actions {
              grid-column: auto;
            }

            .team-member-actions {
              grid-template-columns: 1fr;
            }

            .team-member-remove-button {
              width: 100%;
              height: 40px;
              border: 1px solid #fecaca;
              background: #fef2f2;
              color: #b91c1c;
            }
          }
        `}
      </style>

      {/* Avatar */}
      <div
        className="team-member-avatar"
        style={{
          background: isMe ? 'var(--green)' : 'var(--bg-2)',
          color: isMe ? '#fff' : 'var(--muted)',
        }}
      >
        {getInitials(member.name)}
      </div>

      {/* Name + email */}
      <div className="team-member-info">
        <div className="team-member-name-row">
          <div className="team-member-name">{member.name}</div>

          {isMe && <span className="team-member-you">· você</span>}
        </div>

        <div className="team-member-email">{member.email}</div>
      </div>

      {/* Desde */}
      <div className="team-member-date">Desde {formatSince(member.created_at)}</div>

      {/* Role selector */}
      <div className="team-member-role-wrap">
        {isMe ? (
          <span
            className="team-member-role-badge"
            style={{
              background: colors.bg,
              color: colors.fg,
            }}
          >
            {ROLE_LABEL[member.role] ?? member.role}
          </span>
        ) : (
          <select
            value={member.role}
            onChange={(e) =>
              handleRoleChange(e.target.value as 'admin' | 'equipe')
            }
            disabled={isPending}
            className="team-member-role-select"
            style={{
              border: `1px solid ${colors.bg}`,
              backgroundColor: colors.bg,
              color: colors.fg,
              cursor: isPending ? 'not-allowed' : 'pointer',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
            }}
          >
            <option value="admin">Admin</option>
            <option value="equipe">Equipe</option>
          </select>
        )}
      </div>

      {/* Ações */}
      {!isMe && (
        <div className="team-member-actions">
          <button
            type="button"
            onClick={handleResendInvite}
            disabled={isPending}
            className="btn btn-ghost btn-sm"
            style={{
              fontSize: 12,
              height: 34,
              whiteSpace: 'nowrap',
            }}
          >
            <Icon name="upload" size={13} />
            Reenviar convite
          </button>

          {showRemoveConfirm ? (
            <>
              <button
                type="button"
                onClick={handleRemove}
                disabled={isPending}
                className="team-member-confirm-button"
              >
                Confirmar
              </button>

              <button
                type="button"
                onClick={() => setShowRemoveConfirm(false)}
                disabled={isPending}
                className="team-member-cancel-button"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowRemoveConfirm(true)}
              disabled={isPending}
              title="Remover da equipe"
              className="team-member-remove-button"
            >
              <Icon name="x" size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}