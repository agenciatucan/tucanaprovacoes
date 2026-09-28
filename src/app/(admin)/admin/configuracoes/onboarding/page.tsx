import { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import OnboardingTemplateManager from '@/components/admin/OnboardingTemplateManager';

export const metadata: Metadata = { title: 'Checklist de onboarding' };

export default async function OnboardingTemplatePage() {
  await requireAdmin();
  const supabase = await getSupabaseServerClient();

  const [{ data: sections }, { data: items }] = await Promise.all([
    supabase.from('onboarding_sections').select('*').order('order_index'),
    supabase.from('onboarding_items').select('*').order('order_index'),
  ]);

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="crumb" style={{ marginBottom: 20 }}>
        <Link href="/admin/configuracoes">Configurações</Link>
        <span>/</span>
        Checklist de onboarding
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="eyebrow">Admin · acesso restrito</div>
        <h1 className="h1" style={{ marginTop: 6 }}>Checklist de onboarding</h1>
        <p className="muted" style={{ marginTop: 6, fontSize: 14, maxWidth: 640, lineHeight: 1.6 }}>
          Este é o checklist aplicado a todo cliente. Adicionar um item aqui o cria como pendente
          para todos os clientes existentes; remover um item apaga o progresso já marcado nele por
          qualquer cliente. As alterações valem para todo mundo, não apenas para clientes novos.
        </p>
      </div>

      <OnboardingTemplateManager initialSections={sections ?? []} initialItems={items ?? []} />
    </div>
  );
}
