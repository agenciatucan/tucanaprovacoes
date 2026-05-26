"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { verifyApprovalToken } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

interface Props {
  token: string;
  campaignId: string;
}

export default function TokenAccessForm({ token, campaignId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;

    const result = await verifyApprovalToken(token, email);

    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    router.push(`/cliente/cronogramas/${campaignId}` as Route);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-[#1f1f1f]">
          Confirme seu e-mail para acessar
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#25411e] focus:border-transparent"
          placeholder="seu@email.com.br"
        />
      </div>
      <Button type="submit" loading={loading} className="w-full" size="lg">
        Acessar cronograma
      </Button>
    </form>
  );
}
