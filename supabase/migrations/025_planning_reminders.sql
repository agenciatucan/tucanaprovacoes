-- Permite registrar lembretes também para planejamentos de temas (não só cronogramas)
alter table client_reminders
  alter column campaign_id drop not null;

alter table client_reminders
  add column if not exists planning_id uuid references planning_schedules(id) on delete cascade;

alter table client_reminders
  add constraint client_reminders_target_check
  check (
    (campaign_id is not null and planning_id is null)
    or (campaign_id is null and planning_id is not null)
  );

create index if not exists idx_client_reminders_planning_id
  on client_reminders(planning_id);

create index if not exists idx_client_reminders_planning_created_at
  on client_reminders(planning_id, created_at desc);
