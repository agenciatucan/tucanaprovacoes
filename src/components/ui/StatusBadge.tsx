// Status badge — exact vocabulary from design (seção 10 do MVP)
export type StatusKind = 'rascunho' | 'aguardando' | 'revisao' | 'aprovado' | 'agendado' | 'publicado';

const LABELS: Record<StatusKind, string> = {
  rascunho:   'Rascunho',
  aguardando: 'Aguardando aprovação',
  revisao:    'Em revisão',
  aprovado:   'Aprovado',
  agendado:   'Agendado',
  publicado:  'Publicado',
};

interface Props {
  kind: StatusKind;
  size?: 'sm' | 'lg';
  label?: string;
}

export function StatusBadge({ kind, size, label }: Props) {
  return (
    <span className={`status status-${kind}${size === 'lg' ? ' status-lg' : ''}`}>
      {label ?? LABELS[kind]}
    </span>
  );
}
