// Limpeza do Storage ao excluir cliente, cronograma ou post (docs/auditoria-projeto, AUD-010).
//
// Os buckets são públicos e o ON DELETE CASCADE só apaga as linhas de `files`:
// sem esta limpeza, as artes continuam acessíveis pela URL depois da exclusão.
// Uso: coletar os caminhos ANTES de excluir o registro e remover DEPOIS que a
// exclusão no banco deu certo (assim uma falha no banco não deixa imagens quebradas).

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const CAMPAIGN_FILES_BUCKET = 'campaign-files';
export const CLIENT_LOGOS_BUCKET = 'client-logos';

type FilesScope = 'client_id' | 'campaign_id' | 'content_item_id';

export async function collectCampaignFilePaths(scope: FilesScope, id: string): Promise<string[]> {
  const service = await getSupabaseServiceClient();
  const { data, error } = await service
    .from('files')
    .select('storage_path')
    .eq(scope, id)
    .not('storage_path', 'is', null);

  if (error) {
    logger.error('collectCampaignFilePaths', error.message);
    return [];
  }

  return (data ?? []).map((row) => row.storage_path as string);
}

/** Caminho do objeto a partir da URL pública (`.../object/public/<bucket>/<caminho>`). */
export function storagePathFromPublicUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;
  const marker = `/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}

/** Remove objetos do bucket; falhas são registradas e não interrompem a exclusão. */
export async function removeStorageObjects(bucket: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;

  const service = await getSupabaseServiceClient();
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await service.storage.from(bucket).remove(paths.slice(i, i + 100));
    if (error) logger.error('removeStorageObjects', { bucket, message: error.message });
  }
}
