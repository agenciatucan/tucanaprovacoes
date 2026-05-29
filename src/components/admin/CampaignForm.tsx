'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { createCampaign, updateCampaign } from '@/actions/campaigns';
import { Icon } from '@/components/ui/Icon';
import ArchiveCampaignButton from '@/components/admin/ArchiveCampaignButton';
import { toast } from 'sonner';

const TYPE_OPTIONS = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'campanha', label: 'Campanha' },
];

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

interface ClientOption {
  id: string;
  name: string | null;
  company_name: string | null;
}

interface Props {
  clients: ClientOption[];
  initial?: {
    id: string;
    client_id: string;
    name: string;
    type: string;
    status?: string | null;
    start_date: string | null;
    end_date: string | null;
    period_label: string;
    overview?: string | null;
  };
}

function parseIsoDate(value: string | null | undefined) {
  if (!value) return null;

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateBR(value: string | null | undefined) {
  const date = parseIsoDate(value);

  if (!date) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function createCalendarDays(currentMonth: Date) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();

  const days: Array<{
    date: Date;
    currentMonth: boolean;
  }> = [];

  for (let i = startDay - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, previousMonthDays - i),
      currentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      date: new Date(year, month, day),
      currentMonth: true,
    });
  }

  while (days.length % 7 !== 0) {
    const lastDate = days[days.length - 1]?.date ?? new Date(year, month, 1);

    days.push({
      date: new Date(
        lastDate.getFullYear(),
        lastDate.getMonth(),
        lastDate.getDate() + 1
      ),
      currentMonth: false,
    });
  }

  return days;
}

