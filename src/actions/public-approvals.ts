'use server';

import { revalidatePath } from 'next/cache';
import {
  getSupabaseServerClient,
  getSupabaseServiceClient,
} from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

type ClientData = {
  id?: string;
  name?: string | null;
  company_name?: string | null;
  logo_url?: string | null;
};

type CampaignData = {
  id: string;
  client_id: string;
  name?: string | null;
  title?: string | null;
  approval_token?: string | null;
  status?: string | null;
  clients?: ClientData | ClientData[] | null;
};

type FileData = {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size_bytes: number | null;
};

type PostData = {
  id: string;
  campaign_id: string;
  client_id?: string | null;
  week_label?: string | null;
  order_index?: number | null;
  format?: string | null;
  title?: string | null;
  theme?: string | null;
  objective?: string | null;
  creative_concept?: string | null;
  caption?: string | null;
  script?: string | null;
  reference_url?: string | null;
  theme_status?: string | null;
  caption_status?: string | null;
  artwork_status?: string | null;
  general_status?: string | null;
  status?: string | null;
  description?: string | null;
  type?: string | null;
  scheduled_date?: string | null;
  publish_date?: string | null;
  published_at?: string | null;
  image_url?: string | null;
  media_url?: string | null;
};

type PublicPostData = {
  campaign: CampaignData;
  post: PostData;
  files: FileData[];
};

// Todas as ações públicas usam service role (sem sessão), mas cada query
// é obrigatoriamente escopada por client_id derivado do token validado,
// impedindo acesso a dados de outros clientes mesmo com a chave de serviço.
async function getPublicSupabaseClient() {
  return getSupabaseServiceClient();
}

async function findCampaignByToken(token: string): Promise<{
  data: CampaignData | null;
  error: string | null;
}> {
  const supabase = await getPublicSupabaseClient();

  const { data, error } = await supabase
    .from('campaigns')
    .select('id, client_id, name, status, approval_token, clients(name, company_name, logo_url)')
    .eq('approval_token', token)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: error.message,
    };
  }

  return {
    data: data as CampaignData | null,
    error: null,
  };
}

async function savePublicApprovalEvent(params: {
  campaignId: string;
  contentItemId: string;
  visitorName?: string;
  eventType: 'approval' | 'adjustment';
  message?: string | null;
}) {
  try {
    const supabase = await getPublicSupabaseClient();

    await supabase.from('public_approval_events').insert({
      campaign_id: params.campaignId,
      content_item_id: params.contentItemId,
      visitor_name: params.visitorName || 'Cliente',
      event_type: params.eventType,
      message: params.message || null,
    });
  } catch {
    // A tabela public_approval_events é opcional. O status do post já foi atualizado.
  }
}

