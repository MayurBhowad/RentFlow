'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { MonthlyBill, UtilityBill } from '@/lib/types';
import { getLinkedTenantIds, isOwnerOrManager } from '@/lib/scope';

const statusStyles: Record<MonthlyBill['status'], string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  partially_paid: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  pending: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
};

function BillBreakdown({
  bill,
  formatCurrency,
}: {
  bill: MonthlyBill;
  formatCurrency: (amount: number) => string;
}) {
  const utilities = (bill.utility_bills ?? []) as (UtilityBill & {
    utility_type?: { name?: string };
  })[];

  return (
    <div className="rounded-md bg-muted/30 px-2.5 py-2 space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Rent</span>
        <span>{formatCurrency(bill.rent_amount)}</span>
      </div>
      {utilities.map((ub) => (
        <div key={ub.id} className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground truncate pr-2">
            {ub.utility_type?.name ?? 'Utility'}
          </span>
          <span className="shrink-0">{formatCurrency(ub.amount)}</span>
        </div>
      ))}
      {utilities.length === 0 && bill.total_utility_amount > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Utilities</span>
          <span>{formatCurrency(bill.total_utility_amount)}</span>
        </div>
      )}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
        <span className="font-medium">Total</span>
        <span className="font-semibold">{formatCurrency(bill.total_amount)}</span>
      </div>
      {bill.balance_due > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Balance due</span>
          <span className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(bill.balance_due)}</span>
        </div>
      )}
      {bill.amount_paid > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Paid</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(bill.amount_paid)}</span>
        </div>
      )}
    </div>
  );
}

function CalendarDayCell({
  day,
  dayBills,
  dateLabel,
  formatCurrency,
}: {
  day: number;
  dayBills: MonthlyBill[];
  dateLabel: string;
  formatCurrency: (amount: number) => string;
}) {
  const hasOverdue = dayBills.some((b) => b.status === 'overdue');
  const hasPending = dayBills.some((b) => b.status === 'pending' || b.status === 'partially_paid');
  const hasPaid = dayBills.some((b) => b.status === 'paid');
  const totalDue = dayBills.reduce((sum, b) => sum + b.balance_due, 0);

  const cellClassName = `aspect-square border rounded-lg p-1 md:p-2 flex flex-col items-center justify-start relative transition-colors ${
    dayBills.length > 0 ? 'cursor-pointer hover:ring-2 hover:ring-primary/20' : 'hover:bg-muted/50'
  } ${
    hasOverdue ? 'border-rose-200 bg-rose-50 dark:bg-rose-950/20' :
    hasPending ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/20' :
    hasPaid ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20' : ''
  }`;

  const cellContent = (
    <>
      <span className="text-sm font-medium">{day}</span>
      <div className="flex gap-0.5 mt-1">
        {hasOverdue && <AlertTriangle className="h-3 w-3 text-rose-500" />}
        {hasPending && <Clock className="h-3 w-3 text-amber-500" />}
        {hasPaid && <CheckCircle className="h-3 w-3 text-emerald-500" />}
      </div>
      {dayBills.length > 0 && (
        <span className="text-[10px] text-muted-foreground mt-auto hidden md:block">
          {dayBills.length} bill{dayBills.length > 1 ? 's' : ''}
        </span>
      )}
    </>
  );

  if (dayBills.length === 0) {
    return <div className={cellClassName}>{cellContent}</div>;
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button type="button" className={`${cellClassName} w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-primary`}>
          {cellContent}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-0 overflow-hidden" side="top" align="center">
        <div className="px-4 py-3 border-b bg-muted/40">
          <p className="font-semibold text-sm">{dateLabel}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {dayBills.length} bill{dayBills.length > 1 ? 's' : ''} due
            {totalDue > 0 && ` · ${formatCurrency(totalDue)} outstanding`}
          </p>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y">
          {dayBills.map((bill) => (
            <div key={bill.id} className="px-4 py-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm leading-tight">
                  {(bill.tenant as { full_name?: string } | undefined)?.full_name ?? 'Unknown tenant'}
                </p>
                <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${statusStyles[bill.status]}`}>
                  {bill.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(bill.bill_month).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </p>
              <BillBreakdown bill={bill} formatCurrency={formatCurrency} />
            </div>
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export default function CalendarPage() {
  const { profile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) fetchBills();
  }, [profile]);

  const fetchBills = async () => {
    setLoading(true);
    let query = supabase
      .from('monthly_bills')
      .select('*, tenant:tenants(full_name), utility_bills(id, amount, utility_type:utility_types(name))')
      .order('due_date', { ascending: true });

    if (isOwnerOrManager(profile)) {
      query = query.eq('owner_id', profile!.id);
    } else {
      const tenantIds = await getLinkedTenantIds(supabase, profile!.id);
      if (tenantIds.length === 0) {
        setBills([]);
        setLoading(false);
        return;
      }
      query = query.in('tenant_id', tenantIds);
    }

    const { data } = await query;
    setBills(data || []);
    setLoading(false);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getBillsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bills.filter((b) => b.due_date === dateStr);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-medium min-w-[140px] text-center">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayBills = getBillsForDay(day);
              const dateLabel = new Date(year, month, day).toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              });

              return (
                <CalendarDayCell
                  key={day}
                  day={day}
                  dayBills={dayBills}
                  dateLabel={dateLabel}
                  formatCurrency={formatCurrency}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Dues */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Upcoming Dues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bills
              .filter((b) => b.status !== 'paid')
              .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
              .slice(0, 10)
              .map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{(bill.tenant as any)?.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(bill.due_date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(bill.balance_due)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      bill.status === 'overdue' ? 'bg-rose-100 text-rose-700' :
                      bill.status === 'partially_paid' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {bill.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            {bills.filter((b) => b.status !== 'paid').length === 0 && (
              <p className="text-center text-muted-foreground py-8">No upcoming dues</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
