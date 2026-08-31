"use client";

import { useEffect, useState, useRef } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import {
  MoreHorizontal,
  ArrowRightCircle,
  Plus,
  Loader2,
  Pencil,
  Check,
  Trash2,
  PhoneCall,
  History,
  UploadCloud,
  DownloadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ResourceList } from "@/components/shared/resource-list";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Protected } from "@/components/shared/protected";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { leadsApi } from "@/lib/api/services";
import { formatMoney, formatDate } from "@/lib/utils";
import { apiError } from "@/lib/api/client";

const SOURCES = [
  "WEBSITE",
  "REFERRAL",
  "COLD_CALL",
  "EXHIBITION",
  "ADVERTISEMENT",
  "OTHER",
];

const STAGE_TRANSITIONS = {
  NEW: ["CONTACTED", "LOST"],
  CONTACTED: ["QUALIFIED", "LOST"],
  QUALIFIED: ["PROPOSAL", "LOST"],
  PROPOSAL: ["NEGOTIATION", "LOST"],
  NEGOTIATION: ["WON", "LOST"],
  WON: [],
  LOST: ["CONTACTED"],
};



const label = (v) => (v || "").replaceAll("_", " ");

const parseHistory = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/* =========================================================
   FOLLOW-UP DIALOG
========================================================= */

