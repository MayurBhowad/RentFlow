import { Tenant } from '@/lib/types';

export const BILLABLE_STATUSES: Tenant['status'][] = ['active', 'notice_given'];

export type LeaseExpiryStatus = 'no_end' | 'active' | 'expiring_soon' | 'expired';

export function getLeaseExpiryStatus(
  leaseEnd: string | null,
  warnDays = 30
): LeaseExpiryStatus {
  if (!leaseEnd) return 'no_end';

  const end = new Date(`${leaseEnd}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (end < today) return 'expired';

  const warnDate = new Date(today);
  warnDate.setDate(warnDate.getDate() + warnDays);
  if (end <= warnDate) return 'expiring_soon';

  return 'active';
}

export function isTenantBillable(tenant: Pick<Tenant, 'status' | 'lease_end'>): boolean {
  if (!BILLABLE_STATUSES.includes(tenant.status)) return false;
  if (tenant.lease_end && getLeaseExpiryStatus(tenant.lease_end) === 'expired') return false;
  return true;
}

export function isBillMonthWithinLease(leaseEnd: string | null, billMonth: string): boolean {
  if (!leaseEnd) return true;
  return billMonth.slice(0, 7) <= leaseEnd.slice(0, 7);
}

export function formatLeaseEndDate(leaseEnd: string | null): string {
  if (!leaseEnd) return 'Open-ended';
  return new Date(`${leaseEnd}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getLeaseExpiryBadgeClass(status: LeaseExpiryStatus): string {
  switch (status) {
    case 'expired':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400';
    case 'expiring_soon':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400';
    case 'active':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
  }
}

export function getLeaseExpiryLabel(status: LeaseExpiryStatus): string {
  switch (status) {
    case 'expired':
      return 'Lease ended';
    case 'expiring_soon':
      return 'Expiring soon';
    case 'active':
      return 'Lease active';
    default:
      return 'No end date';
  }
}

export function isLeaseExpiringWithinDays(leaseEnd: string | null, days: number): boolean {
  if (!leaseEnd) return false;
  const end = new Date(`${leaseEnd}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);
  return end >= today && end <= limit;
}
