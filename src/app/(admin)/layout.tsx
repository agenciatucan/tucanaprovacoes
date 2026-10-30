import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth/current-user';
import { TopBar } from '@/components/ui/TopBar';
import { getUnreadCount } from '@/actions/notifications';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [profile, unreadCount] = await Promise.all([getCurrentProfile(), getUnreadCount()]);
  if (!profile) redirect('/login');
  if (!['admin', 'equipe'].includes(profile.role)) redirect('/cliente');

  const initials = profile.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar variant="admin" initials={initials} name={profile.name} role={profile.role} unreadCount={unreadCount} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
