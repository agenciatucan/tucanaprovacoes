import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { TopBar } from '@/components/ui/TopBar';

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles').select('id, name, role').eq('auth_user_id', user.id).single();

  if (!profile) redirect('/login');
  if (['admin', 'equipe'].includes(profile.role)) redirect('/admin');

  const initials = profile.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar variant="client" initials={initials} name={profile.name} />
      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
