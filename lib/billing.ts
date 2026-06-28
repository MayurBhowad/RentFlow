import { BillingCycle, Tenant } from '@/lib/types';

const BILLING_CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  yearly: 12,
  custom: 1,
};

export function toBillMonthInput(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function addMonthsToBillMonth(yearMonth: string, months: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 1 + months, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getNextBillMonth(tenant: Tenant, lastBillMonth?: string | null): string {
  const cycleMonths = BILLING_CYCLE_MONTHS[tenant.billing_cycle];

  if (lastBillMonth) {
    return addMonthsToBillMonth(toBillMonthInput(lastBillMonth), cycleMonths);
  }

  return toBillMonthInput(tenant.lease_start);
}
