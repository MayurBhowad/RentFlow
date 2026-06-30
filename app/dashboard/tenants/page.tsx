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
import { Users, Plus, Search, Phone, Mail, IndianRupee, Calendar, Pencil, LogOut, RefreshCw } from 'lucide-react';
import { Tenant, Property } from '@/lib/types';
import OwnerGuard from '@/components/auth/OwnerGuard';
import {
  formatLeaseEndDate,
  getLeaseExpiryBadgeClass,
  getLeaseExpiryLabel,
  getLeaseExpiryStatus,
} from '@/lib/lease';

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
  emergency_contact: '',
  property_id: '',
  rent_amount: '',
  billing_cycle: 'monthly',
  due_day: 5,
  lease_start: '',
  lease_end: '',
  security_deposit: '',
  status: 'active' as Tenant['status'],
  notes: '',
};

function tenantToForm(tenant: Tenant) {
  return {
    full_name: tenant.full_name,
    email: tenant.email || '',
    phone: tenant.phone,
    emergency_contact: tenant.emergency_contact || '',
    property_id: tenant.property_id,
    rent_amount: String(tenant.rent_amount),
    billing_cycle: tenant.billing_cycle,
    due_day: tenant.due_day,
    lease_start: tenant.lease_start,
    lease_end: tenant.lease_end || '',
    security_deposit: String(tenant.security_deposit),
    status: tenant.status,
    notes: tenant.notes || '',
  };
}

export default function TenantsPage() {
  const { profile } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [renewDate, setRenewDate] = useState('');

  useEffect(() => {
    if (profile?.id) {
      fetchTenants();
      fetchProperties();
    }
  }, [profile]);

  const fetchTenants = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tenants')
      .select('*, property:properties(name)')
      .eq('owner_id', profile!.id)
      .order('created_at', { ascending: false });
    setTenants(data || []);
    setLoading(false);
  };

  const fetchProperties = async () => {
    const { data } = await supabase
      .from('properties')
      .select('*')
      .eq('owner_id', profile!.id);
    setProperties(data || []);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('tenants').insert({
      ...formData,
      owner_id: profile!.id,
      rent_amount: parseFloat(formData.rent_amount),
      security_deposit: parseFloat(formData.security_deposit) || 0,
      lease_end: formData.lease_end || null,
      email: formData.email || null,
      emergency_contact: formData.emergency_contact || null,
      notes: formData.notes || null,
    });
    if (!error) {
      setAddDialogOpen(false);
      setFormData(emptyForm);
      fetchTenants();
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    const { error } = await supabase
      .from('tenants')
      .update({
        full_name: formData.full_name,
        email: formData.email || null,
        phone: formData.phone,
        emergency_contact: formData.emergency_contact || null,
        property_id: formData.property_id,
        rent_amount: parseFloat(formData.rent_amount),
        billing_cycle: formData.billing_cycle,
        due_day: formData.due_day,
        lease_start: formData.lease_start,
        lease_end: formData.lease_end || null,
        security_deposit: parseFloat(formData.security_deposit) || 0,
        status: formData.status,
        notes: formData.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingTenant.id);

    if (!error) {
      setEditDialogOpen(false);
      setEditingTenant(null);
      setFormData(emptyForm);
      fetchTenants();
    }
  };

  const openEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData(tenantToForm(tenant));
    setRenewDate('');
    setEditDialogOpen(true);
  };

  const endLease = async (revokePortal: boolean) => {
    if (!editingTenant) return;
    const { error } = await supabase
      .from('tenants')
      .update({
        status: 'inactive',
        user_id: revokePortal ? null : editingTenant.user_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingTenant.id);

    if (!error) {
      setEditDialogOpen(false);
      setEditingTenant(null);
      fetchTenants();
    }
  };

  const renewLease = async () => {
    if (!editingTenant || !renewDate) return;
    const { error } = await supabase
      .from('tenants')
      .update({
        lease_end: renewDate,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingTenant.id);

    if (!error) {
      setFormData({ ...formData, lease_end: renewDate, status: 'active' });
      setRenewDate('');
      fetchTenants();
    }
  };

  const filtered = tenants.filter((t) =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.phone.includes(search) ||
    (t.email && t.email.toLowerCase().includes(search.toLowerCase()))
  );

  const TenantFormFields = ({ isEdit }: { isEdit?: boolean }) => (
    <>
      <div className="space-y-2">
        <Label>Full Name</Label>
        <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Emergency Contact</Label>
        <Input value={formData.emergency_contact} onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Property</Label>
        <Select value={formData.property_id} onValueChange={(v) => setFormData({ ...formData, property_id: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select property" />
          </SelectTrigger>
          <SelectContent>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Rent Amount (INR)</Label>
          <Input type="number" value={formData.rent_amount} onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Billing Cycle</Label>
          <Select value={formData.billing_cycle} onValueChange={(v) => setFormData({ ...formData, billing_cycle: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="half_yearly">Half-Yearly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Due Day</Label>
          <Input type="number" min={1} max={31} value={formData.due_day} onChange={(e) => setFormData({ ...formData, due_day: parseInt(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label>Security Deposit</Label>
          <Input type="number" value={formData.security_deposit} onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Lease Start</Label>
          <Input type="date" value={formData.lease_start} onChange={(e) => setFormData({ ...formData, lease_start: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Lease End</Label>
          <Input type="date" value={formData.lease_end} onChange={(e) => setFormData({ ...formData, lease_end: e.target.value })} />
        </div>
      </div>
      {isEdit && (
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as Tenant['status'] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="notice_given">Notice Given</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="evicted">Evicted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label>Notes</Label>
        <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
      </div>
    </>
  );

  return (
    <OwnerGuard>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Tenant</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <TenantFormFields />
              <Button type="submit" className="w-full">Save Tenant</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tenants..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-48 animate-pulse bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No tenants found</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tenant) => {
            const leaseStatus = getLeaseExpiryStatus(tenant.lease_end);
            return (
              <Card key={tenant.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{tenant.full_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{(tenant.property as { name?: string })?.name}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(tenant)} aria-label="Edit tenant">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {tenant.phone}
                  </div>
                  {tenant.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {tenant.email}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IndianRupee className="h-4 w-4" />
                    {tenant.rent_amount.toLocaleString('en-IN')} / {tenant.billing_cycle}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Lease ends: {formatLeaseEndDate(tenant.lease_end)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tenant.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      tenant.status === 'notice_given' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {tenant.status.replace('_', ' ')}
                    </span>
                    {tenant.lease_end && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLeaseExpiryBadgeClass(leaseStatus)}`}>
                        {getLeaseExpiryLabel(leaseStatus)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          setEditingTenant(null);
          setRenewDate('');
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant — {editingTenant?.full_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <TenantFormFields isEdit />

            {editingTenant && (
              <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
                <p className="text-sm font-medium">Lease actions</p>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={renewDate}
                    onChange={(e) => setRenewDate(e.target.value)}
                    placeholder="New lease end"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={renewLease} disabled={!renewDate}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Renew
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => endLease(true)}
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    End lease & revoke portal
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => endLease(false)}
                  >
                    End lease only
                  </Button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </OwnerGuard>
  );
}
