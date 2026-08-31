'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/shared/page-header';
import { AsyncSelect } from '@/components/shared/async-select';
import { LineItemsEditor } from '@/components/shared/line-items-editor';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

import { salesApi, customersApi } from '@/lib/api/services';
import { apiError } from '@/lib/api/client';

export default function NewQuotationPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    customerId: '',
    validUntil: '',
    terms: '',
    notes: '',
    lines: [],
  });

  const [createdQuotation, setCreatedQuotation] = useState(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const fetchCustomers = async (q) => {
    const res = await customersApi.list({
      search: q || '',
      limit: 20,
    });

    const list = Array.isArray(res)
      ? res
      : res?.items || res?.data?.items || [];

    return list.map((c) => ({
      id: c.id,
      label: `${c.code || ''} — ${c.legalName || c.name || ''}`,
      raw: c,
    }));
  };

  const mutation = useMutation({
    mutationFn: () =>
      salesApi.createQuotation({
        customerId: form.customerId,
        validUntil: form.validUntil || null,
        terms: form.terms || '',
        notes: form.notes || '',
        lines: form.lines.map((l) => ({
          partId: l.partId,
          partCode: l.partCode || l.partNumber || '',
          description: l.description || '',
          quantity: Number(l.quantity) || 0,
          unitPrice: Number(l.unitPrice) || 0,
          discountPct: Number(l.discountPct) || 0,
          taxRatePct: Number(l.taxRatePct) || 0,
        })),
      }),

    onSuccess: (res) => {
      const quotation = res?.data || res;
      toast.success('Quotation created successfully');
      setCreatedQuotation(quotation);
      setShowSuccessDialog(true);
    },

    onError: (error) => {
      toast.error(apiError(error));
    },
  });

  const updateForm = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.customerId) {
      toast.error('Please select a customer');
      return;
    }

    if (!form.lines.length) {
      toast.error('Please add at least one line item');
      return;
    }

    const invalidLine = form.lines.find(
      (line) =>
        !line.partId ||
        Number(line.quantity) <= 0 ||
        Number(line.unitPrice) < 0
    );

    if (invalidLine) {
      toast.error('Please check all line items');
      return;
    }

    mutation.mutate();
  };

  const handleViewPdf = () => {
    if (!createdQuotation?.id) return;
    window.open(`/api/quotations/${createdQuotation.id}/pdf`, '_blank');
  };

  const handleGoBack = () => {
    router.push('/sales/quotations');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New quotation"
        description="Create a quotation for a customer."
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/sales/quotations')}
        >
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
                  <Label>
                    Customer <span className="text-destructive">*</span>
                  </Label>

                  <AsyncSelect
                    value={form.customerId}
                    onChange={(id) => updateForm('customerId', id)}
                    fetcher={fetchCustomers}
                    placeholder="Search customer..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valid until</Label>

                  <Input
                    type="date"
                    value={form.validUntil}
                    onChange={(e) =>
                      updateForm('validUntil', e.target.value)
                    }
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
              <LineItemsEditor
                value={form.lines}
                onChange={(lines) => updateForm('lines', lines)}
              />
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
                  onChange={(e) =>
                    updateForm('terms', e.target.value)
                  }
                  rows={4}
                  placeholder="Enter quotation terms and conditions..."
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>

                <Textarea
                  value={form.notes}
                  onChange={(e) =>
                    updateForm('notes', e.target.value)
                  }
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>
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

            <Button
              type="submit"
              disabled={
                mutation.isPending ||
                !form.customerId ||
                form.lines.length === 0
              }
            >
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}

              Create quotation
            </Button>
          </div>
        </div>
      </form>

      {/* Success Dialog — view PDF or go back */}
      <Dialog
        open={showSuccessDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowSuccessDialog(false);
            handleGoBack();
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <DialogTitle>Quotation created</DialogTitle>
            </div>
            <DialogDescription>
              {createdQuotation?.code
                ? `${createdQuotation.code} has been created successfully.`
                : 'The quotation has been created successfully.'}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowSuccessDialog(false);
                handleGoBack();
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go back to list
            </Button>

            <Button type="button" onClick={handleViewPdf}>
              <FileText className="mr-2 h-4 w-4" />
              View PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}