-- 015 — Data de publicação planejada por post (visível só para equipe)
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS scheduled_date DATE NULL;

CREATE INDEX IF NOT EXISTS idx_content_items_scheduled_date
  ON content_items (scheduled_date)
  WHERE scheduled_date IS NOT NULL;