function FollowUpDialog({ open, onOpenChange, lead }) {
  const qc = useQueryClient();

  const [notes, setNotes] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");

  useEffect(() => {
    if (open) {
      setNotes("");
      setNextFollowUpAt("");
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () =>
      leadsApi.followUp(lead.id, {
        notes,
        nextFollowUpAt: nextFollowUpAt || null,
        dueAt: nextFollowUpAt || null,
      }),

    onSuccess: () => {
      toast.success("Follow-up logged");
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["leads", lead.id, "activities"] });
      onOpenChange(false);
    },

    onError: (e) => {
      console.error("Follow-up log error:", e);
      toast.error(apiError(e));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log follow-up</DialogTitle>
          <DialogDescription>
            {lead ? `Record contact with ${lead.companyName}.` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Next follow-up date</Label>
            <Input
              type="datetime-local"
              value={nextFollowUpAt}
              onChange={(e) => setNextFollowUpAt(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !notes}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   IMPORT-UP DIALOG
========================================================= */

function ImportDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // parsed rows, before upload
  const [result, setResult] = useState(null); // server response, after upload

  const mutation = useMutation({
    mutationFn: () => leadsApi.importExcel(file),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, {
          type: "array",
          cellDates: true,
        });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        setPreview(rows);
      } catch {
        toast.error("Could not read this file");
        setFile(null);
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const columns = preview?.length ? Object.keys(preview[0]) : [];

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import leads</DialogTitle>
          <DialogDescription>
            {result
              ? "Import complete."
              : preview
                ? `Preview — ${preview.length} row(s) found in the file.`
                : "Upload an Excel file (.xlsx)."}
          </DialogDescription>
        </DialogHeader>

        {!file && !result && (
          <div className="py-4">
            <Input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
            />
          </div>
        )}

        {preview && !result && (
          <div className="max-h-[24rem] overflow-auto py-2 border rounded-md">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-100">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c}
                      className="text-left p-1 border whitespace-nowrap"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c} className="p-1 border whitespace-nowrap">
                        {String(row[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && (
          <div className="max-h-[24rem] overflow-y-auto space-y-3 py-2">
            <div className="flex gap-4 text-sm">
              <span>Total: {result.total}</span>
              <span className="text-green-600">
                Imported: {result.imported}
              </span>
              <span className="text-red-600">Failed: {result.failed}</span>
            </div>

            {result.leads?.length > 0 && (
              <table className="w-full text-xs border">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-1 border">Company</th>
                    <th className="text-left p-1 border">Contact</th>
                    <th className="text-left p-1 border">Email</th>
                    <th className="text-left p-1 border">Source</th>
                    <th className="text-left p-1 border">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {result.leads.map((l) => (
                    <tr key={l.id}>
                      <td className="p-1 border">{l.companyName}</td>
                      <td className="p-1 border">{l.contactName}</td>
                      <td className="p-1 border">{l.email}</td>
                      <td className="p-1 border">{l.source}</td>
                      <td className="p-1 border">
                        {formatMoney(l.estimatedValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {result.failures?.length > 0 && (
              <table className="w-full text-xs border">
                <thead>
                  <tr className="bg-red-50">
                    <th className="text-left p-1 border">Row</th>
                    <th className="text-left p-1 border">Company</th>
                    <th className="text-left p-1 border">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {result.failures.map((f, i) => (
                    <tr key={i}>
                      <td className="p-1 border">{f.row}</td>
                      <td className="p-1 border">{f.companyName || "—"}</td>
                      <td className="p-1 border text-red-600">{f.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <DialogFooter>
          {preview && !result && (
            <Button variant="outline" onClick={reset}>
              Choose different file
            </Button>
          )}
          <Button variant="outline" onClick={close}>
            {result ? "Done" : "Cancel"}
          </Button>
          {preview && !result && (
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Confirm import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
/* =========================================================
Export DIALOG
========================================================= */

function ExportDialog({ open, onOpenChange }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const blob = await leadsApi.exportExcel({
        ...(fromDate ? { fromDate } : {}),
        ...(toDate ? { toDate } : {}),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "leads.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      onOpenChange(false);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Export leads</DialogTitle>
          <DialogDescription>Leave blank for all time.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>From date</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>To date</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   ACTIVITIES DIALOG — follow-up history for a lead
========================================================= */

function ActivitiesDialog({ open, onOpenChange, lead }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["leads", lead?.id, "activities"],
    queryFn: () => leadsApi.activities(lead.id),
    enabled: open && !!lead,
  });

  const activities = data?.items ?? [];

  const history = [...parseHistory(lead?.followUpHistory)].sort(
    (a, b) => new Date(b.loggedAt) - new Date(a.loggedAt),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Follow-up activities</DialogTitle>
          <DialogDescription>
            {lead ? `History for ${lead.companyName}.` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[28rem] overflow-y-auto space-y-4 py-2">
          {history.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Next follow-up date history ({history.length})
              </p>

              {history.map((h, i) => (
                <div
                  key={`${h.date}-${i}`}
                  className="border rounded-md p-3 space-y-1 bg-slate-50"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Set for: {formatDate(h.date)}</span>
                    <span>Logged: {formatDate(h.loggedAt)}</span>
                  </div>
                  {h.notes && (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {h.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Activity log
            </p>

            {isLoading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading…
              </div>
            )}

            {isError && (
              <p className="text-sm text-red-600 text-center py-4">
                Failed to load activities.
              </p>
            )}

            {!isLoading && !isError && activities.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No follow-up activity logged yet.
              </p>
            )}

            {activities.map((a) => (
              <div key={a.id} className="border rounded-md p-3 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="uppercase font-medium">{label(a.type)}</span>
                  <span>{formatDate(a.completedAt || a.createdAt)}</span>
                </div>
                {a.subject && (
                  <p className="text-sm font-medium text-slate-900">
                    {a.subject}
                  </p>
                )}
                {a.notes && (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {a.notes}
                  </p>
                )}
                {a.dueAt && (
                  <p className="text-xs text-muted-foreground">
                    Due: {formatDate(a.dueAt)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   LEADS PAGE
========================================================= */

export default function LeadsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [stageTarget, setStageTarget] = useState(null);
  const [convertTarget, setConvertTarget] = useState(null);
  const [followUpTarget, setFollowUpTarget] = useState(null);
  const [activitiesTarget, setActivitiesTarget] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("");
  const [followUpFilter, setFollowUpFilter] = useState(""); // "", "overdue", "today", "upcoming", "none"
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const extraParams = {
    ...(sourceFilter ? { source: sourceFilter } : {}),
    ...(followUpFilter ? { followUp: followUpFilter } : {}),
  };
  const deleteMutation = useMutation({
    mutationFn: (id) => leadsApi.remove(id),
    onSuccess: () => {
      toast.success("Lead deleted");
      qc.invalidateQueries({ queryKey: ["leads"] });
      setDeleteTarget(null);
    },
    onError: (e) => {
      console.error("Lead delete error:", e);
      toast.error(apiError(e));
    },
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }) => leadsApi.setStage(id, stage),
    onSuccess: () => {
      toast.success("Stage updated");
      qc.invalidateQueries({ queryKey: ["leads"] });
      setStageTarget(null);
    },
    onError: (e) => {
      toast.error(apiError(e));
      setStageTarget(null);
    },
  });

  const toggleLeadSelection = (id) => {
    setSelectedLeadIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  };

  const toggleAllLeads = (leads) => {
    const ids = leads.map((lead) => lead.id);

    setSelectedLeadIds((current) => {
      const allSelected = ids.every((id) => current.includes(id));

      if (allSelected) {
        return current.filter((id) => !ids.includes(id));
      }

      return [...new Set([...current, ...ids])];
    });
  };
  const convertMutation = useMutation({
    mutationFn: (id) =>
      leadsApi.convert(id, {
        legalName: convertTarget.companyName,
        tradeName: convertTarget.companyName,
        type: "BUSINESS",
        email: convertTarget.email || null,
        phone: convertTarget.phone || null,
        currencyCode: "INR",
        paymentTermDays: 30,
        creditLimit: 0,
        segment: "SMB",
        taxTreatment: "REGISTERED",
      }),
    onSuccess: () => {
      toast.success("Lead converted to customer");
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      setConvertTarget(null);
    },
    onError: (e) => {
      console.error("Lead conversion error:", e);
      toast.error(apiError(e));
      setConvertTarget(null);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      const results = await Promise.allSettled(
        ids.map((id) => leadsApi.remove(id)),
      );

      const failed = results.filter((result) => result.status === "rejected");

      if (failed.length > 0) {
        return {
          total: ids.length,
          deleted: ids.length - failed.length,
          failed: failed.length,
        };
      }

      return {
        total: ids.length,
        deleted: ids.length,
        failed: 0,
      };
    },

    onSuccess: (result) => {
      if (result.failed === 0) {
        toast.success(
          `${result.deleted} lead${
            result.deleted === 1 ? "" : "s"
          } deleted successfully`,
        );
      } else {
        toast.warning(`${result.deleted} deleted, ${result.failed} failed`);
      }

      setSelectedLeadIds([]);
      setBulkDeleteOpen(false);

      qc.invalidateQueries({
        queryKey: ["leads"],
      });
    },

    onError: (error) => {
      console.error("Bulk lead delete error:", error);

      toast.error(apiError(error));
    },
  });
  const columns = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={false}
          onChange={() => {}}
          className="h-4 w-4"
          aria-label="Select all leads"
        />
      ),
      render: (l) => (
        <input
          type="checkbox"
          checked={selectedLeadIds.includes(l.id)}
          onChange={(e) => {
            e.stopPropagation();
            toggleLeadSelection(l.id);
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4"
          aria-label={`Select ${l.companyName}`}
        />
      ),
    },
    {
      key: "companyName",
      header: "Lead",
      render: (l) => (
        <div className="leading-tight">
          <p className="font-medium text-slate-900">{l.companyName}</p>
          <p className="text-xs text-muted-foreground">{l.contactName}</p>
        </div>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (l) => (
        <span className="capitalize">{label(l.source).toLowerCase()}</span>
      ),
    },
    {
      key: "estimatedValue",
      header: "Est. value",
      align: "right",
      render: (l) => formatMoney(l.estimatedValue),
    },
    {
      key: "stage",
      header: "Stage",
      render: (l) => <StatusBadge status={l.stage} />,
    },
    {
      key: "nextFollowUpAt",
      header: "Next follow-up",
      render: (l) => formatDate(l.nextFollowUpAt),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (l) => (
        <div className="flex items-center justify-end gap-1">
          <Protected permission="lead.update">
            <Button
              variant="ghost"
              size="icon"
              title="Log follow-up"
              onClick={(e) => {
                e.stopPropagation();
                setFollowUpTarget(l);
              }}
            >
              <PhoneCall className="h-4 w-4" />
            </Button>
          </Protected>

          <Button
            variant="ghost"
            size="icon"
            title="View activities"
            className="relative"
            onClick={(e) => {
              e.stopPropagation();
              setActivitiesTarget(l);
            }}
          >
            <History className="h-4 w-4" />
            {!!l.activityCount && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-medium text-white">
                {l.activityCount}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <Protected permission="lead.update">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/leads/${l.id}/edit`);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit lead
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>Move stage</DropdownMenuLabel>

                {(STAGE_TRANSITIONS[l.stage] || []).map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStageTarget({ lead: l, stage: s });
                    }}
                  >
                    {label(s)}
                  </DropdownMenuItem>
                ))}
                {STAGE_TRANSITIONS[l.stage]?.length === 0 && (
                  <DropdownMenuItem disabled>
                    No transitions available
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setConvertTarget(l);
                  }}
                >
                  <ArrowRightCircle className="h-4 w-4 mr-2" />
                  Convert to customer
                </DropdownMenuItem>
              </Protected>

              <Protected permission="lead.delete">
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(l);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete lead
                </DropdownMenuItem>
              </Protected>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const filterToolbar = (
    <div className="flex items-center gap-2">
      <select
        className="h-9 rounded-md border px-2 text-sm"
        value={sourceFilter}
        onChange={(e) => setSourceFilter(e.target.value)}
      >
        <option value="">All sources</option>

        {SOURCES.map((s) => (
          <option key={s} value={s}>
            {label(s)}
          </option>
        ))}
      </select>

      <select
        className="h-9 rounded-md border px-2 text-sm"
        value={followUpFilter}
        onChange={(e) => setFollowUpFilter(e.target.value)}
      >
        <option value="">Any follow-up</option>
        <option value="overdue">Overdue</option>
        <option value="today">Due today</option>
        <option value="upcoming">Upcoming</option>
        <option value="none">Not scheduled</option>
      </select>

      {selectedLeadIds.length > 0 && (
        <>
          <span className="text-sm text-muted-foreground ml-2">
            {selectedLeadIds.length} selected
          </span>

          <Protected permission="lead.delete">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
          </Protected>
        </>
      )}
    </div>
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="The CRM pipeline — new prospects through to won or lost."
        crumbs={[{ label: "Sales" }, { label: "Leads" }]}
        actions={
          <Protected permission="lead.create">
            <Button variant={"download"} onClick={() => setExportOpen(true)}>
              <DownloadCloud className="h-4 w-4" />
              Export Lead
            </Button>{" "}
            <Button variant={"upload"} onClick={() => setImportOpen(true)}>
              <UploadCloud className="h-4 w-4" />
              Import Lead
            </Button>
            <Button onClick={() => router.push("/leads/new")}>
              <Plus className="h-4 w-4" />
              New lead
            </Button>
          </Protected>
        }
      />

      <ResourceList
        queryKey={["leads"]}
        fetcher={leadsApi.list}
        columns={columns}
        extraParams={extraParams}
        toolbar={filterToolbar}
        searchPlaceholder="Search leads… (min 3 chars)"
        emptyTitle="No leads yet"
      />
      <FollowUpDialog
        open={!!followUpTarget}
        onOpenChange={(open) => !open && setFollowUpTarget(null)}
        lead={followUpTarget}
      />

      <ActivitiesDialog
        open={!!activitiesTarget}
        onOpenChange={(open) => !open && setActivitiesTarget(null)}
        lead={activitiesTarget}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget ? `Delete ${deleteTarget.companyName}?` : ""}
        description="This action will delete the lead. This cannot be undone."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />

      <ConfirmDialog
        open={!!stageTarget}
        onOpenChange={(open) => !open && setStageTarget(null)}
        title={
          stageTarget
            ? `Move ${stageTarget.lead.companyName} to ${label(stageTarget.stage)}?`
            : ""
        }
        confirmLabel="Move"
        loading={stageMutation.isPending}
        onConfirm={() =>
          stageTarget &&
          stageMutation.mutate({
            id: stageTarget.lead.id,
            stage: stageTarget.stage,
          })
        }
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!bulkDeleteMutation.isPending) {
            setBulkDeleteOpen(open);
          }
        }}
        title={`Delete ${selectedLeadIds.length} selected leads?`}
        description={`This will permanently delete ${
          selectedLeadIds.length
        } selected lead${
          selectedLeadIds.length === 1 ? "" : "s"
        }. This action cannot be undone.`}
        confirmLabel="Delete Selected"
        loading={bulkDeleteMutation.isPending}
        onConfirm={() => {
          if (selectedLeadIds.length > 0) {
            bulkDeleteMutation.mutate(selectedLeadIds);
          }
        }}
      />
      <ConfirmDialog
        open={!!convertTarget}
        onOpenChange={(open) => !open && setConvertTarget(null)}
        title={
          convertTarget
            ? `Convert ${convertTarget.companyName} to a customer?`
            : ""
        }
        description="Creates a customer account linked to this lead."
        confirmLabel="Convert"
        loading={convertMutation.isPending}
        onConfirm={() =>
          convertTarget && convertMutation.mutate(convertTarget.id)
        }
      />

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </div>
  );
}
