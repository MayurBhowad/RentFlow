'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { MonthlyBill } from '@/lib/types';

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
    const { data } = await supabase
      .from('monthly_bills')
      .select('*, tenant:tenants(full_name)')
      .eq(profile?.role === 'owner' ? 'owner_id' : 'tenant_id', profile!.id)
      .order('due_date', { ascending: true });
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
              const hasOverdue = dayBills.some((b) => b.status === 'overdue');
              const hasPending = dayBills.some((b) => b.status === 'pending');
              const hasPaid = dayBills.some((b) => b.status === 'paid');

              return (
                <div
                  key={day}
                  className={`aspect-square border rounded-lg p-1 md:p-2 flex flex-col items-center justify-start relative hover:bg-muted/50 transition-colors ${
                    hasOverdue ? 'border-rose-200 bg-rose-50 dark:bg-rose-950/20' :
                    hasPending ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/20' :
                    hasPaid ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20' : ''
                  }`}
                >
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
                </div>
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
