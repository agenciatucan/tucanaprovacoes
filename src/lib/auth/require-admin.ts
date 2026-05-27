import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * requireAdmin — to be used at the top of admin-only Server Components / Route Handlers.
 *
 * Returns the authenticated user's profile if the role is 'admin'.
 * Redirects to /login if not authenticated, or throws a 403-style redirect if
 * the authenticated user does not have the 'admin' role.
 */
export async function requireAdmin() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, name, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    // Staff (equipe) can access most admin pages, but not admin-only ones.
    // Redirect to a safe landing page instead of exposing a 403 error.
    redirect('/admin');
  }

  return profile;
}

/**
 * requireStaffOrAdmin — allows both 'admin' and 'equipe' roles.
 * Use this for pages that staff members are allowed to access.
 */
export async function requireStaffOrAdmin() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, name, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || !['admin', 'equipe'].includes(profile.role)) {
    redirect('/login');
  }

  return profile;
}
