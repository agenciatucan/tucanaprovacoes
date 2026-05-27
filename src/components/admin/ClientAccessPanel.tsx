'use client';
import { useState, useTransition } from 'react';
import { inviteClientUser, removeClientAccess } from '@/actions/invite';
import { toast } from 'sonner';

type UserProfile = { id: string; name: string; email: string };

type ClientUser = {
  id: string;
  role: string;
  user_profiles: UserProfile | UserProfile[] | null;
};

interface Props {
  clientId: string;
  clientUsers: ClientUser[];
}

export default function ClientAccessPanel({ clientId, clientUsers: initial }: Props) {
  const [users, setUsers] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [name, setName]   = useState('');
  const [showForm, setShowForm] = useState(false);

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;

    startTransition(async () => {
      const result = await inviteClientUser(clientId, email.trim(), name.trim());
      if (result.success) {
        toast.success(`Convite enviado para ${email}!`);
        setEmail('');
        setName('');
        setShowForm(false);
        // Otimisticamente adicionar à lista
        setUsers((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'aprovador',
            user_profiles: { id: crypto.randomUUID(), name, email },
          },
        ]);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRemove(clientUserId: string, userName: string) {
    if (!window.confirm(`Remover acesso de "${userName}"?`)) return;
    startTransition(async () => {
      const result = await removeClientAccess(clientUserId, clientId);
      if (result.success) {
        setUsers((prev) => prev.filter((u) => u.id !== clientUserId));
        toast.success('Acesso removido');
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Lista de usuários com acesso */}
      {users.length === 0 ? (
        <p className="muted tiny">Nenhum usuário com acesso ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {users.map((cu) => {
            const u = Array.isArray(cu.user_profiles) ? cu.user_profiles[0] : cu.user_profiles;
            if (!u) return null;
            return (
              <div
                key={cu.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 10,
                  background: 'var(--bg)', border: '1px solid var(--line-soft)',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: 'var(--green-50)', color: 'var(--green)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 11,
                }}>
                  {u.name.slice(0, 2).toUpperCase()}
                </div>

                {/* Name + email */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.name}
                  </div>
                  <div className="muted tiny" style={{ marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.email}
                  </div>
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => handleRemove(cu.id, u.name)}
                  disabled={isPending}
                  title="Remover acesso"
                  style={{
                    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                    border: 'none', background: 'transparent', color: 'var(--muted)',
                    fontSize: 16, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    transition: 'color .12s, background .12s',
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
              </div>
            );
          })}
        </div>
      )}

      {/* Formulário de convite */}
      {showForm ? (
        <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <input
            required
            placeholder="Nome completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            className="input"
            style={{ fontSize: 13, height: 36 }}
          />
          <input
            required
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            className="input"
            style={{ fontSize: 13, height: 36 }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="submit"
              disabled={isPending || !email || !name}
              className="btn btn-primary btn-sm"
              style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
            >
              {isPending ? 'Enviando…' : '✉ Enviar convite'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEmail(''); setName(''); }}
              disabled={isPending}
              className="btn btn-ghost btn-sm"
            >
              Cancelar
            </button>
          </div>
          <p className="muted tiny" style={{ marginTop: 2 }}>
            O cliente receberá um e-mail para definir a senha e acessar o portal.
          </p>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="btn btn-ghost btn-sm"
          style={{ alignSelf: 'flex-start', fontSize: 12, marginTop: 2 }}
        >
          + Convidar usuário
        </button>
      )}
    </div>
  );
}
