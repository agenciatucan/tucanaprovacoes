'use server';

import { cookies } from 'next/headers';
import {
  getSupabaseServerClient,
  getSupabaseServiceClient,
} from '@/lib/supabase/server';

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

type PublicClientData = {
  id: string;
  name?: string | null;
  company_name?: string | null;
  email?: string | null;
};

type PublicCampaignData = {
  id: string;
  client_id: string;
  name: string;
  title?: string | null;
  status?: string | null;
  approval_token: string;
  access_code?: string | null;
  public_token?: string | null;
  token?: string | null;
  token_expires_at?: string | null;
  period_label?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  clients?: PublicClientData | PublicClientData[] | null;
};

type PublicSession = {
  campaign_id: string;
  visitor_name: string;
  visitor_email: string | null;
  identified_at: string;
};

type IdentifyPublicVisitorParams = {
  access?: unknown;
  defaultAccess?: unknown;
  token?: string;
  visitorName: string;
  visitorEmail?: string;
};

const VISIBLE_CAMPAIGN_STATUSES = [
  'enviado_para_aprovacao',
  'em_revisao',
  'aprovado',
  'em_producao',
  'finalizado',
];

function getSessionCookieName(campaignId: string) {
  return `tucan_public_access_${campaignId}`;
}

async function getPublicSupabaseClient() {
  try {
    return await getSupabaseServiceClient();
  } catch {
    return await getSupabaseServerClient();
  }
}

function getTokenFromAccess(access: unknown): string | null {
  if (typeof access === 'string') {
    return access.trim() || null;
  }

  const accessData = access as
    | {
        token?: string | null;
        approval_token?: string | null;
        public_token?: string | null;
        campaign?: {
          token?: string | null;
          approval_token?: string | null;
          public_token?: string | null;
        } | null;
      }
    | null
    | undefined;

  return (
    accessData?.token ||
    accessData?.approval_token ||
    accessData?.public_token ||
    accessData?.campaign?.token ||
    accessData?.campaign?.approval_token ||
    accessData?.campaign?.public_token ||
    null
  );
}

function getCampaignIdFromAccess(access: unknown): string | null {
  const accessData = access as
    | {
        id?: string | null;
        campaign_id?: string | null;
        campaign?: {
          id?: string | null;
          campaign_id?: string | null;
        } | null;
      }
    | null
    | undefined;

  return (
    accessData?.campaign_id ||
    accessData?.id ||
    accessData?.campaign?.campaign_id ||
    accessData?.campaign?.id ||
    null
  );
}

function getSafePath(access: unknown, fallbackToken?: string | null): string {
  const accessData = access as
    | {
        path?: string | null;
        href?: string | null;
        url?: string | null;
        redirectTo?: string | null;
      }
    | null
    | undefined;

  const directPath =
    accessData?.path ||
    accessData?.href ||
    accessData?.url ||
    accessData?.redirectTo ||
    null;

  if (typeof directPath === 'string' && directPath.startsWith('/')) {
    return directPath;
  }

  const token = fallbackToken || getTokenFromAccess(access);

  if (token) {
    return `/acesso/${token}`;
  }

  return '/';
}

async function findCampaignByToken(token: string): Promise<{
  data: PublicCampaignData | null;
  error: string | null;
}> {
  const supabase = await getPublicSupabaseClient();

  const cleanToken = token.trim();

  const selectFields = `
    id,
    client_id,
    name,
    status,
    approval_token,
    access_code,
    token_expires_at,
    period_label,
    start_date,
    end_date,
    clients (
      id,
      name,
      company_name,
      email
    )
  `;

  const attempts: Array<{ column: string; value: string; mode: 'eq' | 'ilike' }> = [
    { column: 'approval_token', value: cleanToken, mode: 'eq' },
    { column: 'access_code', value: cleanToken, mode: 'ilike' },
  ];

  for (const attempt of attempts) {
    const query = supabase.from('campaigns').select(selectFields);

    const { data, error } =
      attempt.mode === 'ilike'
        ? await query.ilike(attempt.column, attempt.value).maybeSingle()
        : await query.eq(attempt.column, attempt.value).maybeSingle();

    if (data) {
      return {
        data: data as PublicCampaignData,
        error: null,
      };
    }

    if (error) {
      return {
        data: null,
        error: error.message,
      };
    }
  }

  return {
    data: null,
    error: null,
  };
}

