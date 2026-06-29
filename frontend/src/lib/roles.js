/** Admin du programme ambassadeur — même rôle que is_admin() côté Supabase. */
export function isAmbassadorProgramAdmin(profile) {
  return (profile?.role || '').toLowerCase() === 'admin';
}
