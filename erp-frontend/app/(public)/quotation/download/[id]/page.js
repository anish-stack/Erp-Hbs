"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { salesApi } from "@/lib/api/services";

const STATUS_META = {
  ACCEPTED: { label: "Accepted", color: "#1F7A4D" },
  REJECTED: { label: "Declined", color: "#B23B2E" },
  SENT: { label: "Awaiting response", color: "#5C6B75" },
  DRAFT: { label: "Draft", color: "#5C6B75" },
  EXPIRED: { label: "Expired", color: "#B23B2E" },
};

const money = (v, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(Number(v || 0));

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const PublicQuotationPage = () => {
  const params = useParams();
  const id = params?.id;

  const [quote, setQuote] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // "accept" | "reject" | null
  const [error, setError] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);

  useEffect(() => {
    if (!id) return;
    let objectUrl = null;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [view, blob] = await Promise.all([
          salesApi.PublicQuotationView(id),
          salesApi.PublicQuotationPdf(id),
        ]);

        setQuote(view?.data || null);
        objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setPdfUrl(objectUrl);
      } catch (err) {
        console.error("Quotation load error:", err);
        setError("This quotation couldn't be loaded. The link may be invalid or expired.");
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => objectUrl && URL.revokeObjectURL(objectUrl);
  }, [id]);

  const handleAccept = async () => {
    if (!id || actionLoading) return;
    try {
      setActionLoading("accept");
      setError("");
      await salesApi.PublicQuotationAccept(id);
      setQuote((q) => (q ? { ...q, status: "ACCEPTED" } : q));
    } catch (err) {
      console.error("Accept quotation error:", err);
      setError(err?.response?.data?.message || "Couldn't accept the quotation. Try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!id || actionLoading) return;
    try {
      setActionLoading("reject");
      setError("");
      await salesApi.PublicQuotationReject(id);
      setQuote((q) => (q ? { ...q, status: "REJECTED" } : q));
      setConfirmReject(false);
    } catch (err) {
      console.error("Reject quotation error:", err);
      setError(err?.response?.data?.message || "Couldn't reject the quotation. Try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = async () => {
    if (!id) return;
    try {
      const blob = await salesApi.PublicQuotationPdf(id, true);
      const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${quote?.code || "quotation"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download quotation error:", err);
      setError("Couldn't download the quotation.");
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F5F1] px-6 font-poppins">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-[#DDE3E7] border-t-[#132A3D]" />
          <p className="text-[15px] text-[#5C6B75]">Loading your quotation…</p>
        </div>
      </main>
    );
  }

  if (error && !quote) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F5F1] px-6 font-poppins">
        <div className="w-full max-w-sm rounded-md border border-[#DDE3E7] bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#B23B2E]/10">
            <svg className="h-5 w-5 text-[#B23B2E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-[#132A3D]">We couldn't open this</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#5C6B75]">{error}</p>
        </div>
      </main>
    );
  }

  const status = quote?.status;
  const isResponded = status === "ACCEPTED" || status === "REJECTED";
  const meta = STATUS_META[status] || STATUS_META.SENT;

  return (
    <main className="min-h-screen bg-white pb-28 font-poppins sm:pb-10">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[#DDE3E7] bg-[#F7F5F1]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-[17px] font-semibold leading-none text-[#132A3D]">Quotation</p>
            <p className="mt-1 text-xs text-[#5C6B75]">{quote?.code}</p>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-md border border-[#DDE3E7] bg-white px-3 py-2 text-[13px] font-medium text-[#132A3D] transition hover:border-[#132A3D]"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l4-4m-4 4l-4-4M5 21h14" />
            </svg>
            <span className="hidden sm:inline">Download PDF</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-6">
        {/* Summary card */}
        <div className="mb-5 overflow-hidden rounded-md border border-[#DDE3E7] bg-white">
          <div className="flex items-center justify-between border-b border-[#DDE3E7] bg-[#F7F5F1] px-5 py-3">
            <p className="text-sm font-medium text-[#132A3D]">{quote?.customerName}</p>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ color: meta.color, backgroundColor: `${meta.color}1A` }}
            >
              {meta.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-[#5C6B75]">Quote date</p>
              <p className="mt-0.5 text-sm font-medium text-[#132A3D]">{formatDate(quote?.quoteDate)}</p>
            </div>
            <div>
              <p className="text-xs text-[#5C6B75]">Valid until</p>
              <p className="mt-0.5 text-sm font-medium text-[#132A3D]">{formatDate(quote?.validUntil)}</p>
            </div>
            <div>
              <p className="text-xs text-[#5C6B75]">Tax</p>
              <p className="mt-0.5 text-sm font-medium text-[#132A3D]">{money(quote?.taxTotal, quote?.currencyCode)}</p>
            </div>
            <div>
              <p className="text-xs text-[#5C6B75]">Total</p>
              <p className="mt-0.5 text-sm font-semibold text-[#132A3D]">{money(quote?.grandTotal, quote?.currencyCode)}</p>
            </div>
          </div>
        </div>

        {/* Result banners */}
        {status === "ACCEPTED" && (
          <div className="mb-5 flex items-start gap-3 rounded-md border border-[#1F7A4D]/25 bg-[#1F7A4D]/8 p-4">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#1F7A4D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="text-sm font-medium text-[#132A3D]">Quotation accepted</p>
              <p className="mt-0.5 text-sm text-[#5C6B75]">We've recorded your acceptance. Our team will be in touch shortly.</p>
            </div>
          </div>
        )}

        {status === "REJECTED" && (
          <div className="mb-5 flex items-start gap-3 rounded-md border border-[#B23B2E]/25 bg-[#B23B2E]/8 p-4">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#B23B2E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div>
              <p className="text-sm font-medium text-[#132A3D]">Quotation declined</p>
              <p className="mt-0.5 text-sm text-[#5C6B75]">Your response has been recorded.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-md border border-[#B23B2E]/25 bg-[#B23B2E]/8 px-4 py-3 text-sm text-[#B23B2E]">
            {error}
          </div>
        )}

        {/* Document */}
        <div className="overflow-hidden rounded-md border border-[#DDE3E7] bg-white shadow-[0_1px_2px_rgba(19,42,61,0.06)]">
          {pdfUrl ? (
            <iframe src={pdfUrl} title="Quotation PDF" className="h-[70vh] min-h-[480px] w-full" />
          ) : (
            <div className="flex h-[480px] items-center justify-center">
              <p className="text-sm text-[#5C6B75]">PDF not available.</p>
            </div>
          )}
        </div>

        {/* Desktop / tablet actions */}
        {!isResponded && (
          <div className="mt-6 hidden items-center justify-between gap-4 rounded-md border border-[#DDE3E7] bg-white p-5 sm:flex">
            <div>
              <p className="text-[15px] font-medium text-[#132A3D]">Ready to respond?</p>
              <p className="mt-0.5 text-sm text-[#5C6B75]">Accept or decline this quotation below.</p>
            </div>
            <div className="flex shrink-0 gap-2">
              {!confirmReject ? (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmReject(true)}
                    disabled={!!actionLoading}
                    className="rounded-md border border-[#DDE3E7] px-4 py-2.5 text-sm font-medium text-[#5C6B75] transition hover:border-[#B23B2E] hover:text-[#B23B2E] disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={!!actionLoading}
                    className="rounded-md bg-[#1F7A4D] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#1a6941] disabled:opacity-60"
                  >
                    {actionLoading === "accept" ? "Accepting…" : "Accept quotation"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmReject(false)}
                    disabled={!!actionLoading}
                    className="rounded-md border border-[#DDE3E7] px-4 py-2.5 text-sm font-medium text-[#5C6B75]"
                  >
                    Go back
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={!!actionLoading}
                    className="rounded-md bg-[#B23B2E] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#9c3226] disabled:opacity-60"
                  >
                    {actionLoading === "reject" ? "Declining…" : "Confirm decline"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <p className="py-8 text-center text-xs text-[#5C6B75]">
          This is a public quotation link. No account or login required.
        </p>
      </div>

      {/* Mobile fixed action bar */}
      {!isResponded && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#DDE3E7] bg-white p-3 sm:hidden">
          {!confirmReject ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmReject(true)}
                disabled={!!actionLoading}
                className="flex-1 rounded-md border border-[#DDE3E7] py-3 text-sm font-medium text-[#5C6B75] disabled:opacity-50"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={!!actionLoading}
                className="flex-1 rounded-md bg-[#1F7A4D] py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                {actionLoading === "accept" ? "Accepting…" : "Accept"}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmReject(false)}
                disabled={!!actionLoading}
                className="flex-1 rounded-md border border-[#DDE3E7] py-3 text-sm font-medium text-[#5C6B75]"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={!!actionLoading}
                className="flex-1 rounded-md bg-[#B23B2E] py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                {actionLoading === "reject" ? "Declining…" : "Confirm decline"}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
};

export default PublicQuotationPage;