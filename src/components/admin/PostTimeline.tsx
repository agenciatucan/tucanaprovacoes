// Server Component — sem 'use client'
// Linha do tempo do post: criação → eventos de aprovação/ajuste → formulário atual
import { Icon } from '@/components/ui/Icon';
import { formatDateTime, FORMAT_LABEL } from '@/lib/utils';
import PostForm from './PostForm';
import ResendApprovalPanel from './ResendApprovalPanel';

// ── Tipos ─────────────────────────────────────────────────────

interface ApprovalEvent {
  id: string;
  approval_type: string;
  status: string;
  note: string | null;
  created_at: string;
  approved_by: string;
  user_profiles: { name: string; role: string } | null;
}

interface EventGroup {
  approver: string;
  role: string;
  date: string; // created_at do primeiro evento do grupo
  events: ApprovalEvent[];
}

interface PostData {
  id: string;
  campaign_id: string;
  week_label: string;
  order_index: number;
  format: string;
  title: string;
  theme: string | null;
  objective: string | null;
  creative_concept: string | null;
  caption: string | null;
  script: string | null;
  reference_url: string | null;
  internal_notes: string | null;
  theme_status: string;
  caption_status: string;
  artwork_status: string;
  general_status: string;
  created_at: string;
}

interface Comment {
  id: string;
  message: string;
  created_at: string;
  user_profiles: { name: string } | { name: string }[] | null;
}

interface Props {
  post: PostData;
  campaignId: string;
  createdByName: string | null;
  approvalHistory: ApprovalEvent[];
  comments: Comment[];
  returnHref: string;
}

// ── Config visual por status ──────────────────────────────────

const FIELD_LABEL: Record<string, string> = {
  tema:          'Tema',
  legenda:       'Legenda',
  arte:          'Arte',
  post_completo: 'Post completo',
};

