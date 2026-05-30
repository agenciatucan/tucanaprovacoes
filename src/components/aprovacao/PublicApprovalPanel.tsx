'use client';

import { useState, useTransition } from 'react';
import {
  approvePublicPost,
  requestPublicPostAdjustment,
} from '@/actions/public-approvals';

type PublicApprovalPanelProps = {
  token: string;
  postId: string;
  postTitle?: string | null;
  clientName?: string | null;
};

export default function PublicApprovalPanel({
  token,
  postId,
  postTitle,
  clientName,
}: PublicApprovalPanelProps) {
  const [name, setName] = useState(clientName || '');
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'idle' | 'adjustment'>('idle');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    setFeedback(null);

    if (!name.trim()) {
      setFeedback({
        type: 'error',
        message: 'Informe seu nome antes de aprovar.',
      });
      return;
    }

    startTransition(async () => {
      const result = await approvePublicPost({
        token,
        postId,
        name: name.trim(),
      });

      if (!result.success) {
        setFeedback({
          type: 'error',
          message: result.error || 'Não foi possível aprovar o post.',
        });
        return;
      }

      setFeedback({
        type: 'success',
        message: 'Post aprovado com sucesso!',
      });
    });
  }

  function handleRequestAdjustment() {
    setFeedback(null);

    if (!name.trim()) {
      setFeedback({
        type: 'error',
        message: 'Informe seu nome antes de solicitar um ajuste.',
      });
      return;
    }

    if (!message.trim()) {
      setFeedback({
        type: 'error',
        message: 'Descreva o ajuste que deseja solicitar.',
      });
      return;
    }

    startTransition(async () => {
      const result = await requestPublicPostAdjustment({
        token,
        postId,
        name: name.trim(),
        message: message.trim(),
      });

      if (!result.success) {
        setFeedback({
          type: 'error',
          message: result.error || 'Não foi possível solicitar o ajuste.',
        });
        return;
      }

      setFeedback({
        type: 'success',
        message: 'Solicitação de ajuste enviada com sucesso!',
      });

      setMessage('');
      setMode('idle');
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-zinc-900">
          Aprovação do post
        </h2>

        {postTitle ? (
          <p className="mt-1 text-sm text-zinc-500">{postTitle}</p>
        ) : null}
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="approval-name"
            className="mb-1 block text-sm font-medium text-zinc-700"
          >
            Seu nome
          </label>

          <input
            id="approval-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Digite seu nome"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>

        {mode === 'adjustment' ? (
          <div>
            <label
              htmlFor="approval-message"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              O que precisa ser ajustado?
            </label>

            <textarea
              id="approval-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Descreva aqui o ajuste desejado..."
              rows={5}
              className="w-full resize-none rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
        ) : null}

        {feedback ? (
          <div
            className={
              feedback.type === 'success'
                ? 'rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700'
                : 'rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
            }
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          {mode === 'adjustment' ? (
            <>
              <button
                type="button"
                onClick={handleRequestAdjustment}
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? 'Enviando...' : 'Enviar ajuste'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('idle');
                  setMessage('');
                  setFeedback(null);
                }}
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-xl bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? 'Aprovando...' : 'Aprovar post'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('adjustment');
                  setFeedback(null);
                }}
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Solicitar ajuste
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}