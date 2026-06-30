'use client';

import { useEffect, useState }  from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon } from 'lucide-react';
import OwnerGuard from '@/components/auth/OwnerGuard';

export default function AnalyticsPage() {
  const { profile } = useAuth();
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [propertyData, setPropertyData] = useState<any[]>([]);
  const [utilityData, setUtilityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) fetchAnalytics();
  }, [profile]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Monthly revenue data
      const { data: bills } = await supabase
        .from('monthly_bills')
        .select('bill_month, total_amount, amount_paid, rent_amount, total_utility_amount')
        .eq('owner_id', profile!.id)
        .order('bill_month', { ascending: true })
        .limit(24);

      const monthly = (bills || []).reduce((acc: any[], curr: any) => {
        const month = new Date(curr.bill_month).toLocaleString('default', { month: 'short', year: '2-digit' });
        const existing = acc.find((d) => d.month === month);
        if (existing) {
          existing.rent += Number(curr.rent_amount);
          existing.utilities += Number(curr.total_utility_amount);
          existing.collected += Number(curr.amount_paid);
          existing.expected += Number(curr.total_amount);
        } else {
          acc.push({
            month,
            rent: Number(curr.rent_amount),
            utilities: Number(curr.total_utility_amount),
            collected: Number(curr.amount_paid),
            expected: Number(curr.total_amount),
          });
        }
        return acc;
      }, []);
      setMonthlyData(monthly);

      // Property-wise revenue
      const { data: propBills } = await supabase
        .from('monthly_bills')
        .select('property_id, property:properties(name), total_amount, amount_paid')
        .eq('owner_id', profile!.id);

      const propData = (propBills || []).reduce((acc: any[], curr: any) => {
        const name = curr.property?.name || 'Unknown';
        const existing = acc.find((d) => d.name === name);
        if (existing) {
          existing.revenue += Number(curr.amount_paid);
          existing.expected += Number(curr.total_amount);
        } else {
          acc.push({
            name,
            revenue: Number(curr.amount_paid),
            expected: Number(curr.total_amount),
          });
        }
        return acc;
      }, []);
      setPropertyData(propData);

      // Utility breakdown
      const { data: utilityBills } = await supabase
        .from('utility_bills')
        .select('amount, utility_type:utility_types(name), monthly_bill:monthly_bills!inner(owner_id)')
        .eq('monthly_bill.owner_id', profile!.id);

      const utilData = (utilityBills || []).reduce((acc: any[], curr: any) => {
        const name = curr.utility_type?.name || 'Other';
        const existing = acc.find((d) => d.name === name);
        if (existing) {
          existing.value += Number(curr.amount);
        } else {
          acc.push({ name, value: Number(curr.amount) });
        }
        return acc;
      }, []);
      setUtilityData(utilData);
    } catch (error) {
      console.error('Analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  if (loading) {
    return (
      <OwnerGuard>
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
      </OwnerGuard>
    );
  }

  return (
    <OwnerGuard>
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Revenue Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="rent" fill="#6366f1" name="Rent" radius={[4, 4, 0, 0]} />
                <Bar dataKey="utilities" fill="#10b981" name="Utilities" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Collection Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line type="monotone" dataKey="expected" stroke="#6366f1" strokeWidth={2} name="Expected" />
                <Line type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2} name="Collected" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Property-wise Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={propertyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="#6366f1" name="Collected" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieIcon className="h-5 w-5" />
              Utility Cost Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={utilityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {utilityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {utilityData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-sm text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </OwnerGuard>
  );
}
