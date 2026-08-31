"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

import { salesApi } from "@/lib/api/services";

export default function QuotationPdfPage() {
  const { id } = useParams();
  const router = useRouter();

  const [objectUrl, setObjectUrl] = useState(null);

  const {
    data: blob,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["quotations", id, "pdf"],
    queryFn: async () => {
      const result = await salesApi.quotationPdf(id);

      // Guard: if the "blob" is actually a JSON error body, surface the real message
      if (result.type && result.type.includes("json")) {
        const text = await result.text();
        let message = "Failed to generate PDF";
        try {
          const parsed = JSON.parse(text);
          message = parsed.message || parsed.error || message;
        } catch {
          // ignore parse failure, use default message
        }
        throw new Error(message);
      }

      if (!result.type || !result.type.includes("pdf")) {
        throw new Error(`Unexpected response type: ${result.type || "unknown"}`);
      }

      return result;
    },
    enabled: !!id,
    retry: false,
  });


useEffect(() => {
  if (!blob) return;

  // Check first bytes for %PDF- signature
  blob.slice(0, 8).text().then((header) => {
    console.log("PDF header bytes:", header);
    // Valid PDF must start with "%PDF-1." or similar
  });

  const pdfBlob = new Blob([blob], { type: "application/pdf" });
  const url = URL.createObjectURL(pdfBlob);
  setObjectUrl(url);

  return () => URL.revokeObjectURL(url);
}, [blob]);

  const handleDownload = async () => {
    try {
      const downloadBlob = await salesApi.quotationPdf(id, true);
      const pdfBlob = new Blob([downloadBlob], { type: "application/pdf" });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quotation-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err?.message || "Download failed");
    }
  };

  const handleBack = () => {
    router.push("/sales/quotations");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotation PDF"
        description="Preview, print, or download this quotation."
      >
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <Button type="button" onClick={handleDownload} disabled={isLoading || isError}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </PageHeader>

      {isLoading && (
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Generating PDF...
          </div>
        </div>
      )}

      {isError && (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <p className="font-medium text-red-900">Unable to load PDF</p>
          <p className="text-sm text-red-700">{error?.message || "Something went wrong"}</p>
          <Button variant="outline" onClick={handleBack}>
            Back to quotations
          </Button>
        </div>
      )}

      {!isLoading && !isError && objectUrl && (
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <iframe src={objectUrl} title="Quotation PDF" className="h-[85vh] w-full" />
        </div>
      )}
    </div>
  );
}