"use client";

import { useEffect, useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Edit, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { ResourceList } from "@/components/shared/resource-list";
import { StatusBadge } from "@/components/shared/status-badge";
import { Protected } from "@/components/shared/protected";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { customersApi } from "@/lib/api/services";
import { formatMoney } from "@/lib/utils";
import { apiError } from "@/lib/api/client";

const CUSTOMER_TYPES = ["BUSINESS", "INDIVIDUAL", "GOVERNMENT"];

const SEGMENTS = ["ENTERPRISE", "SMB", "STARTUP", "GOVERNMENT", "RETAIL"];

const EMPTY_FORM = {
  legalName: "",
  tradeName: "",
  type: "BUSINESS",
  segment: "SMB",
  email: "",
  phone: "",
  gstin: "",
  paymentTermDays: 30,
  creditLimit: 0,
};

function CustomerFormDialog({ open, onOpenChange, customer = null }) {
  const qc = useQueryClient();

  const isEdit = Boolean(customer);

  const [form, setForm] = useState(EMPTY_FORM);

  /**
   * Populate form when editing.
   */
  useEffect(() => {
    if (customer) {
      setForm({
        legalName: customer.legalName || customer.name || "",
        tradeName: customer.tradeName || "",
        type: customer.type || "BUSINESS",
        segment: customer.segment || "SMB",
        email: customer.email || "",
        phone: customer.phone || "",
        gstin: customer.gstin || "",
        paymentTermDays: customer.paymentTermDays ?? 30,
        creditLimit: customer.creditLimit ?? 0,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [customer, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,

        legalName: form.legalName.trim(),
        tradeName: form.tradeName?.trim() || "",
        email: form.email?.trim() || "",
        phone: form.phone?.trim() || "",
        gstin: form.gstin?.trim().toUpperCase() || "",

        paymentTermDays: Number(form.paymentTermDays),

        creditLimit: Number(form.creditLimit),
      };

      /**
       * CREATE
       */
      if (!isEdit) {
        return customersApi.create(payload);
      }

      /**
       * UPDATE
       *
       * IMPORTANT:
       * customersApi.update(id, payload)
       */
      return customersApi.update(customer.id, payload);
    },

    onSuccess: () => {
      toast.success(
        isEdit
          ? "Customer updated successfully"
          : "Customer created successfully",
      );

      qc.invalidateQueries({
        queryKey: ["customers"],
      });

      onOpenChange(false);
      setForm(EMPTY_FORM);
    },

    onError: (error) => {
      console.error(`Customer ${isEdit ? "update" : "create"} failed:`, error.response);

      toast.error(
        apiError(error) || `Failed to ${isEdit ? "update" : "create"} customer`,
      );
    },
  });

  const set = (key) => (event) => {
    const value = event?.target?.value ?? event;

    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleClose = (value) => {
    if (mutation.isPending) return;

    if (!value) {
      setForm(EMPTY_FORM);
    }

    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit customer" : "New customer"}</DialogTitle>

          <DialogDescription>
            {isEdit
              ? "Update customer account and credit terms."
              : "Add a customer account with credit terms."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Legal / Trade Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Legal name</Label>

              <Input
                value={form.legalName}
                onChange={set("legalName")}
                placeholder="Acme Pvt Ltd"
                disabled={mutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>Trade name</Label>

              <Input
                value={form.tradeName}
                onChange={set("tradeName")}
                disabled={mutation.isPending}
              />
            </div>
          </div>

          {/* Type / Segment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>

              <Select
                value={form.type}
                onValueChange={set("type")}
                disabled={mutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>

                <SelectContent>
                  {CUSTOMER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Segment</Label>

              <Select
                value={form.segment}
                onValueChange={set("segment")}
                disabled={mutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select segment" />
                </SelectTrigger>

                <SelectContent>
                  {SEGMENTS.map((segment) => (
                    <SelectItem key={segment} value={segment}>
                      {segment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Email / Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Email</Label>

              <Input
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="customer@example.com"
                disabled={mutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>

              <Input
                value={form.phone}
                onChange={set("phone")}
                placeholder="+91..."
                disabled={mutation.isPending}
              />
            </div>
          </div>

          {/* GST / Payment / Credit */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>GSTIN</Label>

              <Input
                value={form.gstin}
                onChange={set("gstin")}
                maxLength={15}
                className="uppercase"
                placeholder="GSTIN"
                disabled={mutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>Payment terms (days)</Label>

              <Input
                type="number"
                min="0"
                value={form.paymentTermDays}
                onChange={set("paymentTermDays")}
                disabled={mutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>Credit limit</Label>

              <Input
                type="number"
                min="0"
                value={form.creditLimit}
                onChange={set("creditLimit")}
                disabled={mutation.isPending}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>

          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.legalName.trim()}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}

            {isEdit ? "Update customer" : "Create customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomersPage() {
  const [createOpen, setCreateOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setEditOpen(true);
  };

  const handleCreate = () => {
    setSelectedCustomer(null);
    setCreateOpen(true);
  };

  const columns = [
    {
      key: "code",
      header: "Code",

      render: (customer) => (
        <span className="font-medium text-slate-900">{customer.code}</span>
      ),
    },

    {
      key: "name",
      header: "Customer",

      render: (customer) => (
        <div className="leading-tight">
          <p className="font-medium text-slate-900">
            {customer.name || customer.legalName || "—"}
          </p>

          <p className="text-xs text-muted-foreground">
            {customer.email || customer.city || "—"}
          </p>
        </div>
      ),
    },

    {
      key: "creditLimit",
      header: "Credit limit",
      align: "right",

      render: (customer) => formatMoney(customer.creditLimit),
    },

    {
      key: "outstanding",
      header: "Outstanding",
      align: "right",

      render: (customer) =>
        formatMoney(customer.outstanding ?? customer.creditUsed ?? 0),
    },

    {
      key: "status",
      header: "Status",
      align: "right",

      render: (customer) => (
        <StatusBadge
          status={
            customer.status || (customer.isActive ? "ACTIVE" : "INACTIVE")
          }
        />
      ),
    },

    {
      key: "actions",
      header: "Actions",
      align: "right",

      render: (customer) => (
        <Protected permission="customer.update">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(customer)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </Protected>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Accounts, credit, and relationship status."
        crumbs={[{ label: "Sales" }, { label: "Customers" }]}
        actions={
          <Protected permission="customer.create">
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              New customer
            </Button>
          </Protected>
        }
      />

      <ResourceList
        queryKey={["customers"]}
        fetcher={customersApi.list}
        columns={columns}
        searchPlaceholder="Search customers…"
        emptyTitle="No customers yet"
      />

      {/* CREATE */}
      <CustomerFormDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* EDIT */}
      <CustomerFormDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);

          if (!open) {
            setSelectedCustomer(null);
          }
        }}
        customer={selectedCustomer}
      />
    </div>
  );
}
