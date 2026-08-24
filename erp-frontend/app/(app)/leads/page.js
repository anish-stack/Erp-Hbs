"use client";

import { useEffect, useState } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import {
  MoreHorizontal,
  ArrowRightCircle,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  PhoneCall,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ResourceList } from "@/components/shared/resource-list";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Protected } from "@/components/shared/protected";

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

const STAGES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

const EMPTY_FORM = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  source: "OTHER",
  estimatedValue: "",
  city: "",
  notes: "",
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

  const columns = [
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

                {STAGES.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    disabled={l.stage === s}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStageTarget({ lead: l, stage: s });
                    }}
                  >
                    {label(s)}
                  </DropdownMenuItem>
                ))}

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="The CRM pipeline — new prospects through to won or lost."
        crumbs={[{ label: "Sales" }, { label: "Leads" }]}
        actions={
          <Protected permission="lead.create">
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
        searchPlaceholder="Search leads…"
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
    </div>
  );
}
