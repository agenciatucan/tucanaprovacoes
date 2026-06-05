-- Observações por tema (deixadas pelo cliente na página de aprovação)
ALTER TABLE planning_items
  ADD COLUMN IF NOT EXISTS client_note TEXT;

-- Vínculo do planejamento aprovado com o cronograma gerado
ALTER TABLE planning_schedules
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
