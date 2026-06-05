'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { createClient, updateClient, uploadClientLogo } from '@/actions/clients';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

interface StaffUser { id: string; name: string; }

interface ClientFormProps {
  staffUsers: StaffUser[];
  initial?: {
    id: string;
    name: string;
    company_name: string;
    email: string;
    whatsapp?: string | null;
    internal_owner_id?: string | null;
    status: string;
    internal_notes?: string | null;
    logo_url?: string | null;
    requires_planning_approval?: boolean;
  };
}

export default function ClientForm({ staffUsers, initial }: ClientFormProps) {
  const router = useRouter();
  const isEdit = !!initial;
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(initial?.logo_url ?? null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initial?.logo_url ?? null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [requiresPlanningApproval, setRequiresPlanningApproval] = useState(
    initial?.requires_planning_approval ?? false
  );
  const [form, setForm] = useState({
    name:              initial?.name              ?? '',
    company_name:      initial?.company_name      ?? '',
    email:             initial?.email             ?? '',
    whatsapp:          initial?.whatsapp          ?? '',
    internal_owner_id: initial?.internal_owner_id ?? '',
    status:            initial?.status            ?? 'ativo',
    internal_notes:    initial?.internal_notes    ?? '',
  });

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleRemoveLogo() {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    let finalLogoUrl = logoUrl;

    if (logoFile) {
      const fd = new FormData();
      fd.append('file', logoFile);
      const uploadResult = await uploadClientLogo(fd);
      if (!uploadResult.success) {
        toast.error(uploadResult.error);
        setLoading(false);
        return;
      }
      finalLogoUrl = uploadResult.data.url;
      setLogoUrl(finalLogoUrl);
    }

    const payload = {
      name:                       form.name,
      company_name:               form.company_name,
      email:                      form.email,
      whatsapp:                   form.whatsapp || null,
      internal_owner_id:          form.internal_owner_id || null,
      status:                     form.status as 'ativo' | 'inativo',
      internal_notes:             form.internal_notes || null,
      logo_url:                   finalLogoUrl ?? null,
      requires_planning_approval: requiresPlanningApproval,
    };

    const result = isEdit
      ? await updateClient(initial!.id, payload)
      : await createClient(payload);

    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    toast.success(isEdit ? 'Cliente atualizado!' : 'Cliente criado com sucesso!');

    if (!isEdit && 'data' in result) {
      router.push(`/admin/clientes/${(result as { success: true; data: { id: string } }).data.id}` as Route);
    } else {
      router.push(`/admin/clientes/${initial!.id}` as Route);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Logo */}
      <div className="field">
        <label className="field-label">
          Logo do cliente <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 2 }}>
          <div
            style={{
              width: 64, height: 64, borderRadius: 14, flexShrink: 0,
              border: '1px solid var(--line)', background: 'var(--bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {logoPreview
              ? <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <Icon name="image" size={22} color="var(--muted-2)" />
            }
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="image" size={14} />
              {logoPreview ? 'Trocar logo' : 'Enviar logo'}
            </button>
            {logoPreview && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleRemoveLogo}
                style={{ color: '#b91c1c' }}
              >
                Remover
              </button>
            )}
          </div>
          <p className="muted tiny" style={{ margin: 0 }}>PNG, JPG ou SVG · máx. 5 MB</p>
        </div>
      </div>

      {/* Nome + Empresa */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div className="field">
          <label className="field-label" htmlFor="name">Nome do contato <span style={{ color: 'var(--orange)' }}>*</span></label>
          <input id="name" required className="input" placeholder="Ex.: Dr. João Silva" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="company_name">Empresa / Clínica <span style={{ color: 'var(--orange)' }}>*</span></label>
          <input id="company_name" required className="input" placeholder="Ex.: Clínica Urologia SP" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} />
        </div>
      </div>

      {/* Email + WhatsApp */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div className="field">
          <label className="field-label" htmlFor="email">E-mail do aprovador <span style={{ color: 'var(--orange)' }}>*</span></label>
          <input
            id="email" type="email" required className="input"
            placeholder="aprovador@empresa.com.br"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            disabled={isEdit}
          />
          {isEdit && <p className="muted tiny" style={{ marginTop: 4 }}>O e-mail não pode ser alterado após o cadastro.</p>}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="whatsapp">WhatsApp <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
          <input id="whatsapp" type="tel" className="input" placeholder="+55 11 99999-9999" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
        </div>
      </div>

      {/* Responsável + Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div className="field">
          <label className="field-label" htmlFor="internal_owner_id">Responsável interno <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
          <select id="internal_owner_id" className="input" value={form.internal_owner_id} onChange={(e) => set('internal_owner_id', e.target.value)} style={{ appearance: 'none', cursor: 'pointer' }}>
            <option value="">Sem responsável definido</option>
            {staffUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="status">Status <span style={{ color: 'var(--orange)' }}>*</span></label>
          <select id="status" required className="input" value={form.status} onChange={(e) => set('status', e.target.value)} style={{ appearance: 'none', cursor: 'pointer' }}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
      </div>

      {/* Fluxo de aprovação */}
      <div className="field">
        <label className="field-label">Fluxo de trabalho</label>
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderRadius: 10, border: '1px solid var(--line)',
            background: 'var(--bg)', cursor: 'pointer',
          }}
          onClick={() => setRequiresPlanningApproval((v) => !v)}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Aprovação de planejamento antes da produção</div>
            <div className="muted tiny" style={{ marginTop: 3 }}>
              O cliente aprova os temas do mês antes da equipe iniciar a produção
            </div>
          </div>
          <div
            style={{
              width: 42, height: 24, borderRadius: 12, flexShrink: 0, marginLeft: 16,
              background: requiresPlanningApproval ? 'var(--green)' : 'var(--line)',
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <div
              style={{
                position: 'absolute', top: 3, left: requiresPlanningApproval ? 21 : 3,
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Observações internas */}
      <div className="field">
        <label className="field-label" htmlFor="internal_notes">Observações internas <span className="muted" style={{ fontWeight: 400 }}>(não visível ao cliente)</span></label>
        <textarea
          id="internal_notes" rows={3} className="input"
          placeholder="Notas sobre o cliente, preferências, histórico de contato…"
          value={form.internal_notes}
          onChange={(e) => set('internal_notes', e.target.value)}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>Cancelar</button>
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Salvando…' : isEdit ? <><Icon name="check" size={16} /> Salvar alterações</> : <><Icon name="plus" size={16} /> Criar cliente</>}
        </button>
      </div>
    </form>
  );
}
