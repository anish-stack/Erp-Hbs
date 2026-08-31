'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/shared/page-header';
import { AsyncSelect } from '@/components/shared/async-select';
import { LineItemsEditor } from '@/components/shared/line-items-editor';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { salesApi, customersApi } from '@/lib/api/services';
import { apiError } from '@/lib/api/client';

export default function EditQuotationPage() {
  const { id } = useParams();
  const router = useRouter();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    customerId: '',
    customerLabel: '',
    validUntil: '',
    terms: '',
    notes: '',
    lines: [],
  });

  const [hydrated, setHydrated] = useState(false);

  const {
    data: quotationResponse,
    isLoading: loadingQuotation,
    isError: loadError,
  } = useQuery({
    queryKey: ['quotations', id],
    queryFn: () => salesApi.quotation(id),
    enabled: !!id,
  });

  // Response envelope: { success, message, data: {...} } — unwrap safely regardless of shape
  const quotation = quotationResponse?.data ?? quotationResponse;
  console.log(quotation)
  useEffect(() => {
    if (!quotation?.id || hydrated) return;

    // if (quotation.status !== 'DRAFT') {
    //   toast.error('Only draft quotations can be edited');
    //   router.replace(`/sales/quotations/pdf/${id}`);
    //   return;
    // }

    setForm({
      customerId: quotation.customerId || '',
      customerLabel: quotation.customerName || '',
      validUntil: quotation.validUntil ? quotation.validUntil.slice(0, 10) : '',
      terms: quotation.terms || '',
      notes: quotation.notes || '',
      lines: (quotation.lines || []).map((l) => ({
        id: l.id,
        partId: l.partId,
        partCode: l.partCode,
        partNumber: l.partCode,
        manufacturer: l.manufacturer?.name || '',
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        discountPct: Number(l.discountPct),
        taxRatePct: Number(l.taxRatePct),
        lineTotal: Number(l.lineTotal),
      })),
    });
    setHydrated(true);
  }, [quotation, hydrated, id, router]);

  const fetchCustomers = async (q) => {
    const res = await customersApi.list({ search: q || '', limit: 20 });
    const list = Array.isArray(res) ? res : res?.items || res?.data?.items || [];
    return list.map((c) => ({
      id: c.id,
      label: `${c.code || ''} — ${c.legalName || c.name || ''}`,
      raw: c,
    }));
  };

  const mutation = useMutation({
    mutationFn: () =>
      salesApi.updateQuotation(id, {
        customerName: form.customerLabel || undefined,
        validUntil: form.validUntil || null,
        terms: form.terms || '',
        notes: form.notes || '',
        lines: form.lines.map((l) => ({
          partId: l.partId,
          partCode: l.partCode || l.partNumber || '',
          description: l.description || '',
          partLabel: `${l.partCode} — ${l.description}`,
           manufacturer: l.manufacturer || '',
          quantity: Number(l.quantity) || 0,
          unitPrice: Number(l.unitPrice) || 0,
          discountPct: Number(l.discountPct) || 0,
          taxRatePct: Number(l.taxRatePct) || 0,
        })),
      }),

    onSuccess: () => {
      toast.success('Quotation updated successfully');
      qc.invalidateQueries({ queryKey: ['quotations'] });
      qc.invalidateQueries({ queryKey: ['quotations', id] });
      router.push('/sales/quotations');
    },

    onError: (error) => {
      toast.error(apiError(error));
    },
  });

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.lines.length) {
      toast.error('Please add at least one line item');
      return;
    }

    const invalidLine = form.lines.find(
      (line) => !line.partId || Number(line.quantity) <= 0 || Number(line.unitPrice) < 0,
    );

    if (invalidLine) {
      toast.error('Please check all line items');
      return;
    }

    mutation.mutate();
  };

  if (loadingQuotation) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading quotation...
        </div>
      </div>
    );
  }

  if (loadError || !quotation?.id) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-900">Unable to load this quotation</p>
        <p className="mt-1 text-sm text-red-700">
          It may have been deleted or is temporarily unavailable.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/sales/quotations')}>
          Back to quotations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit quotation" description={quotation?.code || 'Update this quotation.'}>
        <Button type="button" variant="outline" onClick={() => router.push('/sales/quotations')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer information</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <AsyncSelect
                    value={form.customerId}
                    onChange={(id) => updateForm('customerId', id)}
                    fetcher={fetchCustomers}
                    placeholder="Search customer..."
                    disabled
                    defaultLabel={form.customerLabel}
                    initialOptions={
                      form.customerId
                        ? [{ id: form.customerId, label: form.customerLabel }]
                        : []
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Customer: <strong>{form.customerLabel || '—'}</strong> · Cannot be changed after
                    creation. Cancel and create a new quotation instead.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Valid until</Label>
                  <Input
                    type="date"
                    value={form.validUntil}
                    onChange={(e) => updateForm('validUntil', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Quotation items</CardTitle>
            </CardHeader>

            <CardContent>
              <LineItemsEditor value={form.lines} onChange={(lines) => updateForm('lines', lines)} />
            </CardContent>
          </Card>

          {/* Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Additional information</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Terms & conditions</Label>
                <Textarea
                  value={form.terms}
                  onChange={(e) => updateForm('terms', e.target.value)}
                  rows={4}
                  placeholder="Enter quotation terms and conditions..."
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => updateForm('notes', e.target.value)}
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Totals summary — matches backend-computed totals */}
          <Card>
            <CardHeader>
              <CardTitle>Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Subtotal</p>
                  <p className="text-sm font-semibold">₹ {Number(quotation.subtotal).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Discount</p>
                  <p className="text-sm font-semibold">₹ {Number(quotation.discountTotal).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tax</p>
                  <p className="text-sm font-semibold">₹ {Number(quotation.taxTotal).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Grand total</p>
                  <p className="text-base font-bold text-slate-900">
                    ₹ {Number(quotation.grandTotal).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Totals will recalculate on save based on your line item changes.
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/sales/quotations')}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={mutation.isPending || form.lines.length === 0}>
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}