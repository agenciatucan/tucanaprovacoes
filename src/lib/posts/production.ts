// Saída automática de "Em produção" (decisão do responsável em 2026-10-15).
//
// Post em produção passa a "aguardando aprovação" (general_status 'pendente')
// assim que tiver legenda e pelo menos um arquivo visível ao cliente. Chamado
// depois de salvar o post e depois de subir/mostrar um arquivo.

import type { getSupabaseServerClient } from '@/lib/supabase/server';

type ServerClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;

/** Retorna true se o post saiu de produção. */
export async function promoteIfReadyForApproval(supabase: ServerClient, postId: string): Promise<boolean> {
  const { data: post } = await supabase
    .from('content_items')
    .select('general_status, caption')
    .eq('id', postId)
    .maybeSingle();

  if (!post || post.general_status !== 'em_producao' || !post.caption?.trim()) return false;

  const { count } = await supabase
    .from('files')
    .select('id', { count: 'exact', head: true })
    .eq('content_item_id', postId)
    .eq('visible_to_client', true);

  if (!count) return false;

  // Condicional: só sai de produção se ainda estiver em produção.
  const { data: updated } = await supabase
    .from('content_items')
    .update({ general_status: 'pendente' })
    .eq('id', postId)
    .eq('general_status', 'em_producao')
    .select('id');

  return (updated?.length ?? 0) > 0;
}
