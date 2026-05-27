'use client';
import { useState, useTransition } from 'react';
import { updateMemberRole, removeMember } from '@/actions/team';
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
  admin:  { bg: 'var(--st-aprovado-bg)', fg: 'var(--st-aprovado-fg)' },
  equipe: { bg: 'var(--st-agendado-bg)', fg: 'var(--st-agendado-fg)' },
};
const DEFAULT_COLORS = { bg: 'var(--st-rascunho-bg)', fg: 'var(--st-rascunho-fg)' };

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

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 20px',
        borderBottom: isLast ? 'none' : '1px solid var(--line-soft)',
        background: isMe ? 'var(--green-50)' : 'transparent',
        opacity: isPending ? 0.6 : 1,
        transition: 'opacity .15s',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: isMe ? 'var(--green)' : 'var(--bg-2)',
        color: isMe ? '#fff' : 'var(--muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 14,
      }}>
        {member.name.slice(0, 2).toUpperCase()}
      </div>

      {/* Name + email */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          {member.name}
          {isMe && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>· você</span>}
        </div>
        <div className="muted tiny" style={{ marginTop: 2 }}>{member.email}</div>
      </div>

      {/* Desde */}
      <div className="muted tiny" style={{ flexShrink: 0, minWidth: 80, textAlign: 'right' }}>
        Desde {new Date(member.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
      </div>

      {/* Role selector (somente para outros membros) */}
      {isMe ? (
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
          background: colors.bg, color: colors.fg, flexShrink: 0,
        }}>
          {ROLE_LABEL[member.role] ?? member.role}
        </span>
      ) : (
        <select
          value={member.role}
          onChange={(e) => handleRoleChange(e.target.value as 'admin' | 'equipe')}
          disabled={isPending}
          style={{
            height: 28, padding: '0 24px 0 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            border: `1px solid ${colors.bg}`, background: colors.bg, color: colors.fg,
            cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 6px center',
            flexShrink: 0,
          }}
        >
          <option value="admin">Admin</option>
          <option value="equipe">Equipe</option>
        </select>
      )}

      {/* Remover (somente para outros membros) */}
      {!isMe && (
        showRemoveConfirm ? (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleRemove}
              disabled={isPending}
              style={{
                height: 28, padding: '0 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c',
                cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setShowRemoveConfirm(false)}
              disabled={isPending}
              style={{
                height: 28, padding: '0 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                border: '1px solid var(--line)', background: 'var(--bg-2)', color: 'var(--muted)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowRemoveConfirm(true)}
            disabled={isPending}
            title="Remover da equipe"
            style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              border: 'none', background: 'transparent', color: 'var(--muted)',
              fontSize: 18, lineHeight: 1, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color .15s, background .15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#b91c1c';
              (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            ×
          </button>
        )
      )}
    </div>
  );
}
