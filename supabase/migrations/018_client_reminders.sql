-- Tabela para registrar lembretes enviados ao cliente
create table if not exists client_reminders (
  id            uuid        primary key default gen_random_uuid(),
  campaign_id   uuid        not null references campaigns(id) on delete cascade,
  sent_by       uuid        not null references user_profiles(id),
  pending_count int         not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_client_reminders_campaign_id
  on client_reminders(campaign_id);

create index if not exists idx_client_reminders_created_at
  on client_reminders(campaign_id, created_at desc);

-- Apenas equipe/admin pode inserir e ler lembretes
alter table client_reminders enable row level security;

create policy "staff_manage_reminders"
  on client_reminders
  for all
  using (
    exists (
      select 1 from user_profiles
      where auth_user_id = auth.uid()
        and role in ('admin', 'equipe')
    )
  )
  with check (
    exists (
      select 1 from user_profiles
      where auth_user_id = auth.uid()
        and role in ('admin', 'equipe')
    )
  );
