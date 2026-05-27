import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { TopBar } from '@/components/ui/TopBar';
import { signOut } from '@/actions/auth';

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles').select('id, name, role').eq('auth_user_id', user.id).single();

  if (!profile) redirect('/login');
  if (['admin', 'equipe'].includes(profile.role)) redirect('/admin');

  // Verificar se o usuário tem pelo menos um cliente ativo vinculado
  const { data: activeLink } = await supabase
    .from('client_users')
    .select('client_id, clients!inner(status)')
    .eq('user_id', profile.id)
    .eq('clients.status', 'ativo')
    .limit(1)
    .maybeSingle();

  const initials = profile.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  // Conta inativa — mostrar tela de bloqueio em vez de redirecionar para login
  if (!activeLink) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopBar variant="client" initials={initials} name={profile.name} />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, background: '#fee2e2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 26,
            }}>
              🔒
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
              Conta inativa
            </h1>
            <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 24 }}>
              O acesso à sua conta foi desativado. Entre em contato com a equipe Tucan para mais informações.
            </p>
            <form action={signOut}>
              <button
                type="submit"
                style={{
                  height: 40, padding: '0 20px', borderRadius: 10,
                  background: 'var(--orange)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                }}>
                Sair da conta
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar variant="client" initials={initials} name={profile.name} />
      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
