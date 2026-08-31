"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  BriefcaseBusiness,
  MapPin,
  IndianRupee,
  Target,
  Tags,
  FileText,
  Users,
  Loader2,
  Save,
  ChevronRight,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { leadsApi, masterApi } from "@/lib/api/services";
import { apiError } from "@/lib/api/client";
import { formatMoney } from "@/lib/utils";
import { SearchableSelect } from "./searchable-select";

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

const PROBABILITIES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

const EMPTY_FORM = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  designation: "",

  source: "OTHER",
  stage: "NEW",

  estimatedValue: "",
  currencyCode: "INR",
  probability: "10",

  categoryIds: [],
  city: "",
  state: "",
  country: "India",

  ownerId: "",

  nextFollowUpAt: "",

  tags: "",
  notes: "",
};

const humanize = (value) => {
  if (!value) return "";

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const dateTimeLocal = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);

  return local.toISOString().slice(0, 16);
};

function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-primary/5 text-primary">
        <Icon className="h-4 w-4" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>

        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, children, description }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>

      {children}

      {description && (
        <p className="text-[11px] text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export default function LeadForm({ mode = "create", leadId }) {
  const router = useRouter();
  const qc = useQueryClient();

  const isEdit = mode === "edit";

  const [form, setForm] = useState(EMPTY_FORM);

  /*
   * Load existing lead when editing.
   *
   * If your leadsApi.get() is named differently, change this one line.
   */
  const {
    data: lead,
    isLoading: loadingLead,
    isError: leadError,
  } = useQuery({
    queryKey: ["leads", leadId],
    queryFn: () => leadsApi.get(leadId),
    enabled: isEdit && !!leadId,
  });

  const { data: categoriesResponse, isLoading: loadingCategories } = useQuery({
    queryKey: ["master", "categories"],
    queryFn: () => masterApi.categories(),
  });
  console.log(categoriesResponse);
  const categories = useMemo(() => {
    if (Array.isArray(categoriesResponse)) {
      return categoriesResponse;
    }

    if (Array.isArray(categoriesResponse?.items)) {
      return categoriesResponse.items;
    }

    return [];
  }, [categoriesResponse]);

  const categoryOptions = useMemo(() => {
    return categories
      .filter((category) => category.isActive)
      .map((category) => ({
        value: category.id,
        label:
          category.level > 0
            ? `${category.path.replaceAll("/", " → ")}`
            : category.name,
      }));
  }, [categories]);
  /*
   * Convert API lead into form state.
   */
  useEffect(() => {
    if (!isEdit || !lead) return;

    const item = lead?.data || lead;

    setForm({
      companyName: item.companyName || "",
      contactName: item.contactName || "",
      email: item.email || "",
      phone: item.phone || "",
      designation: item.designation || "",

      source: item.source || "OTHER",
      stage: item.stage || "NEW",

      estimatedValue:
        item.estimatedValue !== null && item.estimatedValue !== undefined
          ? String(item.estimatedValue)
          : "",

      currencyCode: item.currencyCode || "INR",

      probability:
        item.probability !== null && item.probability !== undefined
          ? String(item.probability)
          : "10",

  categoryIds: Array.isArray(item.categoryIds) ? item.categoryIds : [],
      city: item.city || "",
      state: item.state || "",
      country: item.country || "India",

      ownerId: item.ownerId || "",

      nextFollowUpAt: dateTimeLocal(item.nextFollowUpAt),

      tags: Array.isArray(item.tags) ? item.tags.join(", ") : item.tags || "",

      notes: item.notes || "",
    });
  }, [lead, isEdit]);

  const set = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  /*
   * Expected payload.
   *
   * System fields intentionally excluded:
   * id
   * code
   * followUpHistory
   * lastContactedAt
   * convertedAt
   * convertedToId
   * createdAt
   * updatedAt
   * deletedAt
   * createdBy
   * updatedBy
   *
   * Backend should manage those.
   */
  const payload = useMemo(() => {
    const tags = form.tags
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return {
      companyName: form.companyName.trim(),
      contactName: form.contactName.trim(),

      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      designation: form.designation.trim() || null,

      source: form.source || "OTHER",
      stage: form.stage || "NEW",

      estimatedValue:
        form.estimatedValue !== "" ? Number(form.estimatedValue) : null,

      currencyCode: form.currencyCode || "INR",

      probability: form.probability !== "" ? Number(form.probability) : 10,

      categoryIds: form.categoryIds,

      city: form.city.trim() || null,
      state: form.state.trim() || null,
      country: form.country.trim() || "India",

      ownerId: form.ownerId || null,

      nextFollowUpAt: form.nextFollowUpAt || null,

      tags,

      notes: form.notes.trim() || null,
    };
  }, [form]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        return leadsApi.update(leadId, payload);
      }

      return leadsApi.create(payload);
    },

    onSuccess: () => {
      toast.success(
        isEdit ? "Lead updated successfully" : "Lead created successfully",
      );

      qc.invalidateQueries({
        queryKey: ["leads"],
      });

      if (isEdit) {
        qc.invalidateQueries({
          queryKey: ["leads", leadId],
        });
      }

      router.push("/leads");
    },

    onError: (error) => {
      console.error(`Lead ${isEdit ? "update" : "create"} error:`, error);

      toast.error(apiError(error));
    },
  });

  const submit = (e) => {
    e.preventDefault();

    if (!form.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }

    if (!form.contactName.trim()) {
      toast.error("Contact name is required");
      return;
    }

    mutation.mutate();
  };

  if (isEdit && loadingLead) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading lead...
        </div>
      </div>
    );
  }

  if (isEdit && leadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-900">Unable to load this lead</p>

        <p className="mt-1 text-sm text-red-700">
          The lead may have been deleted or is temporarily unavailable.
        </p>

        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/leads")}
        >
          Back to leads
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* =====================================================
          BASIC INFORMATION
      ====================================================== */}

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b bg-slate-50/70">
          <SectionTitle
            icon={Building2}
            title="Basic Information"
            description="Primary company and contact details"
          />
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Company name" required>
              <Input
                value={form.companyName}
                onChange={(e) => set("companyName", e.target.value)}
                placeholder="e.g. Acme Electronics Pvt. Ltd."
              />
            </Field>

            <Field label="Contact person" required>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  className="pl-9"
                  value={form.contactName}
                  onChange={(e) => set("contactName", e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                />
              </div>
            </Field>

            <Field label="Email">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  type="email"
                  className="pl-9"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="contact@company.com"
                />
              </div>
            </Field>

            <Field label="Phone">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  className="pl-9"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
            </Field>

            <Field label="Designation">
              <div className="relative">
                <BriefcaseBusiness className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  className="pl-9"
                  value={form.designation}
                  onChange={(e) => set("designation", e.target.value)}
                  placeholder="e.g. Purchase Manager"
                />
              </div>
            </Field>

            <Field label="Country">
              <Input
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                placeholder="India"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          LOCATION
      ====================================================== */}

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b bg-slate-50/70">
          <SectionTitle
            icon={MapPin}
            title="Location"
            description="Where the prospect is located"
          />
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="City">
              <Input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="e.g. Delhi"
              />
            </Field>

            <Field label="State">
              <Input
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                placeholder="e.g. Haryana"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          SALES PIPELINE
      ====================================================== */}

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b bg-slate-50/70">
          <SectionTitle
            icon={Target}
            title="Sales Pipeline"
            description="Source, stage, value and conversion probability"
          />
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {/* Lead Source */}
            <Field label="Lead source">
              <SearchableSelect
                value={form.source}
                onChange={(value) => set("source", value)}
                options={SOURCES.map((source) => ({
                  value: source,
                  label: humanize(source),
                }))}
                placeholder="Select lead source"
                isClearable={false}
              />
            </Field>
            <Field label="Stage">
              <SearchableSelect
                value={form.stage}
                onChange={(value) => set("stage", value)}
                options={STAGES.map((stage) => ({
                  value: stage,
                  label: humanize(stage),
                }))}
                placeholder="Select stage"
                isClearable={false}
              />
            </Field>

            <Field label="Estimated value">
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-9"
                  value={form.estimatedValue}
                  onChange={(e) => set("estimatedValue", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </Field>
            <Field label="Currency">
              <SearchableSelect
                value={form.currencyCode}
                onChange={(value) => set("currencyCode", value)}
                options={[
                  {
                    value: "INR",
                    label: "INR — Indian Rupee",
                  },
                  {
                    value: "USD",
                    label: "USD — US Dollar",
                  },
                  {
                    value: "EUR",
                    label: "EUR — Euro",
                  },
                  {
                    value: "GBP",
                    label: "GBP — Pound",
                  },
                ]}
                placeholder="Select currency"
                isClearable={false}
              />
            </Field>

            <Field label="Probability">
              <SearchableSelect
                value={String(form.probability)}
                onChange={(value) => set("probability", value)}
                options={PROBABILITIES.map((value) => ({
                  value: String(value),
                  label: `${value}%`,
                }))}
                placeholder="Select probability"
                isClearable={false}
              />
            </Field>

            <Field label="Next follow-up">
              <Input
                type="datetime-local"
                value={form.nextFollowUpAt}
                onChange={(e) => set("nextFollowUpAt", e.target.value)}
              />
            </Field>

            <Field
              label="Owner ID"
            
              description="Leave empty to assign to the current user."
            >
              <div className="relative">
                <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  className="pl-9"
                  value={form.ownerId}
                  disabled={true}
                  onChange={(e) => set("ownerId", e.target.value)}
                  placeholder="User UUID"
                />
              </div>
            </Field>
          </div>

          {/* Value preview */}

          {form.estimatedValue && (
            <>
              <Separator className="my-6" />

              <div className="rounded-xl border border-primary/10 bg-primary/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Expected opportunity
                    </p>

                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {formatMoney(form.estimatedValue)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Probability</p>

                    <p className="text-lg font-semibold text-primary">
                      {form.probability}%
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* =====================================================
          CATEGORIES / TAGS
      ====================================================== */}

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b bg-slate-50/70">
          <SectionTitle
            icon={Tags}
            title="Classification"
            description="Categories and tags for filtering and reporting"
          />
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Categories"
              description="Select one or more categories for this lead."
            >
              <SearchableSelect
                value={form.categoryIds}
                onChange={(value) => set("categoryIds", value)}
                options={categoryOptions}
                placeholder={
                  loadingCategories
                    ? "Loading categories..."
                    : "Select categories"
                }
                isClearable
                isMulti
                isDisabled={loadingCategories}
              />
            </Field>

            <Field label="Tags" description="Enter tags separated by commas.">
              <Input
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="electronics, wholesale, priority"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          NOTES
      ====================================================== */}

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b bg-slate-50/70">
          <SectionTitle
            icon={FileText}
            title="Notes"
            description="Additional information about this prospect"
          />
        </CardHeader>

        <CardContent className="p-6">
          <Textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={6}
            maxLength={2000}
            placeholder="Add important details, requirements, discussions, objections, etc."
          />

          <div className="mt-2 flex justify-end text-xs text-muted-foreground">
            {form.notes.length}/2000
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          BOTTOM ACTIONS
      ====================================================== */}

      <div className="sticky bottom-4 z-20">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <p className="hidden text-sm text-muted-foreground sm:block">
            {isEdit
              ? "Review your changes before saving."
              : "Required fields are marked with *."}
          </p>

          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/leads")}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                mutation.isPending || !form.companyName || !form.contactName
              }
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {isEdit ? "Save Changes" : "Create Lead"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
