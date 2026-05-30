'use client';
import { useTransition } from 'react';
import { clearPublicSession } from '@/actions/public-access';

interface Props {
  campaignId: string;
  token: string;
}

export default function PublicSessionLogout({ campaignId, token }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await clearPublicSession(campaignId, token);
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      style={{
        marginTop: 10,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: 'rgba(255,255,255,.12)',
        border: '1px solid rgba(255,255,255,.18)',
        borderRadius: 10,
        color: 'rgba(255,255,255,.8)',
        fontSize: 12,
        fontWeight: 700,
        padding: '6px 12px',
        cursor: isPending ? 'not-allowed' : 'pointer',
        opacity: isPending ? 0.6 : 1,
        transition: 'opacity .15s, background .15s',
      }}
    >
      {isPending ? 'Saindo…' : 'Trocar identificação'}
    </button>
  );
}
