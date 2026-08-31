"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncSelect } from "@/components/shared/async-select";
import { partsApi } from "@/lib/api/services";
import { formatMoney } from "@/lib/utils";

/*
  Shared line-item grid for Purchase Orders, Sales Orders and Quotations.
  Every backend line schema (po/sales) share the same shape: partId, qty,
  unitPrice, discount%, tax%. Extra per-row fields (uomCode, partNumber) are
  filled in automatically from the picked part so the caller doesn't have to.

  value: [{ partId, partCode, description, quantity, unitPrice, discountPct, taxRatePct, uomCode }]
*/
export function LineItemsEditor({ value = [], onChange }) {
  const fetchParts = async (q) => {
    const res = await partsApi.search(q || "");
    console.log(res);
    // GET /master/parts/search response shape:
    // { success, message, data: { term, normalized, matchType, count, matches: [...] }, requestId, timestamp }
    const list = res?.items?.matches || res?.matches || [];
    console.log("list", list);
    return list.map((p) => ({
      id: p.id,
      label: `${p.partNumber} — ${p.description || ""}`,
      sub: p.manufacturer?.name,
      raw: p,
    }));
  };

  const addRow = () =>
    onChange([
      ...value,
      {
        partId: "",
        partCode: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        discountPct: 0,
        taxRatePct: 0,
        uomCode: "PCS",
      },
    ]);
  const removeRow = (idx) => onChange(value.filter((_, i) => i !== idx));
  const updateRow = (idx, patch) =>
    onChange(value.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

  const lineTotal = (row) => {
    const base = (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);
    const afterDiscount = base - (base * (Number(row.discountPct) || 0)) / 100;
    return (
      afterDiscount + (afterDiscount * (Number(row.taxRatePct) || 0)) / 100
    );
  };
  const grandTotal = value.reduce((sum, row) => sum + lineTotal(row), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Line items</Label>
        <Button type="button" size="sm" variant="outline" onClick={addRow}>
          <Plus className="h-3.5 w-3.5" /> Add line
        </Button>
      </div>

      {value.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          No lines yet — add a part to begin.
        </p>
      )}

      <div className="space-y-3">
        {value.map((row, idx) => (
          <div
            key={idx}
            className="grid grid-cols-12 items-end gap-2 rounded-md border border-border p-3"
          >
            <div className="col-span-12 sm:col-span-4 space-y-1">
              <Label className="text-xs">Part</Label>
              <AsyncSelect
                value={row.partId}
                fetcher={fetchParts}
                placeholder="Search part…"
                defaultLabel={
                  row.partId
                    ? `${row.partCode || row.partNumber || ""} — ${row.description || ""}`
                    : ""
                }
                initialOptions={
                  row.partId
                    ? [
                        {
                          id: row.partId,
                          label: `${row.partCode || row.partNumber || ""} — ${row.description || ""}`,
                        },
                      ]
                    : []
                }
                onChange={(id, item) =>
                  updateRow(idx, {
                    partId: id,
                    partCode: item?.raw?.partNumber || "",
                    description: item?.raw?.description || "",
                    manufacturer: item?.raw?.manufacturer?.name || "",
                    partNumber: item?.raw?.partNumber || "",
                    uomCode: item?.raw?.uom?.code || "PCS",
                  })
                }
              />
            </div>
            <div className="col-span-6 sm:col-span-2 space-y-1">
              <Label className="text-xs">Manufacture</Label>
              <Input
                type="text"
                disabled={true}
                value={row.manufacturer || ""}
                onChange={(e) =>
                  updateRow(idx, { manufacturer: e.target.value })
                }
              />
            </div>
            <div className="col-span-6 sm:col-span-2 space-y-1">
              <Label className="text-xs">Qty</Label>
              <Input
                type="number"
                min="1"
                value={row.quantity}
                onChange={(e) => updateRow(idx, { quantity: e.target.value })}
              />
            </div>
            <div className="col-span-6 sm:col-span-2 space-y-1">
              <Label className="text-xs">Unit price</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={row.unitPrice}
                onChange={(e) => updateRow(idx, { unitPrice: e.target.value })}
              />
            </div>
            <div className="col-span-6 sm:col-span-1 space-y-1">
              <Label className="text-xs">Disc %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={row.discountPct}
                onChange={(e) =>
                  updateRow(idx, { discountPct: e.target.value })
                }
              />
            </div>
            <div className="col-span-6 sm:col-span-1 space-y-1">
              <Label className="text-xs">Tax %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={row.taxRatePct}
                onChange={(e) => updateRow(idx, { taxRatePct: e.target.value })}
              />
            </div>
            <div className="col-span-10 sm:col-span-1 space-y-1">
              <Label className="text-xs">Total</Label>
              <p className="pt-1.5 text-sm font-medium tabular-nums">
                {formatMoney(lineTotal(row))}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(idx)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {value.length > 0 && (
        <div className="flex justify-end border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">Grand total:&nbsp;</span>
          <span className="font-semibold tabular-nums">
            {formatMoney(grandTotal)}
          </span>
        </div>
      )}
    </div>
  );
}
