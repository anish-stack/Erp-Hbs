"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { SearchableSelect } from '@/components/shared/searchable-select';

import { partsApi, masterApi } from "@/lib/api/services";
import { apiError } from "@/lib/api/client";

const EMPTY_FORM = {
  partNumber: "",
  description: "",
  longDescription: "",
  internalCode: "",
  manufacturerId: "",
  categoryId: "",
  uomId: "",
  taxRateId: "",
  currencyId: "",
  hsnCode: "",
  countryOfOrigin: "",
  packageType: "",
  mountingType: "UNKNOWN",
  lifecycle: "ACTIVE",
  specifications: "",
  datasheetFileId: "",
  imageFileId: "",
  moq: 1,
  packQuantity: 1,
  leadTimeDays: "",
  minStock: 0,
  maxStock: "",
  reorderPoint: 0,
  shelfLifeDays: "",
  standardCost: "",
  listPrice: "",
  isActive: true,
  isSerialised: false,
  isBatchTracked: false,
  rohsCompliant: false,
  reachCompliant: false,
};

const MOUNTING = {
  SMD: "SMD",
  THROUGH_HOLE: "THROUGH_HOLE",
  PANEL: "PANEL",
  MODULE: "MODULE",
  UNKNOWN: "UNKNOWN",
};

const LIFECYCLE = {
  ACTIVE: "ACTIVE",
  NRND: "NRND",
  OBSOLETE: "OBSOLETE",
  END_OF_LIFE: "END_OF_LIFE",
  PREVIEW: "PREVIEW",
};

