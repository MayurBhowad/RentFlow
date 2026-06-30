'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Users,
  IndianRupee,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Link from 'next/link';
import { MonthlyBill, Tenant } from '@/lib/types';
import { getLinkedTenantIds, isOwnerOrManager } from '@/lib/scope';
import { formatLeaseEndDate } from '@/lib/lease';

interface DashboardStats {
  total_properties: number;
  active_tenants: number;
  current_month_revenue: number;
  pending_payments: number;
  overdue_amount: number;
  collection_rate: number;
}

export default function DashboardPage() {
  const { profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBills, setRecentBills] = useState<MonthlyBill[]>([]);
  const [overdueTenants, setOverdueTenants] = useState<Tenant[]>([]);
  const [expiringLeases, setExpiringLeases] = useState<Tenant[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwner = isOwnerOrManager(profile);

  useEffect(() => {
    if (authLoading) return;
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    fetchDashboardData();
  }, [profile, authLoading]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (isOwner) {
        await supabase.rpc('process_expired_leases', { p_owner_id: profile!.id });

        const { data: statsData } = await supabase
          .rpc('get_owner_dashboard_stats', { p_owner_id: profile!.id });
        if (statsData?.[0]) setStats(statsData[0]);

        const { data: bills } = await supabase
          .from('monthly_bills')
          .select('*, tenant:tenants(full_name, property:properties(name))')
          .eq('owner_id', profile!.id)
          .order('created_at', { ascending: false })
          .limit(5);
        setRecentBills(bills || []);

        const { data: overdue } = await supabase
          .from('monthly_bills')
          .select('tenant_id, tenant:tenants!inner(*)')
          .eq('owner_id', profile!.id)
          .eq('status', 'overdue')
          .limit(5);
        const uniqueTenants = Array.from(new Map((overdue || []).map((o: any) => [o.tenant.id, o.tenant])).values());
        setOverdueTenants(uniqueTenants as Tenant[]);

        const today = new Date().toISOString().slice(0, 10);
        const in30Days = new Date();
        in30Days.setDate(in30Days.getDate() + 30);
        const limit = in30Days.toISOString().slice(0, 10);

        const { data: expiring } = await supabase
          .from('tenants')
          .select('*, property:properties(name)')
          .eq('owner_id', profile!.id)
          .in('status', ['active', 'notice_given'])
          .not('lease_end', 'is', null)
          .gte('lease_end', today)
          .lte('lease_end', limit)
          .order('lease_end', { ascending: true })
          .limit(10);
        setExpiringLeases(expiring || []);

        const { data: monthlyData } = await supabase
          .from('monthly_bills')
          .select('bill_month, total_amount, amount_paid')
          .eq('owner_id', profile!.id)
          .order('bill_month', { ascending: true })
          .limit(12);
        
        const chartData = (monthlyData || []).reduce((acc: any[], curr: any) => {
          const month = new Date(curr.bill_month).toLocaleString('default', { month: 'short' });
          const existing = acc.find((d) => d.month === month);
          if (existing) {
            existing.revenue += Number(curr.amount_paid);
            existing.expected += Number(curr.total_amount);
          } else {
            acc.push({
              month,
              revenue: Number(curr.amount_paid),
              expected: Number(curr.total_amount),
            });
          }
          return acc;
        }, []);
        setRevenueData(chartData);
      } else {
        const { data: statsData } = await supabase
          .rpc('get_tenant_dashboard_stats', { p_user_id: profile!.id });
        if (statsData?.[0]) {
          setStats({
            total_properties: 1,
            active_tenants: 1,
            current_month_revenue: statsData[0].current_rent_due,
            pending_payments: statsData[0].current_rent_due,
            overdue_amount: 0,
            collection_rate: statsData[0].amount_paid_this_year,
          });
        }

        const tenantIds = await getLinkedTenantIds(supabase, profile!.id);
        if (tenantIds.length === 0) {
          setRecentBills([]);
        } else {
          const { data: bills } = await supabase
            .from('monthly_bills')
            .select('*, tenant:tenants(full_name), property:properties(name)')
            .in('tenant_id', tenantIds)
            .order('bill_month', { ascending: false })
            .limit(5);
          setRecentBills(bills || []);
        }
      }
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

  if (loading || authLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium">Could not load your profile</p>
        <p className="text-sm text-muted-foreground mt-2">
          Try signing out and back in. If the problem persists, contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isOwner ? (
          <>
            <StatCard
              title="Total Properties"
              value={stats?.total_properties || 0}
              icon={Building2}
              trend="up"
              trendValue="Active"
              color="bg-blue-500"
            />
            <StatCard
              title="Active Tenants"
              value={stats?.active_tenants || 0}
              icon={Users}
              trend="up"
              trendValue="Occupied"
              color="bg-emerald-500"
            />
            <StatCard
              title="Current Month Revenue"
              value={formatCurrency(stats?.current_month_revenue || 0)}
              icon={IndianRupee}
              trend="up"
              trendValue={`${stats?.collection_rate || 0}% collected`}
              color="bg-indigo-500"
            />
            <StatCard
              title="Pending Payments"
              value={formatCurrency(stats?.pending_payments || 0)}
              icon={AlertTriangle}
              trend="down"
              trendValue="Outstanding"
              color="bg-amber-500"
            />
            <StatCard
              title="Overdue Amount"
              value={formatCurrency(stats?.overdue_amount || 0)}
              icon={AlertTriangle}
              trend="down"
              trendValue="Critical"
              color="bg-rose-500"
            />
            <StatCard
              title="Collection Rate"
              value={`${stats?.collection_rate || 0}%`}
              icon={TrendingUp}
              trend="up"
              trendValue="This month"
              color="bg-cyan-500"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Current Rent Due"
              value={formatCurrency(stats?.current_month_revenue || 0)}
              icon={IndianRupee}
              trend="down"
              trendValue="Pending"
              color="bg-amber-500"
            />
            <StatCard
              title="Total Utility Charges"
              value={formatCurrency(stats?.pending_payments || 0)}
              icon={IndianRupee}
              trend="up"
              trendValue="This month"
              color="bg-blue-500"
            />
            <StatCard
              title="Amount Paid This Year"
              value={formatCurrency(stats?.collection_rate || 0)}
              icon={TrendingUp}
              trend="up"
              trendValue="YTD"
              color="bg-emerald-500"
            />
          </>
        )}
      </div>

      {isOwner && revenueData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.2}
                    name="Collected"
                  />
                  <Area
                    type="monotone"
                    dataKey="expected"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.1}
                    name="Expected"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Paid', value: stats?.current_month_revenue || 0 },
                      { name: 'Pending', value: stats?.pending_payments || 0 },
                      { name: 'Overdue', value: stats?.overdue_amount || 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {[
                      { name: 'Paid', value: stats?.current_month_revenue || 0 },
                      { name: 'Pending', value: stats?.pending_payments || 0 },
                      { name: 'Overdue', value: stats?.overdue_amount || 0 },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4">
                {['Paid', 'Pending', 'Overdue'].map((label, i) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-sm text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tenant</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Property</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Month</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBills.map((bill) => (
                  <tr key={bill.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">{(bill.tenant as any)?.full_name || 'N/A'}</td>
                    <td className="py-3 px-4">{(bill.property as any)?.name || 'N/A'}</td>
                    <td className="py-3 px-4">
                      {new Date(bill.bill_month).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(bill.total_amount)}</td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={bill.status} />
                    </td>
                  </tr>
                ))}
                {recentBills.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No bills found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {isOwner && expiringLeases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Leases Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiringLeases.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50"
                >
                  <div>
                    <p className="font-medium">{tenant.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(tenant.property as { name?: string })?.name} · Ends {formatLeaseEndDate(tenant.lease_end)}
                    </p>
                  </div>
                  <Link href="/dashboard/tenants">
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isOwner && overdueTenants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Overdue Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdueTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                >
                  <div>
                    <p className="font-medium">{tenant.full_name}</p>
                    <p className="text-sm text-muted-foreground">{tenant.phone}</p>
                  </div>
                  <Link href={`/dashboard/bills?tenant=${tenant.id}`}>
                    <Button variant="outline" size="sm">
                      View Bills
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color,
}: {
  title: string;
  value: string | number;
  icon: any;
  trend: 'up' | 'down';
  trendValue: string;
  color: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <div className="flex items-center gap-1 text-xs">
              {trend === 'up' ? (
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-rose-500" />
              )}
              <span className="text-muted-foreground">{trendValue}</span>
            </div>
          </div>
          <div className={`${color} p-3 rounded-xl text-white`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    partially_paid: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  };

  const labels: Record<string, string> = {
    paid: 'Paid',
    partially_paid: 'Partial',
    pending: 'Pending',
    overdue: 'Overdue',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || ''}`}>
      {labels[status] || status}
    </span>
  );
}
