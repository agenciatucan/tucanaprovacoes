"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { archiveCampaign } from "@/actions/campaigns";
import { toast } from "sonner";

interface ArchiveCampaignButtonProps {
  campaignId: string;
  disabled?: boolean;
}

export default function ArchiveCampaignButton({
  campaignId,
  disabled = false,
}: ArchiveCampaignButtonProps) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleArchive() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      const result = await archiveCampaign(campaignId);

      if (!result.success) {
        toast.error(result.error);
        setConfirming(false);
        return;
      }

      toast.success("Cronograma arquivado com sucesso!");

      router.push("/admin/cronogramas" as Route);
      router.refresh();
    });
  }

  function handleCancelConfirm() {
    setConfirming(false);
  }

  if (confirming) {
    return (
      <div
        style={{
          marginRight: "auto",
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "#92400e",
            fontWeight: 600,
          }}
        >
          Tem certeza?
        </span>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleCancelConfirm}
          disabled={isPending}
          style={{
            fontSize: 12,
            height: 38,
          }}
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={handleArchive}
          disabled={isPending}
          style={{
            height: 38,
            borderRadius: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            padding: "0 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: isPending ? "not-allowed" : "pointer",
          }}
        >
          {isPending ? "Arquivando…" : "Sim, arquivar"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleArchive}
      disabled={disabled || isPending}
      style={{
        marginRight: "auto",
        height: 38,
        borderRadius: 12,
        border: "1px solid #fecaca",
        background: "#fff",
        color: "#b91c1c",
        padding: "0 14px",
        fontSize: 12,
        fontWeight: 700,
        cursor: disabled || isPending ? "not-allowed" : "pointer",
      }}
    >
      Arquivar cronograma
    </button>
  );
}