function DatePickerField({
  id,
  label,
  required,
  optionalLabel,
  value,
  onChange,
  disabled,
  placeholder = 'Selecione uma data',
}: {
  id: string;
  label: string;
  required?: boolean;
  optionalLabel?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const selectedDate = parseIsoDate(value);

  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    return selectedDate ?? new Date();
  });

  const calendarDays = useMemo(
    () => createCalendarDays(visibleMonth),
    [visibleMonth]
  );

  function goToPreviousMonth() {
    setVisibleMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  }

  function goToNextMonth() {
    setVisibleMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  }

  function handleSelectDate(date: Date) {
    onChange(toIsoDate(date));
    setVisibleMonth(date);
    setOpen(false);
  }

  function handleClear() {
    onChange('');
    setOpen(false);
  }

  function handleToday() {
    const today = new Date();

    onChange(toIsoDate(today));
    setVisibleMonth(today);
    setOpen(false);
  }

  return (
    <div className="field" style={{ position: 'relative' }}>
      <label className="field-label" htmlFor={id}>
        {label}{' '}
        {required ? (
          <span style={{ color: 'var(--orange)' }}>*</span>
        ) : optionalLabel ? (
          <span className="muted" style={{ fontWeight: 400 }}>
            {optionalLabel}
          </span>
        ) : null}
      </label>

      <button
        id={id}
        type="button"
        className="input"
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          color: value ? 'var(--ink)' : 'var(--muted)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? 'var(--bg-2)' : '#fff',
        }}
      >
        <span>{value ? formatDateBR(value) : placeholder}</span>
        <Icon name="calendar" size={15} color="var(--muted)" />
      </button>

      {open && !disabled && (
        <>
          <button
            type="button"
            aria-label="Fechar calendário"
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 30,
              background: 'transparent',
              border: 0,
              padding: 0,
              cursor: 'default',
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 312,
              zIndex: 40,
              background: '#fff',
              border: '1px solid var(--line)',
              borderRadius: 18,
              boxShadow: '0 24px 70px rgba(0, 0, 0, 0.16)',
              padding: 14,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <button
                type="button"
                onClick={goToPreviousMonth}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: '1px solid var(--line)',
                  background: '#fff',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                ‹
              </button>

              <div
                style={{
                  textAlign: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                  color: 'var(--ink)',
                  textTransform: 'capitalize',
                }}
              >
                {MONTHS[visibleMonth.getMonth()]} de{' '}
                {visibleMonth.getFullYear()}
              </div>

              <button
                type="button"
                onClick={goToNextMonth}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: '1px solid var(--line)',
                  background: '#fff',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                ›
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 4,
                marginBottom: 6,
              }}
            >
              {WEEK_DAYS.map((day, index) => (
                <div
                  key={`${day}-${index}`}
                  style={{
                    height: 28,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 11,
                    fontWeight: 800,
                    color: 'var(--muted)',
                  }}
                >
                  {day}
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 4,
              }}
            >
              {calendarDays.map((day) => {
                const selected =
                  selectedDate && isSameDay(day.date, selectedDate);

                const today = isSameDay(day.date, new Date());

                return (
                  <button
                    key={day.date.toISOString()}
                    type="button"
                    onClick={() => handleSelectDate(day.date)}
                    style={{
                      height: 34,
                      borderRadius: 10,
                      border: selected
                        ? '1px solid var(--green)'
                        : today
                          ? '1px solid var(--green-100)'
                          : '1px solid transparent',
                      background: selected
                        ? 'var(--green)'
                        : today
                          ? 'var(--green-50)'
                          : 'transparent',
                      color: selected
                        ? '#fff'
                        : day.currentMonth
                          ? 'var(--ink)'
                          : 'var(--muted)',
                      fontSize: 12,
                      fontWeight: selected || today ? 800 : 600,
                      cursor: 'pointer',
                    }}
                  >
                    {day.date.getDate()}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                paddingTop: 12,
                marginTop: 12,
                borderTop: '1px solid var(--line-soft)',
              }}
            >
              <button
                type="button"
                onClick={handleClear}
                style={{
                  border: 0,
                  background: 'transparent',
                  color: 'var(--muted)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Limpar
              </button>

              <button
                type="button"
                onClick={handleToday}
                style={{
                  border: 0,
                  background: 'transparent',
                  color: 'var(--green)',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Hoje
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function CampaignForm({ clients, initial }: Props) {
  const router = useRouter();

  const isEdit = Boolean(initial);
  const isArchived = initial?.status === 'arquivado';

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    client_id: initial?.client_id ?? clients[0]?.id ?? '',
    name: initial?.name ?? '',
    type: initial?.type ?? 'mensal',
    start_date: initial?.start_date ?? '',
    end_date: initial?.end_date ?? '',
    period_label: initial?.period_label ?? '',
    overview: initial?.overview ?? '',
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleCancel() {
    if (initial?.id) {
      router.push(`/admin/cronogramas/${initial.id}` as Route);
      return;
    }

    router.push('/admin/cronogramas' as Route);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isArchived) {
      toast.error('Este cronograma está arquivado e não pode ser editado.');
      return;
    }

    if (!form.start_date) {
      toast.error('Informe a data de início.');
      return;
    }

    setLoading(true);

    const payload = {
      client_id: form.client_id,
      name: form.name,
      type: form.type as 'mensal' | 'semanal' | 'quinzenal' | 'campanha',
      start_date: form.start_date,
      end_date: form.end_date || null,
      period_label: form.period_label,
      overview: form.overview || null,
    };

    if (initial?.id) {
      const result = await updateCampaign(initial.id, payload);

      if (!result.success) {
        toast.error(result.error);
        setLoading(false);
        return;
      }

      toast.success('Cronograma atualizado!');

      setLoading(false);

      router.push(`/admin/cronogramas/${initial.id}` as Route);
      router.refresh();

      return;
    }

    const result = await createCampaign(payload);

    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    toast.success('Cronograma criado!');

    setLoading(false);

    router.push(`/admin/cronogramas/${result.data.id}` as Route);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        padding: 28,
        borderRadius: 18,
      }}
    >
      {isArchived && (
        <div
          style={{
            borderRadius: 14,
            border: '1px solid #fde68a',
            background: '#fffbeb',
            padding: '12px 14px',
            fontSize: 13,
            color: '#92400e',
            lineHeight: 1.5,
          }}
        >
          <strong>Este cronograma está arquivado.</strong>
          <br />
          Ele não aparece para o cliente e não pode ser editado.
        </div>
      )}

      <div className="field">
        <label className="field-label" htmlFor="client_id">
          Cliente <span style={{ color: 'var(--orange)' }}>*</span>
        </label>

        <select
          id="client_id"
          required
          className="input"
          value={form.client_id}
          onChange={(e) => set('client_id', e.target.value)}
          disabled={loading || isArchived}
          style={{
            appearance: 'none',
            cursor: loading || isArchived ? 'not-allowed' : 'pointer',
          }}
        >
          <option value="">Selecione um cliente</option>

          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.company_name ?? client.name ?? 'Cliente sem nome'}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="name">
          Nome do cronograma <span style={{ color: 'var(--orange)' }}>*</span>
        </label>

        <input
          id="name"
          required
          className="input"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Ex.: Cronograma Junho"
          disabled={loading || isArchived}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <div className="field">
          <label className="field-label" htmlFor="type">
            Tipo <span style={{ color: 'var(--orange)' }}>*</span>
          </label>

          <select
            id="type"
            required
            className="input"
            value={form.type}
            onChange={(e) => set('type', e.target.value)}
            disabled={loading || isArchived}
            style={{
              appearance: 'none',
              cursor: loading || isArchived ? 'not-allowed' : 'pointer',
            }}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <DatePickerField
          id="start_date"
          label="Data de início"
          required
          value={form.start_date}
          onChange={(value) => set('start_date', value)}
          disabled={loading || isArchived}
          placeholder="Selecione a data de início"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <div className="field">
          <label className="field-label" htmlFor="period_label">
            Período textual <span style={{ color: 'var(--orange)' }}>*</span>
          </label>

          <input
            id="period_label"
            required
            className="input"
            value={form.period_label}
            onChange={(e) => set('period_label', e.target.value)}
            placeholder="Ex.: 4 semanas"
            disabled={loading || isArchived}
          />
        </div>

        <DatePickerField
          id="end_date"
          label="Data de encerramento"
          optionalLabel="(opcional)"
          value={form.end_date}
          onChange={(value) => set('end_date', value)}
          disabled={loading || isArchived}
          placeholder="Selecione a data de encerramento"
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="overview">
          Visão geral estratégica{' '}
          <span className="muted" style={{ fontWeight: 400 }}>
            (opcional)
          </span>
        </label>

        <textarea
          id="overview"
          rows={5}
          className="input"
          value={form.overview}
          onChange={(e) => set('overview', e.target.value)}
          placeholder="Descreva a estratégia, objetivo e observações gerais deste cronograma..."
          disabled={loading || isArchived}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingTop: 4,
          flexWrap: 'wrap',
        }}
      >
        {initial?.id && (
          <ArchiveCampaignButton
            campaignId={initial.id}
            disabled={loading || isArchived}
          />
        )}

        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={loading || isArchived}
          className="btn btn-primary"
        >
          {loading ? (
            'Salvando…'
          ) : (
            <>
              <Icon name="check" size={16} />
              {isEdit ? 'Salvar alterações' : 'Criar cronograma'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}