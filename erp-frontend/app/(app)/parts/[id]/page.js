"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Pencil,
  Loader2,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { partsApi } from "@/lib/api/services";
import { formatMoney } from "@/lib/utils";

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">
        {value !== null && value !== undefined && value !== ""
          ? String(value)
          : "—"}
      </p>
    </div>
  );
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

export default function PartViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["part", id],
    queryFn: () => partsApi.get(id),
    enabled: !!id,
  });

  // API returns { success, message, data: {...}, requestId, timestamp } — unwrap defensively
  // in case a caller/interceptor already unwrapped it.
  const part = response?.data ?? response;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (isError || !part) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Part not found"
          description="The requested part could not be found."
        />
        <Button variant="outline" onClick={() => router.push("/parts")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to parts
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={part.partNumber}
        description={part.description || "Part details"}
        crumbs={[
          { label: "Catalog" },
          { label: "Parts" },
          { label: part.partNumber },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/parts")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={() => router.push(`/parts/${part.id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        }
      />

      {/* STATUS */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Status</span>
        <StatusBadge status={part.isActive ? "ACTIVE" : "INACTIVE"} />
        <span className="text-sm text-muted-foreground ml-2">Lifecycle</span>
        <StatusBadge status={part.lifecycle || "ACTIVE"} />
        {part.lifecycleRisk && (
          <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
            Lifecycle risk
          </span>
        )}
      </div>

      {/* BASIC INFORMATION */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Basic information</h2>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
          <Detail label="Part number" value={part.partNumber} />
          <Detail label="Normalized number" value={part.normalizedNumber} />
          <Detail label="Internal code" value={part.internalCode} />
          <Detail label="HSN code" value={part.hsnCode} />
          <Detail label="Country of origin" value={part.countryOfOrigin} />
          <div />
          <div className="md:col-span-2 lg:col-span-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Description
            </p>
            <p className="rounded-lg border p-4 text-sm">
              {part.description || "—"}
            </p>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Long description
            </p>
            <p className="rounded-lg border p-4 text-sm whitespace-pre-wrap">
              {part.longDescription || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* CLASSIFICATION */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Classification</h2>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
          <Detail label="Manufacturer" value={part.manufacturer?.name} />
          <Detail label="Manufacturer code" value={part.manufacturer?.code} />
          <Detail label="Category" value={part.category?.name} />
          <Detail label="Category code" value={part.category?.code} />
          <Detail label="Category path" value={part.category?.path} />
          <Detail label="UOM" value={part.uom?.code} />
          <Detail label="UOM name" value={part.uom?.name} />
          <Detail
            label="Tax rate"
            value={
              part.taxRate
                ? `${part.taxRate.name || part.taxRate.code}${part.taxRate.ratePct != null ? ` (${part.taxRate.ratePct}%)` : ""}`
                : null
            }
          />
          <Detail
            label="Currency"
            value={part.currency?.code || part.currency?.name}
          />
          <Detail label="Mounting type" value={part.mountingType} />
          <Detail label="Package type" value={part.packageType} />
        </div>
      </div>

      {/* INVENTORY & PRICING */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Inventory & pricing</h2>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-4">
          <Detail label="MOQ" value={part.moq} />
          <Detail label="Pack quantity" value={part.packQuantity} />
          <Detail label="Lead time (days)" value={part.leadTimeDays} />
          <Detail label="Shelf life (days)" value={part.shelfLifeDays} />
          <Detail label="Minimum stock" value={part.minStock} />
          <Detail label="Maximum stock" value={part.maxStock} />
          <Detail label="Reorder point" value={part.reorderPoint} />
          <div />
          <Detail
            label="Standard cost"
            value={
              part.standardCost != null
                ? formatMoney(Number(part.standardCost))
                : null
            }
          />
          <Detail
            label="Last purchase price"
            value={
              part.lastPurchasePrice != null
                ? formatMoney(Number(part.lastPurchasePrice))
                : null
            }
          />
          <Detail
            label="List price"
            value={
              part.listPrice != null
                ? formatMoney(Number(part.listPrice))
                : null
            }
          />
        </div>
      </div>

      {/* COMPLIANCE & TRACKING */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Compliance & tracking</h2>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-4">
          <Detail label="Lifecycle" value={part.lifecycle} />
          <Detail
            label="Lifecycle risk"
            value={part.lifecycleRisk ? "Yes" : "No"}
          />
          <Detail
            label="ROHS compliant"
            value={part.rohsCompliant ? "Yes" : "No"}
          />
          <Detail
            label="REACH compliant"
            value={part.reachCompliant ? "Yes" : "No"}
          />
          <Detail label="Active" value={part.isActive ? "Yes" : "No"} />
          <Detail label="Serialised" value={part.isSerialised ? "Yes" : "No"} />
          <Detail
            label="Batch tracked"
            value={part.isBatchTracked ? "Yes" : "No"}
          />
        </div>
      </div>

      {/* SPECIFICATIONS & FILES */}
      {(part.specifications || part.datasheetFileId || part.imageFileId) && (
        <div className="rounded-lg border bg-card">
          <div className="border-b p-6">
            <h2 className="text-lg font-semibold">Specifications & files</h2>
          </div>
          <div className="grid gap-4 p-6 md:grid-cols-2">
            {part.specifications && (
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Specifications
                </p>
                <pre className="rounded-lg border bg-muted/40 p-4 text-xs overflow-x-auto">
                  {JSON.stringify(part.specifications, null, 2)}
                </pre>
              </div>
            )}
            {part.datasheetFileId && (
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Datasheet file ID
                  </p>
                  <p className="mt-1 text-sm font-medium break-all">
                    {part.datasheetFileId}
                  </p>
                </div>
              </div>
            )}
            {part.imageFileId && (
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Image file ID
                  </p>
                  <p className="mt-1 text-sm font-medium break-all">
                    {part.imageFileId}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ALTERNATES */}
      {part.alternates && part.alternates.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="border-b p-6">
            <h2 className="text-lg font-semibold">Alternates</h2>
          </div>
          <div className="divide-y">
            {part.alternates.map((alt) => (
              <div
                key={alt.id}
                className="flex items-center justify-between p-4 text-sm"
              >
                <span className="font-medium">
                  {alt.alternatePart?.partNumber || alt.alternatePartId}
                </span>
                <span className="text-muted-foreground">{alt.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TIMESTAMPS */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Record info</h2>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
          <Detail label="Part ID" value={part.id} />
          <Detail label="Created at" value={formatDate(part.createdAt)} />
          <Detail label="Updated at" value={formatDate(part.updatedAt)} />
        </div>
      </div>
    </div>
  );
}
