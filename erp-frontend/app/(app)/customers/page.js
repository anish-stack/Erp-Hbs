"use client";

import { useEffect, useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Edit,
  Plus,
  Loader2,
  Upload,
  Download,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { ResourceList } from "@/components/shared/resource-list";
import { StatusBadge } from "@/components/shared/status-badge";
import { Protected } from "@/components/shared/protected";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

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
  const qc = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);

  // --- bulk selection state ---
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setEditOpen(true);
  };

  const toggleRow = (id, checked) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    );
  };

  const toggleAll = (rows, checked) => {
    setSelectedIds(checked ? rows.map((r) => r.id) : []);
  };

  const clearSelection = () => setSelectedIds([]);

  const importMutation = useMutation({
    mutationFn: (file) => customersApi.importExcel(file),

    onSuccess: (response) => {
      const result = response?.data || response;

      if (result?.failed > 0) {
        toast.warning(
          `Import completed with ${result.failed} failed row${
            result.failed === 1 ? "" : "s"
          }`,
        );
      } else {
        toast.success(
          `${result?.created || 0} customer${
            result?.created === 1 ? "" : "s"
          } imported successfully`,
        );
      }

      qc.invalidateQueries({
        queryKey: ["customers"],
      });

      setImportFile(null);
      setImportOpen(false);
    },

    onError: (error) => {
      console.error("Customer import failed:", error);

      toast.error(
        apiError(error) || "Failed to import customers",
      );
    },
  });

  /**
   * BULK DELETE
   *
   * Fire one delete request per selected id, in parallel, via Promise.all.
   * Uses allSettled under the hood so one failed row doesn't kill the rest;
   * we then report success/fail counts like the import flow does.
   */
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      const results = await Promise.allSettled(
        ids.map((id) => customersApi.remove(id)),
      );

      const failed = results.filter((r) => r.status === "rejected");
      const succeeded = results.length - failed.length;

      if (failed.length > 0 && succeeded === 0) {
        // everything failed — surface the first error
        throw failed[0].reason;
      }

      return { succeeded, failed: failed.length };
    },

    onSuccess: ({ succeeded, failed }) => {
      if (failed > 0) {
        toast.warning(
          `Deleted ${succeeded} customer${succeeded === 1 ? "" : "s"}, ${failed} failed`,
        );
      } else {
        toast.success(
          `${succeeded} customer${succeeded === 1 ? "" : "s"} deleted successfully`,
        );
      }

      qc.invalidateQueries({ queryKey: ["customers"] });
      clearSelection();
      setBulkDeleteOpen(false);
    },

    onError: (error) => {
      console.error("Bulk customer delete failed:", error);

      toast.error(apiError(error) || "Failed to delete customers");
      setBulkDeleteOpen(false);
    },
  });

  const handleImport = () => {
    if (!importFile) {
      toast.error("Please select an Excel file");
      return;
    }

    importMutation.mutate(importFile);
  };

  const handleExport = async () => {
    try {
      toast.loading("Preparing customer export...", {
        id: "customer-export",
      });

      const blob = await customersApi.exportExcel();

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `customers-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      toast.success("Customers exported successfully", {
        id: "customer-export",
      });
    } catch (error) {
      console.error("Customer export failed:", error);

      toast.error(
        apiError(error) || "Failed to export customers",
        {
          id: "customer-export",
        },
      );
    }
  };

  const handleExportTemplate = async () => {
    try {
      toast.loading("Preparing import template...", {
        id: "customer-template",
      });

      const blob =
        await customersApi.exportExcelTemplate();

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "customer-import-template.xlsx";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      toast.success("Template downloaded", {
        id: "customer-template",
      });
    } catch (error) {
      console.error(
        "Customer template download failed:",
        error,
      );

      toast.error(
        apiError(error) ||
          "Failed to download import template",
        {
          id: "customer-template",
        },
      );
    }
  };

  const handleCreate = () => {
    setSelectedCustomer(null);
    setCreateOpen(true);
  };

  const columns = [
    {
      key: "select",
      header: ({ rows }) => (
        <Checkbox
          checked={rows.length > 0 && selectedIds.length === rows.length}
          onCheckedChange={(checked) => toggleAll(rows, Boolean(checked))}
          aria-label="Select all"
        />
      ),
      render: (customer) => (
        <Checkbox
          checked={selectedIds.includes(customer.id)}
          onCheckedChange={(checked) => toggleRow(customer.id, Boolean(checked))}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${customer.name || customer.legalName || customer.id}`}
        />
      ),
    },

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

  const importDialog = (
    <Dialog
      open={importOpen}
      onOpenChange={(open) => {
        if (importMutation.isPending) return;

        setImportOpen(open);

        if (!open) {
          setImportFile(null);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import customers</DialogTitle>

          <DialogDescription>
            Upload an Excel file containing customer records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-dashed p-6 text-center">
            <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />

            <p className="text-sm font-medium">
              Select Excel file
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              .xlsx or .xls files are supported
            </p>

            <Input
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="mt-4 cursor-pointer"
              disabled={importMutation.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (!file) {
                  setImportFile(null);
                  return;
                }

                const maxSize = 10 * 1024 * 1024;

                if (file.size > maxSize) {
                  toast.error(
                    "File size must be less than 10 MB",
                  );

                  event.target.value = "";
                  setImportFile(null);
                  return;
                }

                setImportFile(file);
              }}
            />

            {importFile && (
              <div className="mt-4 rounded-md bg-muted p-3 text-left">
                <p className="truncate text-sm font-medium">
                  {importFile.name}
                </p>

                <p className="text-xs text-muted-foreground">
                  {(importFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              Before importing
            </p>

            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>Use the customer import template.</li>
              <li>Do not modify the column names.</li>
              <li>GSTIN and PAN must be valid.</li>
              <li>Duplicate customers may be rejected.</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setImportOpen(false)}
            disabled={importMutation.isPending}
          >
            Cancel
          </Button>

          <Button
            onClick={handleImport}
            disabled={
              !importFile ||
              importMutation.isPending
            }
          >
            {importMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}

            {importMutation.isPending
              ? "Importing..."
              : "Import customers"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const bulkDeleteDialog = (
    <AlertDialog
      open={bulkDeleteOpen}
      onOpenChange={(open) => {
        if (bulkDeleteMutation.isPending) return;
        setBulkDeleteOpen(open);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {selectedIds.length} customer{selectedIds.length === 1 ? "" : "s"}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the selected customer accounts. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={() => bulkDeleteMutation.mutate(selectedIds)}
            disabled={bulkDeleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {bulkDeleteMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Accounts, credit, and relationship status."
        crumbs={[
          { label: "Sales" },
          { label: "Customers" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedIds.length})
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleExportTemplate}
            >
              <Download className="mr-2 h-4 w-4" />
              Template
            </Button>

            <Protected permission="customer.create">
              <Button
                variant="outline"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            </Protected>

            <Button
              variant="outline"
              onClick={handleExport}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

            <Protected permission="customer.create">
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                New customer
              </Button>
            </Protected>
          </div>
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

      {importDialog}
      {bulkDeleteDialog}
    </div>
  );
}