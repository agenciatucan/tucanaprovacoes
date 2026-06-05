'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { approvePlanning, requestPlanningAdjustment } from '@/actions/planning';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

interface Item { id: string; title: string; }

interface Props {
  token: string;
  isEditable: boolean;
  status: string;
  items?: Item[];
}

export default function PlanningApprovalPanel({ token, isEditable, items = [] }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mode, setMode]       = useState<'idle' | 'adjusting'>('idle');
  const [note, setNote]       = useState('');

  if (!isEditable) {
    return (
      <div style={{
        padding: '20px', borderRadius: 14,
        border: '1px solid var(--line)', background: 'var(--card)',
        textAlign: 'center',
      }}>
        <p className="muted" style={{ fontSize: 14 }}>
          Este planejamento ainda não foi enviado para aprovação.
        </p>
      </div>
    );
  }

  async function handleApprove() {
    setLoading(true);
    const result = await approvePlanning(token);
    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    toast.success('Planejamento aprovado! O cronograma foi criado.');
    router.refresh();
  }

  async function handleRequestAdjustment() {
    if (!note.trim() || note.trim().length < 5) {
      toast.error('Descreva o ajuste com ao menos 5 caracteres');
      return;
    }
    setLoading(true);
    const result = await requestPlanningAdjustment(token, note);
    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    toast.success('Solicitação de ajuste enviada!');
    router.refresh();
  }

  return (
    <div style={{
      borderRadius: 16, border: '1px solid var(--line)',
      background: 'var(--card)', overflow: 'hidden',
    }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Sua avaliação</h2>
        <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
          Analise os temas propostos e aprove ou solicite ajustes.
        </p>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {mode === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}
              disabled={loading}
              onClick={handleApprove}
            >
              {loading ? 'Aprovando…' : <><Icon name="check" size={18} /> Aprovar planejamento</>}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', color: 'var(--orange)' }}
              disabled={loading}
              onClick={() => setMode('adjusting')}
            >
              <Icon name="chat" size={16} /> Solicitar ajuste
            </button>
          </div>
        )}

        {mode === 'adjusting' && (
          <div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
              Use o campo abaixo para um resumo geral do ajuste.
              {items.length > 0 && ' Você também pode adicionar observações em cada tema acima.'}
            </p>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              Descreva o ajuste solicitado <span style={{ color: 'var(--orange)' }}>*</span>
            </label>
            <textarea
              autoFocus
              rows={4}
              className="input"
              placeholder="Ex.: Gostaria de trocar o tema da Semana 2 por algo relacionado a saúde preventiva…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => { setMode('idle'); setNote(''); }}
              >
                Voltar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                disabled={loading || note.trim().length < 5}
                onClick={handleRequestAdjustment}
              >
                {loading ? 'Enviando…' : <><Icon name="send" size={14} /> Enviar solicitação</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
