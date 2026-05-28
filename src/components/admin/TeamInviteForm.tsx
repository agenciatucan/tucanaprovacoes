"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteTeamMember } from "@/actions/team";
import { toast } from "sonner";

export default function TeamInviteForm() {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "equipe">("equipe");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const result = await inviteTeamMember({
        name,
        email,
        role,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Convite enviado com sucesso!");

      setName("");
      setEmail("");
      setRole("equipe");

      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card"
      style={{
        marginBottom: 28,
        border: "1px solid var(--line)",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div className="eyebrow">Novo usuário</div>

        <h2 className="h2" style={{ fontSize: 18, marginTop: 6 }}>
          Convidar membro da equipe
        </h2>

        <p className="muted tiny" style={{ marginTop: 4 }}>
          Crie acessos internos para admin ou equipe. O usuário receberá um link
          por e-mail para criar a senha.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          alignItems: "end",
        }}
      >
        <div className="field">
          <label className="field-label" htmlFor="team-name">
            Nome
          </label>

          <input
            id="team-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do usuário"
            required
            disabled={isPending}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="team-email">
            E-mail
          </label>

          <input
            id="team-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
            required
            disabled={isPending}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="team-role">
            Permissão
          </label>

          <select
            id="team-role"
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "equipe")}
            disabled={isPending}
            style={{
              appearance: "none",
              cursor: isPending ? "not-allowed" : "pointer",
            }}
          >
            <option value="equipe">Equipe</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isPending}
          style={{
            justifyContent: "center",
            minHeight: 42,
          }}
        >
          {isPending ? "Enviando…" : "+ Enviar convite"}
        </button>
      </div>
    </form>
  );
}