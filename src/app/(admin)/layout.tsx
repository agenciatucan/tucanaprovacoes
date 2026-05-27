import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { TopBar } from '@/components/ui/TopBar';
import { getUnreadCount } from '@/actions/notifications';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles').select('id, name, role').eq('auth_user_id', user.id).single();

  if (!profile || !['admin', 'equipe'].includes(profile.role)) redirect('/cliente');

  const initials = profile.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const unreadCount = await getUnreadCount();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar variant="admin" initials={initials} name={profile.name} role={profile.role} unreadCount={unreadCount} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
