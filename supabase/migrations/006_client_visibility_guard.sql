-- Segurança extra: impede que clientes leiam cronogramas em rascunho/arquivados via RLS.
-- Execute no Supabase SQL Editor depois de revisar nomes de policies existentes.

-- Opção segura: atualizar policies existentes pode depender do nome atual delas.
-- Por isso, este arquivo cria policies adicionais com nomes próprios.
-- Se já existir policy equivalente, o Supabase avisará duplicidade; nesse caso, revise as policies manualmente.

CREATE POLICY IF NOT EXISTS "Clients can read visible campaigns only"
ON public.campaigns
FOR SELECT
USING (
  status IN ('enviado_para_aprovacao', 'em_revisao', 'aprovado', 'em_producao', 'finalizado')
  AND EXISTS (
    SELECT 1
    FROM public.client_users cu
    JOIN public.user_profiles up ON up.id = cu.user_id
    WHERE cu.client_id = campaigns.client_id
      AND up.auth_user_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "Clients can read content from visible campaigns only"
ON public.content_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.campaigns c
    JOIN public.client_users cu ON cu.client_id = c.client_id
    JOIN public.user_profiles up ON up.id = cu.user_id
    WHERE c.id = content_items.campaign_id
      AND up.auth_user_id = auth.uid()
      AND c.status IN ('enviado_para_aprovacao', 'em_revisao', 'aprovado', 'em_producao', 'finalizado')
  )
);

CREATE POLICY IF NOT EXISTS "Clients can read visible files from visible campaigns only"
ON public.files
FOR SELECT
USING (
  visible_to_client = true
  AND EXISTS (
    SELECT 1
    FROM public.campaigns c
    JOIN public.client_users cu ON cu.client_id = c.client_id
    JOIN public.user_profiles up ON up.id = cu.user_id
    WHERE c.id = files.campaign_id
      AND up.auth_user_id = auth.uid()
      AND c.status IN ('enviado_para_aprovacao', 'em_revisao', 'aprovado', 'em_producao', 'finalizado')
  )
);
