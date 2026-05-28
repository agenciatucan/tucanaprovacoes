import { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import TeamMemberRow from "@/components/admin/TeamMemberRow";
import TeamInviteForm from "@/components/admin/TeamInviteForm";

export const metadata: Metadata = { title: "Configurações" };

const ROLE_COLOR: Record<string, { bg: string; fg: string }> = {
  admin: { bg: "var(--st-aprovado-bg)", fg: "var(--st-aprovado-fg)" },
  equipe: { bg: "var(--st-agendado-bg)", fg: "var(--st-agendado-fg)" },
  cliente: { bg: "var(--st-rascunho-bg)", fg: "var(--st-rascunho-fg)" },
};

const DEFAULT_COLORS = {
  bg: "var(--st-rascunho-bg)",
  fg: "var(--st-rascunho-fg)",
};

export default async function ConfiguracoesPage() {
  const me = await requireAdmin();
  const supabase = await getSupabaseServerClient();

  const [
    { data: teamMembers },
    { count: totalClients },
    { count: totalCampaigns },
    { count: totalPosts },
    { count: totalFiles },
  ] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id, name, email, role, created_at")
      .in("role", ["admin", "equipe"])
      .order("role")
      .order("name"),
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("campaigns").select("*", { count: "exact", head: true }),
    supabase
      .from("content_items")
      .select("*", { count: "exact", head: true }),
    supabase.from("files").select("*", { count: "exact", head: true }),
  ]);

  const adminsCount =
    teamMembers?.filter((member) => member.role === "admin").length ?? 0;

  const equipeCount =
    teamMembers?.filter((member) => member.role === "equipe").length ?? 0;

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div className="eyebrow">Admin · acesso restrito</div>

        <h1 className="h1" style={{ marginTop: 6 }}>
          Configurações
        </h1>

        <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
          Gerencie a equipe, convites e permissões do workspace.
        </p>
      </div>

      {/* Stats do workspace */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>
          Workspace · resumo
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 20,
          }}
        >
          {[
            { label: "Clientes", value: totalClients ?? 0 },
            { label: "Cronogramas", value: totalCampaigns ?? 0 },
            { label: "Posts", value: totalPosts ?? 0 },
            { label: "Arquivos", value: totalFiles ?? 0 },
            { label: "Admins", value: adminsCount },
            { label: "Equipe", value: equipeCount },
          ].map((s) => (
            <div key={s.label}>
              <div className="muted tiny">{s.label}</div>

              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "var(--ink)",
                  marginTop: 4,
                  lineHeight: 1,
                }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Criar novo usuário interno */}
      <TeamInviteForm />

      {/* Membros da equipe */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 className="h2" style={{ fontSize: 18 }}>
              Equipe Tucan
            </h2>

            <p className="muted tiny" style={{ marginTop: 4 }}>
              Altere a permissão pelo dropdown, reenvie convites ou remova
              membros da equipe.
            </p>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg)",
            overflow: "hidden",
          }}
        >
          {!teamMembers || teamMembers.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--muted)",
                fontSize: 14,
              }}
            >
              Nenhum membro encontrado.
            </div>
          ) : (
            teamMembers.map((member, i) => (
              <TeamMemberRow
                key={member.id}
                member={member}
                isMe={member.id === me.id}
                isLast={i === teamMembers.length - 1}
              />
            ))
          )}
        </div>
      </div>

      {/* Zona de acesso — legenda de roles */}
      <div className="card" style={{ border: "1px solid var(--line)" }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          Acesso e permissões
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            {
              role: "admin",
              desc: "Acesso total: gerenciar equipe, configurações, clientes, cronogramas e posts.",
            },
            {
              role: "equipe",
              desc: "Acesso operacional: criar e editar cronogramas, posts, clientes e observações. Não acessa Configurações.",
            },
            {
              role: "cliente",
              desc: "Acesso apenas ao portal do cliente: ver cronogramas, aprovar e comentar posts.",
            },
          ].map((row) => {
            const colors = ROLE_COLOR[row.role] ?? DEFAULT_COLORS;

            return (
              <div
                key={row.role}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: colors.bg,
                    color: colors.fg,
                    flexShrink: 0,
                    marginTop: 1,
                    textTransform: "capitalize",
                  }}
                >
                  {row.role === "equipe"
                    ? "Equipe"
                    : row.role === "admin"
                      ? "Admin"
                      : "Cliente"}
                </span>

                <span
                  style={{
                    fontSize: 13,
                    color: "var(--ink-2)",
                    lineHeight: 1.5,
                  }}
                >
                  {row.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}