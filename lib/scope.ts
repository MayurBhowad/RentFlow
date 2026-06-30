import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types';

export function isOwnerOrManager(profile: Pick<Profile, 'role'> | null | undefined): boolean {
  return profile?.role === 'owner' || profile?.role === 'manager';
}

export async function getLinkedTenantIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('user_id', userId);

  return (data ?? []).map((row) => row.id);
}
