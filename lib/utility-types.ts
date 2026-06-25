import { SupabaseClient } from '@supabase/supabase-js';
import { UtilityType } from '@/lib/types';

export const DEFAULT_UTILITY_TYPES = [
  { name: 'Electricity', charge_type: 'variable' as const, description: 'Electricity bill' },
  { name: 'Water', charge_type: 'variable' as const, description: 'Water bill' },
  { name: 'Gas', charge_type: 'variable' as const, description: 'Gas bill' },
  { name: 'Internet', charge_type: 'fixed' as const, description: 'Internet / WiFi' },
  { name: 'Maintenance', charge_type: 'fixed' as const, description: 'Maintenance charges' },
];

export function dedupeUtilityTypesByName(types: UtilityType[]): UtilityType[] {
  const byName = new Map<string, UtilityType>();
  for (const ut of types) {
    if (!byName.has(ut.name)) {
      byName.set(ut.name, ut);
    }
  }
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function ensureDefaultUtilityTypes(supabase: SupabaseClient, ownerId: string) {
  const { data: existing } = await supabase
    .from('utility_types')
    .select('name')
    .eq('owner_id', ownerId);

  const existingNames = new Set((existing || []).map((ut) => ut.name));
  const toInsert = DEFAULT_UTILITY_TYPES.filter((ut) => !existingNames.has(ut.name));

  if (toInsert.length === 0) return;

  await supabase.from('utility_types').insert(
    toInsert.map((ut) => ({ ...ut, owner_id: ownerId }))
  );
}
