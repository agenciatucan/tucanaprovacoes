'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/Icon';
import { disconnectGoogleCalendar } from '@/actions/google-calendar';

interface Props {
  connection: { email: string; lastSyncedAt: string | null } | null;
}

export default function GoogleCalendarConnectionCard({ connection }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const status = searchParams.get('google_calendar');
    if (!status) return;

    if (status === 'conectado') toast.success('Google Agenda conectado com sucesso!');
    if (status === 'erro') toast.error('Não foi possível conectar ao Google Agenda. Tente novamente.');

    router.replace('/admin/configuracoes');
  }, [searchParams, router]);

  async function handleDisconnect() {
    if (!window.confirm('Desconectar o Google Agenda? Os eventos internos deixarão de ser sincronizados.')) return;

    setLoading(true);
    const result = await disconnectGoogleCalendar();
    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success('Google Agenda desconectado.');
    }
    setLoading(false);
  }

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: connection ? 'var(--green-50)' : 'var(--bg)',
          color: connection ? 'var(--green)' : 'var(--muted-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name="calendar" size={20} />
      </div>

      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Google Agenda</div>
        {connection ? (
          <div className="muted tiny" style={{ marginTop: 2 }}>
            Conectado como <strong>{connection.email}</strong>
            {connection.lastSyncedAt && (
              <> · última sincronização {new Date(connection.lastSyncedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</>
            )}
          </div>
        ) : (
          <p className="muted tiny" style={{ marginTop: 2 }}>
            Sincronize reuniões e datas internas da agência com uma agenda do Google.
          </p>
        )}
      </div>

      {connection ? (
        <button onClick={handleDisconnect} disabled={loading} className="btn btn-ghost btn-sm" style={{ color: '#b91c1c', borderColor: '#fecaca' }}>
          <Icon name="x" size={13} />
          {loading ? 'Desconectando…' : 'Desconectar'}
        </button>
      ) : (
        <a href="/api/google/oauth/start" className="btn btn-primary btn-sm">
          <Icon name="link" size={13} />
          Conectar Google Agenda
        </a>
      )}
    </div>
  );
}
