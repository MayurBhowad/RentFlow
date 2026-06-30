'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Plus, Search, IndianRupee, Calendar, FileText } from 'lucide-react';
import { Payment, MonthlyBill } from '@/lib/types';
import { getLinkedTenantIds, isOwnerOrManager } from '@/lib/scope';

function getDefaultPaymentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getInitialFormData(bills: MonthlyBill[] = []) {
  const firstBill = bills[0];
  return {
    monthly_bill_id: firstBill?.id ?? '',
    amount: firstBill ? String(firstBill.balance_due) : '',
    payment_date: getDefaultPaymentDate(),
    payment_method: 'upi' as 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other',
    transaction_id: '',
    notes: '',
  };
}

export default function PaymentsPage() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState(getInitialFormData);

  useEffect(() => {
    if (profile?.id) {
      fetchPayments();
      fetchBills();
    }
  }, [profile]);

  const fetchPayments = async () => {
    setLoading(true);
    let query = supabase
      .from('payments')
      .select('*, monthly_bill:monthly_bills!inner(bill_month, owner_id, tenant:tenants!inner(full_name, user_id))')
      .order('payment_date', { ascending: false })
      .limit(50);

    if (isOwnerOrManager(profile)) {
      query = query.eq('monthly_bill.owner_id', profile!.id);
    } else {
      const tenantIds = await getLinkedTenantIds(supabase, profile!.id);
      if (tenantIds.length === 0) {
        setPayments([]);
        setLoading(false);
        return;
      }
      query = query.in('monthly_bill.tenant_id', tenantIds);
    }

    const { data } = await query;
    setPayments(data || []);
    setLoading(false);
  };

  const fetchBills = async () => {
    if (!isOwnerOrManager(profile)) {
      setBills([]);
      return;
    }
    const { data } = await supabase
      .from('monthly_bills')
      .select('*, tenant:tenants(full_name)')
      .eq('owner_id', profile!.id)
      .in('status', ['pending', 'partially_paid', 'overdue'])
      .order('bill_month', { ascending: false });
    setBills(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('payments').insert({
      monthly_bill_id: formData.monthly_bill_id,
      amount: parseFloat(formData.amount),
      payment_date: formData.payment_date,
      payment_method: formData.payment_method,
      transaction_id: formData.transaction_id || null,
      notes: formData.notes || null,
    });

    if (!error) {
      // Update bill status and amounts
      const bill = bills.find((b) => b.id === formData.monthly_bill_id);
      if (bill) {
        const newPaid = bill.amount_paid + parseFloat(formData.amount);
        const newBalance = bill.total_amount - newPaid;
        const newStatus = newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : bill.status;

        await supabase
          .from('monthly_bills')
          .update({
            amount_paid: newPaid,
            balance_due: Math.max(0, newBalance),
            status: newStatus,
          })
          .eq('id', formData.monthly_bill_id);
      }

      setDialogOpen(false);
      setFormData(getInitialFormData(bills));
      fetchPayments();
      fetchBills();
    }
  };

  const handleBillChange = (billId: string) => {
    const bill = bills.find((b) => b.id === billId);
    setFormData({
      ...formData,
      monthly_bill_id: billId,
      amount: bill ? String(bill.balance_due) : '',
    });
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (open) {
      setFormData(getInitialFormData(bills));
    }
  };

  const isOwner = isOwnerOrManager(profile);

  const filtered = payments.filter((p) =>
    p.monthly_bill?.tenant?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.payment_method.toLowerCase().includes(search.toLowerCase())
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
        <h1 className="text-2xl font-bold">Payments</h1>
        {isOwner && (
          <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Bill</Label>
                  <Select value={formData.monthly_bill_id} onValueChange={handleBillChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bill" />
                    </SelectTrigger>
                    <SelectContent>
                      {bills.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.tenant?.full_name} - {new Date(b.bill_month).toLocaleString('default', { month: 'short', year: 'numeric' })} (Balance: {formatCurrency(b.balance_due)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Date</Label>
                    <Input type="date" value={formData.payment_date} onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={formData.payment_method} onValueChange={(v: any) => setFormData({ ...formData, payment_method: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Transaction ID</Label>
                    <Input value={formData.transaction_id} onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">Record Payment</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search payments..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-24 animate-pulse bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No payments found</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((payment) => (
            <Card key={payment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{payment.monthly_bill?.tenant?.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CreditCard className="h-4 w-4" />
                      {payment.payment_method.replace('_', ' ').toUpperCase()}
                      {payment.transaction_id && ` - ${payment.transaction_id}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(payment.amount)}</p>
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