export async function getPublicPostForApproval(
  token: string,
  postId: string,
): Promise<ActionResult<PublicPostData>> {
  try {
    if (!token || !postId) {
      return {
        success: false,
        error: 'Token ou post inválido.',
      };
    }

    const supabase = await getPublicSupabaseClient();
    const campaignResult = await findCampaignByToken(token);

    if (campaignResult.error) {
      return {
        success: false,
        error: `Erro ao buscar cronograma: ${campaignResult.error}`,
      };
    }

    if (!campaignResult.data) {
      return {
        success: false,
        error:
          'Cronograma não encontrado para este token. Verifique se o token salvo no banco é o mesmo usado no link.',
      };
    }

    const { data: post, error: postError } = await supabase
      .from('content_items')
      .select(
        'id, campaign_id, client_id, week_label, order_index, format, title, theme, objective, creative_concept, caption, script, reference_url, theme_status, caption_status, artwork_status, general_status'
      )
      .eq('id', postId)
      .eq('campaign_id', campaignResult.data.id)
      .eq('client_id', campaignResult.data.client_id)
      .maybeSingle();

    if (postError) {
      return {
        success: false,
        error: `Erro ao buscar post: ${postError.message}`,
      };
    }

    if (!post) {
      return {
        success: false,
        error:
          'Post não encontrado dentro deste cronograma. O postId do link pode não pertencer a este cronograma.',
      };
    }

    const normalizedPost = {
      ...(post as PostData),
      status: post.general_status,
      description: post.objective || post.creative_concept || post.theme || null,
      type: post.format,
    };

    const { data: files } = await supabase
      .from('files')
      .select('id, file_name, file_url, file_type, file_size_bytes')
      .eq('content_item_id', postId)
      .eq('visible_to_client', true)
      .order('created_at', { ascending: true });

    return {
      success: true,
      data: {
        campaign: campaignResult.data,
        post: normalizedPost,
        files: (files as FileData[] | null) ?? [],
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro inesperado ao buscar o post.',
    };
  }
}

export async function approvePublicPost(params: {
  token: string;
  postId: string;
  name?: string;
}): Promise<ActionResult> {
  try {
    const supabase = await getPublicSupabaseClient();
    const { token, postId, name } = params;

    // Rate limit: máximo 60 aprovações por token a cada hora
    const rl = await checkRateLimit({ key: token, action: 'publicApproval', limit: 60, windowSeconds: 3600 });
    if (!rl.allowed) {
      return { success: false, error: 'Muitas ações em curto período. Aguarde alguns minutos.' };
    }

    // Revalida token antes de aprovar — garante que links expirados não aprovam posts
    const { data: tokenCheck } = await supabase
      .from('campaigns')
      .select('id, token_expires_at, status')
      .eq('approval_token', token)
      .maybeSingle();

    if (!tokenCheck) return { success: false, error: 'Link inválido.' };
    if (tokenCheck.status === 'arquivado') return { success: false, error: 'Este cronograma foi arquivado.' };
    if (tokenCheck.token_expires_at && new Date(tokenCheck.token_expires_at) < new Date()) {
      return { success: false, error: 'Este link de aprovação expirou.' };
    }

    const result = await getPublicPostForApproval(token, postId);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Post não encontrado.',
      };
    }

    const { campaign } = result.data;

    const { error } = await supabase
      .from('content_items')
      .update({
        theme_status: 'aprovado',
        caption_status: 'aprovado',
        artwork_status: 'aprovado',
        general_status: 'aprovado',
      })
      .eq('id', postId)
      .eq('campaign_id', campaign.id)
      .eq('client_id', campaign.client_id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    await savePublicApprovalEvent({
      campaignId: campaign.id,
      contentItemId: postId,
      visitorName: name,
      eventType: 'approval',
      message: 'Post aprovado pelo link público.',
    });

    revalidatePath(`/acesso/${token}`);
    revalidatePath(`/acesso/${token}/posts/${postId}`);

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro inesperado ao aprovar o post.',
    };
  }
}

export async function requestPublicPostAdjustment(params: {
  token: string;
  postId: string;
  name?: string;
  message: string;
}): Promise<ActionResult> {
  try {
    const supabase = await getPublicSupabaseClient();
    const { token, postId, name, message } = params;

    if (!message.trim()) {
      return { success: false, error: 'Digite o ajuste solicitado.' };
    }

    // Rate limit: compartilhado com approvePublicPost (mesmo bucket por token)
    const rl = await checkRateLimit({ key: token, action: 'publicApproval', limit: 60, windowSeconds: 3600 });
    if (!rl.allowed) {
      return { success: false, error: 'Muitas ações em curto período. Aguarde alguns minutos.' };
    }

    // Revalida token antes de registrar ajuste
    const { data: tokenCheck } = await supabase
      .from('campaigns')
      .select('id, token_expires_at, status')
      .eq('approval_token', token)
      .maybeSingle();

    if (!tokenCheck) return { success: false, error: 'Link inválido.' };
    if (tokenCheck.status === 'arquivado') return { success: false, error: 'Este cronograma foi arquivado.' };
    if (tokenCheck.token_expires_at && new Date(tokenCheck.token_expires_at) < new Date()) {
      return { success: false, error: 'Este link de aprovação expirou.' };
    }

    const result = await getPublicPostForApproval(token, postId);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Post não encontrado.',
      };
    }

    const { campaign } = result.data;

    const { error } = await supabase
      .from('content_items')
      .update({
        theme_status: 'ajuste_solicitado',
        caption_status: 'ajuste_solicitado',
        artwork_status: 'ajuste_solicitado',
        general_status: 'em_revisao',
      })
      .eq('id', postId)
      .eq('campaign_id', campaign.id)
      .eq('client_id', campaign.client_id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    await savePublicApprovalEvent({
      campaignId: campaign.id,
      contentItemId: postId,
      visitorName: name,
      eventType: 'adjustment',
      message: message.trim(),
    });

    revalidatePath(`/acesso/${token}`);
    revalidatePath(`/acesso/${token}/posts/${postId}`);

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro inesperado ao solicitar ajuste.',
    };
  }
}

export const requestAdjustmentPublicPost = requestPublicPostAdjustment;
export const requestChangesPublicPost = requestPublicPostAdjustment;
export const getPublicApprovalPost = getPublicPostForApproval;
export const getPostForPublicApproval = getPublicPostForApproval;