async function savePublicAccessSession(params: {
  campaignId: string;
  visitorName: string;
  visitorEmail: string | null;
}) {
  const cookieStore = await cookies();
  const session: PublicSession = {
    campaign_id: params.campaignId,
    visitor_name: params.visitorName,
    visitor_email: params.visitorEmail,
    identified_at: new Date().toISOString(),
  };

  cookieStore.set(getSessionCookieName(params.campaignId), JSON.stringify(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  try {
    const supabase = await getPublicSupabaseClient();

    await supabase.from('public_access_sessions').insert({
      campaign_id: params.campaignId,
      visitor_name: params.visitorName,
      visitor_email: params.visitorEmail,
    });
  } catch {
    // A tabela public_access_sessions é opcional. O cookie já mantém a sessão funcionando.
  }

  return session;
}

export async function getPublicAccessByToken(
  token: string,
): Promise<ActionResult<PublicCampaignData>> {
  try {
    if (!token || !token.trim()) {
      return {
        success: false,
        error: 'Token inválido.',
      };
    }

    const result = await findCampaignByToken(token.trim());

    if (result.error) {
      return {
        success: false,
        error: result.error,
      };
    }

    if (!result.data) {
      return {
        success: false,
        error: 'Link de acesso inválido ou expirado.',
      };
    }

    if (!VISIBLE_CAMPAIGN_STATUSES.includes(result.data.status || '')) {
      return {
        success: false,
        error: 'Este cronograma ainda não está disponível para aprovação pública.',
      };
    }

    if (
      result.data.token_expires_at &&
      new Date(result.data.token_expires_at).getTime() < Date.now()
    ) {
      return {
        success: false,
        error: 'Este link de aprovação expirou.',
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Não foi possível validar o acesso público.',
    };
  }
}

export async function validatePublicAccess(
  token: string,
): Promise<ActionResult<PublicCampaignData>> {
  return getPublicAccessByToken(token);
}

export async function getPublicAccess(
  token: string,
): Promise<ActionResult<PublicCampaignData>> {
  return getPublicAccessByToken(token);
}

export async function getPublicCampaignByAccess(
  token: string,
): Promise<ActionResult<{ campaign: PublicCampaignData }>> {
  const result = await getPublicAccessByToken(token);

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    data: {
      campaign: result.data,
    },
  };
}

export async function getPublicSession(
  campaignId: string,
): Promise<PublicSession | null> {
  try {
    if (!campaignId) return null;

    const cookieStore = await cookies();
    const rawSession = cookieStore.get(getSessionCookieName(campaignId))?.value;

    if (!rawSession) return null;

    const parsed = JSON.parse(rawSession) as PublicSession;

    if (!parsed?.visitor_name || parsed.campaign_id !== campaignId) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function identifyPublicVisitor({
  access,
  defaultAccess,
  token,
  visitorName,
  visitorEmail,
}: IdentifyPublicVisitorParams): Promise<
  ActionResult<{
    access: unknown;
    visitorName: string;
    visitorEmail: string | null;
    identifiedAt: string;
    path: string;
    href: string;
    url: string;
    redirectTo: string;
  }>
> {
  try {
    if (!visitorName || !visitorName.trim()) {
      return {
        success: false,
        error: 'Informe seu nome para continuar.',
      };
    }

    const cleanName = visitorName.trim();
    const cleanEmail = visitorEmail?.trim() || null;
    const accessPayload = access ?? defaultAccess ?? token ?? null;
    const accessToken = token || getTokenFromAccess(accessPayload);

    let campaignId = getCampaignIdFromAccess(accessPayload);
    let safePath = getSafePath(accessPayload, accessToken);
    let finalAccess = accessPayload;

    if (accessToken) {
      const campaignResult = await getPublicAccessByToken(accessToken);

      if (!campaignResult.success) {
        return campaignResult;
      }

      campaignId = campaignResult.data.id;
      finalAccess = campaignResult.data;
      safePath = `/acesso/${campaignResult.data.approval_token}`;
    }

    if (campaignId) {
      await savePublicAccessSession({
        campaignId,
        visitorName: cleanName,
        visitorEmail: cleanEmail,
      });
    }

    return {
      success: true,
      data: {
        access: finalAccess,
        visitorName: cleanName,
        visitorEmail: cleanEmail,
        identifiedAt: new Date().toISOString(),
        path: safePath,
        href: safePath,
        url: safePath,
        redirectTo: safePath,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Não foi possível identificar o visitante.',
    };
  }
}