function titleCase(str) {
  return str
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PartForm({ mode = "create", part = null }) {
  const router = useRouter();
  const qc = useQueryClient();

  const isEdit = mode === "edit";

  const [form, setForm] = useState(EMPTY_FORM);
  // read-only fields that come from the API but aren't part of create/update payload
  const [readOnly, setReadOnly] = useState({
    lastPurchasePrice: null,
    alternates: [],
  });

  /*
   * Load existing part into form.
   * API returns { success, message, data: {...}, requestId, timestamp } on GET /parts/:id.
   * Some callers may already unwrap `.data` before passing it down — handle both shapes.
   */
  useEffect(() => {
    if (!part) {
      setForm(EMPTY_FORM);
      setReadOnly({ lastPurchasePrice: null, alternates: [] });
      return;
    }

    const record = part.data ?? part;

    setForm({
      partNumber: record.partNumber || "",
      description: record.description || "",
      longDescription: record.longDescription || "",
      internalCode: record.internalCode || "",

      manufacturerId: record.manufacturerId || record.manufacturer?.id || "",
      categoryId: record.categoryId || record.category?.id || "",
      uomId: record.uomId || record.uom?.id || "",
      taxRateId: record.taxRateId || record.taxRate?.id || "",
      currencyId: record.currencyId || record.currency?.id || "",

      hsnCode: record.hsnCode || "",
      countryOfOrigin: record.countryOfOrigin || "",

      packageType: record.packageType || "",
      mountingType: record.mountingType || "UNKNOWN",
      lifecycle: record.lifecycle || "ACTIVE",

      specifications: record.specifications
        ? JSON.stringify(record.specifications, null, 2)
        : "",
      datasheetFileId: record.datasheetFileId || "",
      imageFileId: record.imageFileId || "",

      moq: record.moq ?? 1,
      packQuantity: record.packQuantity ?? 1,
      leadTimeDays: record.leadTimeDays ?? "",
      minStock: record.minStock ?? 0,
      maxStock: record.maxStock ?? "",
      reorderPoint: record.reorderPoint ?? 0,
      shelfLifeDays: record.shelfLifeDays ?? "",

      standardCost: record.standardCost ?? "",
      listPrice: record.listPrice ?? "",

      isActive: record.isActive ?? true,
      isSerialised: record.isSerialised ?? false,
      isBatchTracked: record.isBatchTracked ?? false,
      rohsCompliant: record.rohsCompliant ?? false,
      reachCompliant: record.reachCompliant ?? false,
    });

    setReadOnly({
      lastPurchasePrice: record.lastPurchasePrice ?? null,
      alternates: record.alternates || [],
    });
  }, [part]);

  const { data: manufacturersResponse = [] } = useQuery({
    queryKey: ["manufacturers", "options"],
    queryFn: () => masterApi.manufacturers({ limit: 100 }),
  });

  const { data: categoriesResponse = [] } = useQuery({
    queryKey: ["categories", "options"],
    queryFn: () => masterApi.categories({ limit: 100 }),
  });

  const { data: uomsResponse = [] } = useQuery({
    queryKey: ["uoms", "options"],
    queryFn: () => masterApi.uoms(),
  });

  const { data: taxRatesResponse = [] } = useQuery({
    queryKey: ["tax-rates", "options"],
    queryFn: () => masterApi.taxRates(),
  });

  const { data: currenciesResponse = [] } = useQuery({
    queryKey: ["currencies", "options"],
    queryFn: () => masterApi.currencies(),
  });

  const unwrapList = (res) =>
    res?.data?.items || res?.data || res?.items || res || [];

  const manufacturers = unwrapList(manufacturersResponse);
  const categories = unwrapList(categoriesResponse);
  const uoms = unwrapList(uomsResponse);
  const taxRates = unwrapList(taxRatesResponse);
  const currencies = unwrapList(currenciesResponse);

  const mutation = useMutation({
    mutationFn: async () => {
      let specifications = null;
      if (form.specifications.trim()) {
        try {
          specifications = JSON.parse(form.specifications);
        } catch {
          throw new Error("Specifications must be valid JSON");
        }
      }

      const payload = {
        partNumber: form.partNumber.trim(),
        description: form.description.trim(),
        longDescription: form.longDescription.trim() || null,
        internalCode: form.internalCode.trim() || null,

        manufacturerId: form.manufacturerId,
        categoryId: form.categoryId,
        uomId: form.uomId,
        taxRateId: form.taxRateId || null,
        currencyId: form.currencyId || null,

        hsnCode: form.hsnCode.trim() || null,
        countryOfOrigin: form.countryOfOrigin.trim() || null,

        packageType: form.packageType.trim() || null,
        mountingType: form.mountingType || "UNKNOWN",
        lifecycle: form.lifecycle || "ACTIVE",

        specifications,
        datasheetFileId: form.datasheetFileId.trim() || null,
        imageFileId: form.imageFileId.trim() || null,

        moq: Number(form.moq) || 1,
        packQuantity: Number(form.packQuantity) || 1,
        leadTimeDays:
          form.leadTimeDays === "" ? null : Number(form.leadTimeDays),
        minStock: Number(form.minStock) || 0,
        maxStock: form.maxStock === "" ? null : Number(form.maxStock),
        reorderPoint: Number(form.reorderPoint) || 0,
        shelfLifeDays:
          form.shelfLifeDays === "" ? null : Number(form.shelfLifeDays),

        standardCost:
          form.standardCost === "" ? null : Number(form.standardCost),
        listPrice: form.listPrice === "" ? null : Number(form.listPrice),

        isActive: Boolean(form.isActive),
        isSerialised: Boolean(form.isSerialised),
        isBatchTracked: Boolean(form.isBatchTracked),
        rohsCompliant: Boolean(form.rohsCompliant),
        reachCompliant: Boolean(form.reachCompliant),
      };

      if (isEdit) {
        return partsApi.update(part.id, payload);
      }

      return partsApi.create(payload);
    },

    onSuccess: () => {
      toast.success(
        isEdit ? "Part updated successfully" : "Part created successfully",
      );
      qc.invalidateQueries({ queryKey: ["parts"] });
      if (part?.id) qc.invalidateQueries({ queryKey: ["part", part.id] });
      router.push("/parts");
    },

    onError: (error) => {
      console.error("Part save error:", error);
      toast.error(error?.message || apiError(error));
    },
  });

  const set = (key) => (event) => {
    setForm((current) => ({
      ...current,
      [key]: event?.target?.value ?? event,
    }));
  };

  const setBoolean = (key) => (value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.partNumber.trim()) return toast.error("Part number is required");
    if (!form.description.trim()) return toast.error("Description is required");
    if (!form.manufacturerId) return toast.error("Manufacturer is required");
    if (!form.categoryId) return toast.error("Category is required");
    if (!form.uomId) return toast.error("UOM is required");
    if (Number(form.moq) < 1) return toast.error("MOQ must be at least 1");
    if (Number(form.packQuantity) < 1)
      return toast.error("Pack quantity must be at least 1");

    mutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? "Edit part" : "New part"}
        description={
          isEdit
            ? `Update ${form.partNumber || "part"} information.`
            : "Add a new component to the product catalog."
        }
        crumbs={[
          { label: "Catalog" },
          { label: "Parts" },
          { label: isEdit ? "Edit" : "New" },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BASIC INFORMATION */}
        <section className="rounded-lg border bg-card">
          <div className="border-b p-6">
            <h2 className="text-lg font-semibold">Basic information</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Basic identification information for the part.
            </p>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Part number<span className="ml-1 text-destructive">*</span>
              </Label>
              <Input
                value={form.partNumber}
                onChange={set("partNumber")}
                placeholder="PJ-102AH"
              />
            </div>

            <div className="space-y-2">
              <Label>Internal code</Label>
              <Input
                value={form.internalCode}
                onChange={set("internalCode")}
                placeholder="Internal catalog code"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>
                Description<span className="ml-1 text-destructive">*</span>
              </Label>
              <Textarea
                value={form.description}
                onChange={set("description")}
                rows={3}
                placeholder="2.1mm DC barrel jack, PCB mount"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Long description</Label>
              <Textarea
                value={form.longDescription}
                onChange={set("longDescription")}
                rows={4}
                placeholder="Detailed description..."
              />
            </div>

            <div className="space-y-2">
              <Label>HSN code</Label>
              <Input
                value={form.hsnCode}
                onChange={set("hsnCode")}
                placeholder="8544"
              />
            </div>

            <div className="space-y-2">
              <Label>Country of origin</Label>
              <Input
                value={form.countryOfOrigin}
                onChange={set("countryOfOrigin")}
                placeholder="India"
              />
            </div>
          </div>
        </section>

        {/* CLASSIFICATION */}
{/* CLASSIFICATION */}
<section className="rounded-lg border bg-card">
  <div className="border-b p-6">
    <h2 className="text-lg font-semibold">Classification</h2>
    <p className="mt-1 text-sm text-muted-foreground">Assign the manufacturer, category and unit of measure.</p>
  </div>

  <div className="grid gap-5 p-6 md:grid-cols-3">
    <div className="space-y-2">
      <Label>Manufacturer<span className="ml-1 text-destructive">*</span></Label>
      <SearchableSelect
        options={manufacturers.map((m) => ({ value: m.id, label: m.name }))}
        value={form.manufacturerId}
        onChange={set('manufacturerId')}
        placeholder="Select manufacturer"
      />
    </div>

    <div className="space-y-2">
      <Label>Category<span className="ml-1 text-destructive">*</span></Label>
      <SearchableSelect
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        value={form.categoryId}
        onChange={set('categoryId')}
        placeholder="Select category"
      />
    </div>

    <div className="space-y-2">
      <Label>UOM<span className="ml-1 text-destructive">*</span></Label>
      <SearchableSelect
        options={uoms.map((u) => ({ value: u.id, label: u.code || u.name }))}
        value={form.uomId}
        onChange={set('uomId')}
        placeholder="Select UOM"
      />
    </div>

    <div className="space-y-2">
      <Label>Package type</Label>
      <Input value={form.packageType} onChange={set('packageType')} placeholder="SMD, Reel, Tube..." />
    </div>

    <div className="space-y-2">
      <Label>Mounting type</Label>
      <SearchableSelect
        options={Object.values(MOUNTING).map((v) => ({ value: v, label: titleCase(v) }))}
        value={form.mountingType}
        onChange={set('mountingType')}
        placeholder="Select mounting type"
        isClearable={false}
      />
    </div>

    <div className="space-y-2">
      <Label>Lifecycle</Label>
      <SearchableSelect
        options={Object.values(LIFECYCLE).map((v) => ({ value: v, label: titleCase(v) }))}
        value={form.lifecycle}
        onChange={set('lifecycle')}
        placeholder="Select lifecycle status"
        isClearable={false}
      />
    </div>

    <div className="space-y-2">
      <Label>Tax rate</Label>
      <SearchableSelect
        options={taxRates.map((t) => ({
          value: t.id,
          label: `${t.name || t.code}${t.ratePct != null ? ` (${t.ratePct}%)` : ''}`,
        }))}
        value={form.taxRateId}
        onChange={set('taxRateId')}
        placeholder="Select tax rate"
      />
    </div>

    <div className="space-y-2">
      <Label>Currency</Label>
      <SearchableSelect
        options={currencies.map((c) => ({ value: c.id, label: c.code || c.name }))}
        value={form.currencyId}
        onChange={set('currencyId')}
        placeholder="Select currency"
      />
    </div>
  </div>
</section>

        {/* INVENTORY */}
        <section className="rounded-lg border bg-card">
          <div className="border-b p-6">
            <h2 className="text-lg font-semibold">Inventory</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Stock and purchasing settings.
            </p>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label>MOQ</Label>
              <Input
                type="number"
                min="1"
                value={form.moq}
                onChange={set("moq")}
              />
            </div>
            <div className="space-y-2">
              <Label>Pack quantity</Label>
              <Input
                type="number"
                min="1"
                value={form.packQuantity}
                onChange={set("packQuantity")}
              />
            </div>
            <div className="space-y-2">
              <Label>Lead time days</Label>
              <Input
                type="number"
                min="0"
                value={form.leadTimeDays}
                onChange={set("leadTimeDays")}
              />
            </div>
            <div className="space-y-2">
              <Label>Minimum stock</Label>
              <Input
                type="number"
                min="0"
                value={form.minStock}
                onChange={set("minStock")}
              />
            </div>
            <div className="space-y-2">
              <Label>Maximum stock</Label>
              <Input
                type="number"
                min="0"
                value={form.maxStock}
                onChange={set("maxStock")}
              />
            </div>
            <div className="space-y-2">
              <Label>Reorder point</Label>
              <Input
                type="number"
                min="0"
                value={form.reorderPoint}
                onChange={set("reorderPoint")}
              />
            </div>
            <div className="space-y-2">
              <Label>Shelf life days</Label>
              <Input
                type="number"
                min="0"
                value={form.shelfLifeDays}
                onChange={set("shelfLifeDays")}
              />
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="rounded-lg border bg-card">
          <div className="border-b p-6">
            <h2 className="text-lg font-semibold">Pricing</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cost and selling price information.
            </p>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Standard cost</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.standardCost}
                onChange={set("standardCost")}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>List price</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.listPrice}
                onChange={set("listPrice")}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Last purchase price</Label>
              <Input
                type="text"
                readOnly
                disabled
                value={readOnly.lastPurchasePrice ?? "—"}
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Set automatically from GRN/purchase activity, not editable here.
              </p>
            </div>
          </div>
        </section>

        {/* FILES & SPECS */}
        <section className="rounded-lg border bg-card">
          <div className="border-b p-6">
            <h2 className="text-lg font-semibold">Files & specifications</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Attach a datasheet/image (file IDs from the File service) and
              free-form specs.
            </p>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Datasheet file ID</Label>
              <Input
                value={form.datasheetFileId}
                onChange={set("datasheetFileId")}
                placeholder="UUID from File service"
              />
            </div>

            <div className="space-y-2">
              <Label>Image file ID</Label>
              <Input
                value={form.imageFileId}
                onChange={set("imageFileId")}
                placeholder="UUID from File service"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Specifications (JSON)</Label>
              <Textarea
                value={form.specifications}
                onChange={set("specifications")}
                rows={5}
                placeholder='{"voltage": "12V", "current": "3A"}'
                className="font-mono text-sm"
              />
            </div>
          </div>
        </section>

        {/* ALTERNATES (read-only — managed via separate endpoint) */}
        {isEdit && readOnly.alternates.length > 0 && (
          <section className="rounded-lg border bg-card">
            <div className="border-b p-6">
              <h2 className="text-lg font-semibold">Alternates</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Managed separately (add/remove alternates from the part detail
                page), shown here for reference.
              </p>
            </div>
            <div className="divide-y">
              {readOnly.alternates.map((alt) => (
                <div
                  key={alt.id}
                  className="flex items-center justify-between p-4 text-sm"
                >
                  <span>
                    {alt.alternatePart?.partNumber || alt.alternatePartId}
                  </span>
                  <span className="text-muted-foreground">{alt.type}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* COMPLIANCE */}
        <section className="rounded-lg border bg-card">
          <div className="border-b p-6">
            <h2 className="text-lg font-semibold">Compliance & tracking</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Compliance and inventory tracking options.
            </p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
            <BooleanField
              label="Active"
              checked={form.isActive}
              onChange={setBoolean("isActive")}
            />
            <BooleanField
              label="ROHS compliant"
              checked={form.rohsCompliant}
              onChange={setBoolean("rohsCompliant")}
            />
            <BooleanField
              label="REACH compliant"
              checked={form.reachCompliant}
              onChange={setBoolean("reachCompliant")}
            />
            <BooleanField
              label="Serialised"
              checked={form.isSerialised}
              onChange={setBoolean("isSerialised")}
            />
            <BooleanField
              label="Batch tracked"
              checked={form.isBatchTracked}
              onChange={setBoolean("isBatchTracked")}
            />
          </div>
        </section>

        {/* FOOTER */}
        <div className="flex items-center justify-end gap-3 border-t pt-6">
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => router.push("/parts")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isEdit ? "Update part" : "Create part"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function BooleanField({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 hover:bg-muted/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border"
      />
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}
