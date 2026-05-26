import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import TokenAccessForm from "@/components/auth/TokenAccessForm";

export const metadata: Metadata = { title: "Acesso ao cronograma" };

interface Props {
  params: Promise<{ token: string }>;
}

export default async function AcessoPage({ params }: Props) {
  const { token } = await params;

  // Validação básica do formato do token (64 chars hex)
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    notFound();
  }

  // Verificar se o token existe e está vigente (sem revelar dados sensíveis)
  const supabase = await getSupabaseServerClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, status, token_expires_at, clients(name, company_name)")
    .eq("approval_token", token)
    .gt("token_expires_at", new Date().toISOString())
    .single();

  if (!campaign || campaign.status === "arquivado") {
    notFound();
  }

  const client = Array.isArray(campaign.clients) ? campaign.clients[0] : campaign.clients;

  return (
    <main className="min-h-screen bg-[#f6f6f6] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#25411e]">
            <span className="text-white font-bold text-xl">T</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#1f1f1f]">{campaign.name}</h1>
            <p className="text-sm text-[#666666]">{client?.company_name ?? client?.name}</p>
          </div>
        </div>

        <TokenAccessForm token={token} campaignId={campaign.id} />
      </div>
    </main>
  );
}