const STATUS_CFG: Record<string, { label: string; symbol: string; fg: string; bg: string; border: string }> = {
  aprovado:          { label: 'Aprovado',          symbol: '✓', fg: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
  ajuste_solicitado: { label: 'Ajuste solicitado', symbol: '↩', fg: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  substituir_tema:   { label: 'Substituir tema',   symbol: '↩', fg: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  nao_se_aplica:     { label: 'Não se aplica',     symbol: '—', fg: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
};

const ADJUST_STATUSES = ['ajuste_solicitado', 'substituir_tema'];

// ── Agrupamento de eventos próximos do mesmo usuário ──────────
// Eventos do mesmo aprovador dentro de 3 minutos → mesmo grupo

function groupEvents(events: ApprovalEvent[]): EventGroup[] {
  const groups: EventGroup[] = [];
  const THREE_MIN = 3 * 60 * 1000;

  for (const ev of events) {
    const last = groups[groups.length - 1];
    const sameUser = last && last.approver === (ev.user_profiles?.name ?? ev.approved_by);
    const closeInTime = last &&
      Math.abs(new Date(ev.created_at).getTime() - new Date(last.date).getTime()) < THREE_MIN;

    if (last && sameUser && closeInTime) {
      last.events.push(ev);
    } else {
      groups.push({
        approver: ev.user_profiles?.name ?? 'Usuário',
        role:     ev.user_profiles?.role ?? 'cliente',
        date:     ev.created_at,
        events:   [ev],
      });
    }
  }

  return groups;
}

// ── Componente principal ──────────────────────────────────────

export default function PostTimeline({
  post,
  campaignId,
  createdByName,
  approvalHistory,
  comments,
  returnHref,
}: Props) {
  const groups = groupEvents(approvalHistory);

  const isAdjustPending =
    ADJUST_STATUSES.includes(post.theme_status) ||
    ADJUST_STATUSES.includes(post.caption_status) ||
    ADJUST_STATUSES.includes(post.artwork_status);

  const totalItems = 1 + groups.length + 1; // criação + grupos + form
  const lineHeight = totalItems > 1; // só mostra linha vertical se há mais de 1 item

  return (
    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* Linha vertical conectando os itens */}
      {lineHeight && (
        <div style={{
          position: 'absolute',
          left: 15, top: 16, bottom: 40,
          width: 2,
          background: 'var(--line)',
          zIndex: 0,
        }} />
      )}

      {/* ─────── 1. Criação ─────── */}
      <TLItem
        dotBg="var(--green)"
        dotIcon="plus"
        title="Post criado"
        meta={[
          createdByName ?? 'Equipe Tucan',
          formatDateTime(post.created_at),
        ]}
      >
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <span className="chip" style={{ fontSize: 11 }}>{post.week_label}</span>
            <span className="fmt" style={{ fontSize: 11 }}>{FORMAT_LABEL[post.format] ?? post.format}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
            {post.title}
          </div>
          {post.theme && (
            <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
              <span style={{ fontWeight: 600 }}>Tema:</span> {post.theme}
            </div>
          )}
          {post.objective && (
            <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>
              <span style={{ fontWeight: 600 }}>Objetivo:</span> {post.objective}
            </div>
          )}
        </div>
      </TLItem>

      {/* ─────── 2. Eventos de aprovação/ajuste ─────── */}
      {groups.map((group, gi) => {
        const isClient = group.role === 'cliente';
        const hasAdjust = group.events.some((e) => ADJUST_STATUSES.includes(e.status));
        const hasApprove = group.events.some((e) => e.status === 'aprovado');

        // Ícone e cor do dot do grupo
        const dotBg = hasAdjust ? '#f59e0b' : 'var(--green)';
        const dotIcon = hasAdjust ? 'edit' : 'check';

        // Título do grupo
        let groupTitle = '';
        if (hasAdjust && hasApprove) groupTitle = 'Aprovação parcial + ajuste solicitado';
        else if (hasAdjust) groupTitle = `Ajuste solicitado`;
        else groupTitle = `Aprovado`;

        return (
          <TLItem
            key={gi}
            dotBg={dotBg}
            dotIcon={dotIcon}
            title={groupTitle}
            meta={[group.approver, formatDateTime(group.date)]}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.events.map((ev) => {
                const cfg = STATUS_CFG[ev.status] ?? { label: ev.status, symbol: '•', fg: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' };
                const fieldLabel = FIELD_LABEL[ev.approval_type] ?? ev.approval_type;
                const isAdj = ADJUST_STATUSES.includes(ev.status);

                return (
                  <div
                    key={ev.id}
                    style={{
                      border: `1px solid ${cfg.border}`,
                      borderRadius: 10,
                      background: cfg.bg,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Cabeçalho do evento */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '9px 13px',
                      borderBottom: ev.note ? `1px solid ${cfg.border}` : 'none',
                    }}>
                      <span style={{
                        fontSize: 13, fontWeight: 800, color: cfg.fg,
                        minWidth: 16, textAlign: 'center',
                      }}>
                        {cfg.symbol}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: cfg.fg }}>
                        {fieldLabel}
                      </span>
                      <span style={{
                        fontSize: 11, color: cfg.fg, opacity: 0.8,
                        background: 'rgba(0,0,0,0.06)', borderRadius: 4,
                        padding: '1px 6px', marginLeft: 'auto',
                      }}>
                        {cfg.label}
                      </span>
                    </div>

                    {/* Observação do cliente */}
                    {ev.note && (
                      <div style={{ padding: '10px 13px' }}>
                        <div style={{
                          fontSize: 13, color: '#78350f', lineHeight: 1.6,
                          fontStyle: 'italic',
                        }}>
                          "{ev.note}"
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TLItem>
        );
      })}

      {/* ─────── 3. Estado atual — formulário editável ─────── */}
      <TLItem
        dotBg={isAdjustPending ? '#f59e0b' : '#94a3b8'}
        dotIcon={isAdjustPending ? 'edit' : 'file'}
        title="Estado atual"
        isLast
      >
        {/* Banner de reenvio (só aparece quando há ajustes pendentes) */}
        <ResendApprovalPanel
          postId={post.id}
          themeStatus={post.theme_status}
          captionStatus={post.caption_status}
          artworkStatus={post.artwork_status}
          comments={comments}
        />

        {/* Formulário de edição */}
        <div
          className="card card-lg"
          style={{ marginTop: isAdjustPending ? 14 : 0 }}
        >
          <h2 className="h2" style={{ fontSize: 16, marginBottom: 20 }}>
            Editar conteúdo
          </h2>
          <PostForm
            campaignId={campaignId}
            returnHref={returnHref}
            initial={{
              id:               post.id,
              campaign_id:      campaignId,
              week_label:       post.week_label,
              order_index:      post.order_index,
              format:           post.format,
              title:            post.title,
              theme:            post.theme,
              objective:        post.objective,
              creative_concept: post.creative_concept,
              caption:          post.caption,
              script:           post.script,
              reference_url:    post.reference_url,
              internal_notes:   post.internal_notes,
            }}
          />
        </div>
      </TLItem>
    </div>
  );
}

// ── Sub-componente: item da timeline ──────────────────────────

function TLItem({
  dotBg,
  dotIcon,
  title,
  meta,
  isLast,
  children,
}: {
  dotBg: string;
  dotIcon: string;
  title: string;
  meta?: string[];
  isLast?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex',
      gap: 16,
      paddingBottom: isLast ? 0 : 28,
      position: 'relative',
      zIndex: 1,
    }}>
      {/* Dot */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: dotBg, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 0 4px #fff',
        marginTop: 0,
      }}>
        <Icon name={dotIcon} size={14} stroke={2.2} />
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: 3 }}>
        {/* Cabeçalho do item */}
        <div style={{
          display: 'flex', alignItems: 'baseline',
          gap: 8, marginBottom: 10, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
            {title}
          </span>
          {meta && meta.length > 0 && (
            <>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                por {meta[0]}
              </span>
              {meta[1] && (
                <span style={{
                  fontSize: 11, color: 'var(--muted)',
                  marginLeft: 'auto', flexShrink: 0,
                }}>
                  {meta[1]}
                </span>
              )}
            </>
          )}
        </div>

        {/* Children */}
        {children}
      </div>
    </div>
  );
}
