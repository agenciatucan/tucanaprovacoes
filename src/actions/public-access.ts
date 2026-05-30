'use server';

import { cookies, headers } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const PUBLIC_VISIBLE_CAMPAIGN_STATUSES = [
  'enviado_para_aprovacao',
  'em_revisao',
  'aprovado',
  'em_producao',
  'finalizado',
];

type PublicAccessResult =
  | {
      success: true;
      data: {
        campaignId: string;
        campaignName: string;
        token: string;
        accessCode: string | null;
        redirectTo: string;
        sessionId: string;
        visitorName: string;
      };
    }
  | {
      success: false;
      error: string;
    };

function cleanAccessInput(value: string) {
  const cleanValue = value.trim();

  if (!cleanValue) return '';

  try {
    const url = new URL(cleanValue);

    const parts = url.pathname.split('/').filter(Boolean);
    const acessoIndex = parts.findIndex((part) => part === 'acesso');

    if (acessoIndex >= 0 && parts[acessoIndex + 1]) {
      return decodeURIComponent(parts[acessoIndex + 1] ?? '').trim();
    }

    return cleanValue;
  } catch {
    return cleanValue;
  }
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

function getPublicSessionCookieName(campaignId: string) {
  return `tucan_public_session_${campaignId}`;
}

function getVisitorNameCookieName(campaignId: string) {
  return `tucan_public_name_${campaignId}`;
}

export async function getPublicCampaignByAccess(access: string) {
  const supabase = await getSupabaseServerClient();

  const cleanAccess = cleanAccessInput(access);
  const normalizedCode = normalizeCode(cleanAccess);

  if (!cleanAccess) {
    return {
      success: false as const,
      error: 'Informe um link ou código de acesso.',
    };
  }

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select(
      `
      id,
      name,
      status,
      approval_token,
      access_code,
      token_expires_at,
      is_locked,
      clients(name, company_name)
    `
    )
    .or(
      `approval_token.eq.${cleanAccess},access_code.eq.${normalizedCode}`
    )
    .maybeSingle();

  if (error || !campaign) {
    return {
      success: false as const,
      error: 'Link ou código de acesso inválido.',
    };
  }

  if (!PUBLIC_VISIBLE_CAMPAIGN_STATUSES.includes(campaign.status)) {
    return {
      success: false as const,
      error:
        campaign.status === 'rascunho'
          ? 'Este cronograma ainda não foi liberado para o cliente.'
          : 'Este cronograma não está disponível para acesso público.',
    };
  }

  if (campaign.token_expires_at) {
    const expiresAt = new Date(campaign.token_expires_at).getTime();
    const now = Date.now();

    if (expiresAt < now) {
      return {
        success: false as const,
        error: 'Este link de acesso expirou. Solicite um novo link.',
      };
    }
  }

  return {
    success: true as const,
    data: {
      campaign,
      usedAccess: cleanAccess,
      normalizedCode,
    },
  };
}

export async function identifyPublicVisitor({
  access,
  visitorName,
  visitorEmail,
}: {
  access: string;
  visitorName: string;
  visitorEmail?: string;
}): Promise<PublicAccessResult> {
  const cleanName = visitorName.trim().replace(/\s+/g, ' ');
  const cleanEmail = visitorEmail?.trim() || null;

  if (cleanName.length < 3) {
    return {
      success: false,
      error: 'Informe seu nome para continuar.',
    };
  }

  const campaignResult = await getPublicCampaignByAccess(access);

  if (!campaignResult.success) {
    return {
      success: false,
      error: campaignResult.error,
    };
  }

  const { campaign, usedAccess, normalizedCode } = campaignResult.data;

  const supabase = await getSupabaseServerClient();
  const headersList = await headers();

  const userAgent = headersList.get('user-agent');
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');

  const ipAddress =
    forwardedFor?.split(',')[0]?.trim() || realIp || null;

  const isCodeAccess = normalizeCode(campaign.access_code ?? '') === normalizedCode;

  const { data: existingSession } = await supabase
    .from('public_access_sessions')
    .select('id, access_count')
    .eq('campaign_id', campaign.id)
    .eq('visitor_name', cleanName)
    .maybeSingle();

  let sessionId = existingSession?.id;

  if (existingSession?.id) {
    const { error: updateError } = await supabase
      .from('public_access_sessions')
      .update({
        visitor_email: cleanEmail,
        approval_token: campaign.approval_token,
        access_code: campaign.access_code,
        ip_address: ipAddress,
        user_agent: userAgent,
        last_access_at: new Date().toISOString(),
        access_count: (existingSession.access_count ?? 0) + 1,
      })
      .eq('id', existingSession.id);

    if (updateError) {
      return {
        success: false,
        error: 'Não foi possível registrar o acesso. Tente novamente.',
      };
    }
  } else {
    const { data: createdSession, error: insertError } = await supabase
      .from('public_access_sessions')
      .insert({
        campaign_id: campaign.id,
        visitor_name: cleanName,
        visitor_email: cleanEmail,
        approval_token: isCodeAccess ? null : usedAccess,
        access_code: campaign.access_code,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select('id')
      .single();

    if (insertError || !createdSession) {
      return {
        success: false,
        error: 'Não foi possível registrar o acesso. Tente novamente.',
      };
    }

    sessionId = createdSession.id;
  }

  if (!sessionId) {
    return {
      success: false,
      error: 'Não foi possível iniciar sua sessão de acesso.',
    };
  }

  const cookieStore = await cookies();

  cookieStore.set(getPublicSessionCookieName(campaign.id), sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  cookieStore.set(getVisitorNameCookieName(campaign.id), cleanName, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  return {
    success: true,
    data: {
      campaignId: campaign.id,
      campaignName: campaign.name,
      token: campaign.approval_token,
      accessCode: campaign.access_code,
      redirectTo: `/acesso/${campaign.approval_token}`,
      sessionId,
      visitorName: cleanName,
    },
  };
}

export async function getPublicSession(campaignId: string) {
  const cookieStore = await cookies();

  const sessionId = cookieStore.get(getPublicSessionCookieName(campaignId))?.value;

  if (!sessionId) return null;

  const supabase = await getSupabaseServerClient();

  const { data: session } = await supabase
    .from('public_access_sessions')
    .select('id, visitor_name, visitor_email, first_access_at, last_access_at')
    .eq('id', sessionId)
    .eq('campaign_id', campaignId)
    .maybeSingle();

  return session;
}