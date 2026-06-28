'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Search, IndianRupee, Calendar, User } from 'lucide-react';
import { MonthlyBill, Tenant, UtilityBill, UtilityType } from '@/lib/types';
import { getNextBillMonth } from '@/lib/billing';
import { ensureDefaultUtilityTypes, dedupeUtilityTypesByName } from '@/lib/utility-types';

export default function BillsPage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const tenantFilter = searchParams.get('tenant');

  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [utilityTypes, setUtilityTypes] = useState<UtilityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [formData, setFormData] = useState({
    tenant_id: '',
    bill_month: '',
    utilities: [] as { utility_type_id: string; amount: string; notes: string }[],
  });

  useEffect(() => {
    if (profile?.id) {
      fetchBills();
      fetchTenants();
      fetchUtilityTypes();
    }
  }, [profile]);

  const fetchBills = async () => {
    setLoading(true);
    let query = supabase
      .from('monthly_bills')
      .select('*, tenant:tenants(full_name, property:properties(name))')
      .order('bill_month', { ascending: false });

    if (profile?.role === 'owner' || profile?.role === 'manager') {
      query = query.eq('owner_id', profile.id);
    } else {
      query = query.eq('tenant_id', profile!.id);
    }

    if (tenantFilter) {
      query = query.eq('tenant_id', tenantFilter);
    }

    const { data } = await query;
    setBills(data || []);
    setLoading(false);
  };

  const fetchTenants = async () => {
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .eq('owner_id', profile!.id);
    setTenants(data || []);
  };

  const fetchUtilityTypes = async () => {
    await ensureDefaultUtilityTypes(supabase, profile!.id);
    const { data } = await supabase
      .from('utility_types')
      .select('*')
      .eq('owner_id', profile!.id)
      .eq('is_active', true)
      .order('name');
    setUtilityTypes(dedupeUtilityTypesByName(data || []));
  };

  const resetForm = () => {
    setFormData({ tenant_id: '', bill_month: '', utilities: [] });
  };

  const handleTenantChange = async (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) {
      setFormData({ tenant_id: tenantId, bill_month: '', utilities: [] });
      return;
    }

    setPrefilling(true);
    const { data: lastBill } = await supabase
      .from('monthly_bills')
      .select('bill_month, utility_bills(utility_type_id, amount, notes)')
      .eq('tenant_id', tenantId)
      .order('bill_month', { ascending: false })
      .limit(1)
      .maybeSingle();

    const utilityBills = (lastBill?.utility_bills || []) as Pick<
      UtilityBill,
      'utility_type_id' | 'amount' | 'notes'
    >[];

    setFormData({
      tenant_id: tenantId,
      bill_month: getNextBillMonth(tenant, lastBill?.bill_month),
      utilities: utilityBills.map((ub) => ({
        utility_type_id: ub.utility_type_id,
        amount: String(ub.amount),
        notes: ub.notes || '',
      })),
    });
    setPrefilling(false);
  };

  useEffect(() => {
    if (dialogOpen && tenantFilter && tenants.length > 0 && !formData.tenant_id) {
      handleTenantChange(tenantFilter);
    }
  }, [dialogOpen, tenantFilter, tenants]);

  const handleGenerateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);

    const utilitiesJson = formData.utilities
      .filter((u) => u.utility_type_id && u.amount)
      .map((u) => ({
        utility_type_id: u.utility_type_id,
        amount: parseFloat(u.amount),
        notes: u.notes || null,
      }));

    const { error } = await supabase.rpc('generate_monthly_bill', {
      p_tenant_id: formData.tenant_id,
      p_bill_month: formData.bill_month + '-01',
      p_utility_amounts: utilitiesJson,
    });

    setSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setDialogOpen(false);
    resetForm();
    fetchBills();
  };

  const addUtilityField = () => {
    setFormData({
      ...formData,
      utilities: [...formData.utilities, { utility_type_id: '', amount: '', notes: '' }],
    });
  };

  const updateUtility = (index: number, field: string, value: string) => {
    const updated = [...formData.utilities];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, utilities: updated });
  };

  const removeUtility = (index: number) => {
    const updated = formData.utilities.filter((_, i) => i !== index);
    setFormData({ ...formData, utilities: updated });
  };

  const isOwner = profile?.role === 'owner' || profile?.role === 'manager';

  const filtered = bills.filter((b) =>
    (b.tenant as any)?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.bill_month.includes(search)
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bills</h1>
        {isOwner && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSubmitError('');
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Generate Bill
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Generate Monthly Bill</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleGenerateBill} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tenant</Label>
                  <Select
                    value={formData.tenant_id}
                    onValueChange={handleTenantChange}
                    disabled={prefilling}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bill Month</Label>
                  <Input
                    type="month"
                    value={formData.bill_month}
                    onChange={(e) => setFormData({ ...formData, bill_month: e.target.value })}
                    required
                    disabled={prefilling}
                  />
                  {formData.tenant_id && formData.bill_month && (
                    <p className="text-xs text-muted-foreground">
                      Auto-filled from billing cycle. You can change it if needed.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Utilities</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addUtilityField} disabled={prefilling}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Utility
                    </Button>
                  </div>
                  {prefilling ? (
                    <p className="text-sm text-muted-foreground">Loading previous bill details...</p>
                  ) : formData.utilities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No utilities from the last bill. Add utilities below.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Pre-filled from last bill. Edit amounts, remove, or add more as needed.
                    </p>
                  )}
                  {formData.utilities.map((utility, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2 items-end">
                      <Select value={utility.utility_type_id || undefined} onValueChange={(v) => updateUtility(index, 'utility_type_id', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent className="z-[100]">
                          {utilityTypes.map((ut) => (
                            <SelectItem key={ut.id} value={ut.id}>{ut.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={utility.amount}
                        onChange={(e) => updateUtility(index, 'amount', e.target.value)}
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeUtility(index)} className="text-destructive">
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                {submitError && (
                  <p className="text-sm text-destructive">{submitError}</p>
                )}
                <Button type="submit" className="w-full" disabled={submitting || prefilling}>
                  {submitting ? 'Generating...' : 'Generate Bill'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search bills..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-32 animate-pulse bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No bills found</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((bill) => (
            <Card key={bill.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{(bill.tenant as any)?.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(bill.bill_month).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Rent: {formatCurrency(bill.rent_amount)} + Utilities: {formatCurrency(bill.total_utility_amount)}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <p className="text-2xl font-bold">{formatCurrency(bill.total_amount)}</p>
                    <div className="flex items-center gap-2 justify-end">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        bill.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                        bill.status === 'partially_paid' ? 'bg-amber-100 text-amber-700' :
                        bill.status === 'overdue' ? 'bg-rose-100 text-rose-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {bill.status.replace('_', ' ')}
                      </span>
                    </div>
                    {bill.balance_due > 0 && (
                      <p className="text-sm text-destructive">Balance: {formatCurrency(bill.balance_due)}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
