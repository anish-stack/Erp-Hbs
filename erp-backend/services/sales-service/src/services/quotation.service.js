"use strict";
const { ApiError, utils, cache, logger } = require("@erp/shared");

const QuotationRepository = require("../repositories/quotation.repository");
const MasterClient = require("../clients/master.client");
const CrmClient = require("../clients/crm.client");
const OrderService = require("./order.service");
const pricing = require("./pricing.service");
const publisher = require("../events/publisher");
const {
  QUOTATION_STATUS,
  QUOTATION_TRANSITIONS,
  CACHE,
} = require("../constants");
const config = require("../config");
const QuotationPdfService = require("./quotation-pdf.service");
const emailTemplates = require("../utils/emailTemplates");
const mailer = require("../utils/mailer"); // FIXED: import the whole mailer object, not destructured pieces

function dec(v) {
  return v === null || v === undefined ? null : String(v);
}
function shapeLine(l) {
  return {
    id: l.id,
    partId: l.partId,
    partCode: l.partCode,
    description: l.description,
    quantity: dec(l.quantity),
    manufacturer: l.manufacturer,
    unitPrice: dec(l.unitPrice),
    discountPct: dec(l.discountPct),
    taxRatePct: dec(l.taxRatePct),
    lineTotal: dec(l.lineTotal),
  };
}

function shape(q) {
  if (!q) return null;
  return {
    id: q.id,
    code: q.code,
    status: q.status,
    customerId: q.customerId,
    customerName: q.customerName,
    currencyCode: q.currencyCode,
    quoteDate: q.quoteDate,
    validUntil: q.validUntil,
    subtotal: dec(q.subtotal),
    discountTotal: dec(q.discountTotal),
    taxTotal: dec(q.taxTotal),
    grandTotal: dec(q.grandTotal),
    terms: q.terms,
    notes: q.notes,
    convertedOrderId: q.convertedOrderId,
    lines: q.lines ? q.lines.map(shapeLine) : undefined,
    lineCount: q._count ? q._count.lines : undefined,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}

function assertTransition(from, to) {
  const allowed = QUOTATION_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw ApiError.conflict(`Illegal quotation status change ${from} -> ${to}`);
  }
}

async function nextCode() {
  const year = new Date().getFullYear();
  let n = 0;
  try {
    n = await QuotationRepository.countYear(year);
  } catch (err) {
    logger?.warn?.("nextCode: countYear failed, defaulting to 0", {
      error: err.message,
    });
    n = 0;
  }
  return `QTN-${year}-${String(n + 1).padStart(5, "0")}`;
}

async function buildLines(rawLines, user) {
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    throw ApiError.badRequest("At least one line item is required");
  }

  const partIds = [...new Set(rawLines.map((l) => l.partId))];

  let results;
  try {
    results = await Promise.allSettled(
      partIds.map((id) => MasterClient.getPart(id, user)),
    );
  } catch (err) {
    logger?.error?.("buildLines: master lookup batch failed", {
      error: err.message,
    });
    throw ApiError.badRequest
      ? ApiError.badRequest("Failed to reach master data service")
      : ApiError.internal("Failed to reach master data service");
  }

  const missing = partIds.filter((id, i) => results[i].status === "rejected");
  if (missing.length) {
    throw ApiError.badRequest("Some parts do not exist in master data", {
      missing,
    });
  }

  const partMap = new Map();
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) partMap.set(partIds[i], r.value);
  });

  try {
    return rawLines.map((l) => {
      if (!l.partId) throw ApiError.badRequest("Line item missing partId");
      if (
        l.quantity === undefined ||
        l.quantity === null ||
        Number(l.quantity) <= 0
      ) {
        throw ApiError.badRequest(`Invalid quantity for part ${l.partId}`);
      }
      if (
        l.unitPrice === undefined ||
        l.unitPrice === null ||
        Number(l.unitPrice) < 0
      ) {
        throw ApiError.badRequest(`Invalid unitPrice for part ${l.partId}`);
      }

      const c = pricing.computeLine(l);
      const part = partMap.get(l.partId);
      return {
        partId: l.partId,
        partCode: l.partCode || (part ? part.code || part.partNumber : null),
        description: l.description || (part ? part.name : null),
        manufacturer:
          l.manufacturer || (part ? part.manufacturer?.name : null) || null,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPct: l.discountPct || 0,
        taxRatePct: l.taxRatePct || 0,
        lineTotal: c.lineTotal,
      };
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger?.error?.("buildLines: pricing computation failed", {
      error: err.message,
    });
    throw ApiError.badRequest("Failed to compute line pricing", {
      detail: err.message,
    });
  }
}

/** Builds public accept/download links and sends the "quotation sent" mail. Never throws. */
async function sendQuotationMail(q, user) {
  console.log("[mail] a: sendQuotationMail start", Date.now());

  let customer;
  try {
    customer = await CrmClient.getCustomer(q.customerId, user);
    console.log("[mail] b: CRM lookup done", Date.now());
  } catch (err) {
    logger?.error?.("sendQuotationMail: CRM lookup failed", {
      id: q.id,
      error: err.message,
    });
    return;
  }

  const to = customer?.email;
  if (!to) {
    logger?.warn?.("sendQuotationMail: customer has no email, skipping", {
      id: q.id,
      customerId: q.customerId,
    });
    return;
  }

  const base = config.appBaseUrl || config.publicBaseUrl || "";
  console.log(base);
  const links = {
    acceptUrl: `${base}/api/quotations/${q.id}/accept`,
    downloadUrl: `${base}/quotation/download/${q.id}?download=true`,
  };

  let full;
  try {
    full = shape(await QuotationRepository.findById(q.id));
    console.log("[mail] c: findById for mail body done", Date.now());
  } catch (err) {
    logger?.error?.("sendQuotationMail: findById for mail body failed", {
      id: q.id,
      error: err.message,
    });
    full = shape(q);
  }

  try {
    const { subject, html } = emailTemplates.quotationSent(full, links);
    console.log(
      "[mail] d: template built, calling mailer.sendMail",
      Date.now(),
    );
    await mailer.send({ to, subject, html });
    console.log("[mail] e: mailer.sendMail done", Date.now());
  } catch (err) {
    logger?.error?.("sendQuotationMail: mailer.send failed", {
      id: q.id,
      to,
      error: err.message,
    });
  }
}

class QuotationService {
  static async list(query) {
    try {
      const pagination = utils.pagination.buildPagination(query, {
        allowedSortFields: ["createdAt", "code", "grandTotal"],
        defaultSortField: "createdAt",
      });
      const where = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.customerId ? { customerId: query.customerId } : {}),
        ...(query.search
          ? {
              OR: [
                { code: { contains: query.search } },
                { customerName: { contains: query.search } },
              ],
            }
          : {}),
      };
      const { items, total } = await QuotationRepository.paginate({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: pagination.orderBy,
      });
      return {
        items: items.map(shape),
        total,
        page: pagination.page,
        limit: pagination.limit,
      };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      logger?.error?.("QuotationService.list failed", { error: err.message });
      throw ApiError.internal("Failed to fetch quotations");
    }
  }

  static async getById(id) {
    if (!id) throw ApiError.badRequest("Quotation id is required");

    let q;
    try {
      q = await QuotationRepository.findById(id);
    } catch (err) {
      logger?.error?.("QuotationService.getById query failed", {
        id,
        error: err.message,
      });
      throw ApiError.internal("Failed to fetch quotation");
    }

    if (!q) throw ApiError.notFound("Quotation not found");
    return shape(q);
  }

  static async create(payload, user) {
    if (!payload?.customerId) {
      throw ApiError.badRequest("customerId is required");
    }
    if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
      throw ApiError.badRequest("At least one line item is required");
    }

    let customer;
    try {
      customer = await CrmClient.getCustomer(payload.customerId, user);
    } catch (err) {
      logger?.warn?.("create: CRM lookup failed", {
        customerId: payload.customerId,
        error: err.message,
      });
      customer = null;
    }
    if (!customer) {
      throw ApiError.badRequest("Customer not found in CRM", {
        customerId: payload.customerId,
      });
    }

    const lines = await buildLines(payload.lines, user);
    const totals = pricing.computeTotals(lines);
    const validUntil = payload.validUntil
      ? new Date(payload.validUntil)
      : new Date(Date.now() + config.quotationValidDays * 86400 * 1000);

    if (Number.isNaN(validUntil.getTime())) {
      throw ApiError.badRequest("Invalid validUntil date");
    }

    let q;
    try {
      q = await QuotationRepository.create({
        code: await nextCode(),
        status: QUOTATION_STATUS.DRAFT,
        customerId: payload.customerId,
        customerName:
          customer.name || customer.legalName || payload.customerName || null,
        currencyCode: payload.currencyCode || "INR",
        validUntil,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
        terms: payload.terms || null,
        notes: payload.notes || null,
        createdBy: user.id,
        updatedBy: user.id,
        lines: { create: lines },
      });
    } catch (err) {
      logger?.error?.("create: repository write failed", {
        error: err.message,
      });
      throw ApiError.internal("Failed to create quotation");
    }

    try {
      await publisher.quotationCreated(q, user.id);
    } catch (err) {
      logger?.error?.("create: quotationCreated event publish failed", {
        quotationId: q.id,
        error: err.message,
      });
    }

    return shape(q);
  }

  static async update(id, payload, user) {
    if (!id) throw ApiError.badRequest("Quotation id is required");

    let q;
    try {
      q = await QuotationRepository.findById(id);
    } catch (err) {
      logger?.error?.("update: findById failed", { id, error: err.message });
      throw ApiError.internal("Failed to fetch quotation");
    }
    if (!q) throw ApiError.notFound("Quotation not found");
    if (q.status !== QUOTATION_STATUS.DRAFT) {
      throw ApiError.conflict("Only draft quotations can be edited");
    }

    let totals = {
      subtotal: q.subtotal,
      discountTotal: q.discountTotal,
      taxTotal: q.taxTotal,
      grandTotal: q.grandTotal,
    };

    if (payload.lines) {
      const lines = await buildLines(payload.lines, user);
      totals = pricing.computeTotals(lines);
      try {
        await QuotationRepository.replaceLines(id, lines);
      } catch (err) {
        logger?.error?.("update: replaceLines failed", {
          id,
          error: err.message,
        });
        throw ApiError.internal("Failed to update quotation lines");
      }
    }

    let updated;
    try {
      updated = await QuotationRepository.update(id, {
        customerName: payload.customerName ?? q.customerName,
        currencyCode: payload.currencyCode ?? q.currencyCode,
        validUntil: payload.validUntil
          ? new Date(payload.validUntil)
          : q.validUntil,
        terms: payload.terms ?? q.terms,
        notes: payload.notes ?? q.notes,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
        updatedBy: user.id,
      });
    } catch (err) {
      logger?.error?.("update: repository write failed", {
        id,
        error: err.message,
      });
      throw ApiError.internal("Failed to update quotation");
    }

    try {
      await cache.del(CACHE.quotation(id));
    } catch (err) {
      logger?.warn?.("update: cache invalidation failed", {
        id,
        error: err.message,
      });
    }

    return shape(updated);
  }

  static async setStatus(id, status, user, extra = {}) {
    console.log("[send] 1: setStatus start", Date.now());
    if (!id) throw ApiError.badRequest("Quotation id is required");

    let q;
    try {
      q = await QuotationRepository.findById(id);
      console.log("[send] 2: findById done", Date.now());
    } catch (err) {
      logger?.error?.("setStatus: findById failed", { id, error: err.message });
      throw ApiError.internal("Failed to fetch quotation");
    }
    if (!q) throw ApiError.notFound("Quotation not found");

    assertTransition(q.status, status);
    console.log("[send] 2b: assertTransition passed", Date.now());

    let updated;
    try {
      updated = await QuotationRepository.update(id, {
        status,
        updatedBy: user.id,
        ...extra,
      });
      console.log("[send] 3: update done", Date.now());
    } catch (err) {
      logger?.error?.("setStatus: repository write failed", {
        id,
        status,
        error: err.message,
      });
      throw ApiError.internal("Failed to update quotation status");
    }

    try {
      await cache.del(CACHE.quotation(id));
      console.log("[send] 4: cache.del done", Date.now());
    } catch (err) {
      logger?.warn?.("setStatus: cache invalidation failed", {
        id,
        error: err.message,
      });
    }

    try {
      if (status === QUOTATION_STATUS.SENT) {
        await publisher.quotationSent(updated, user.id);
        console.log("[send] 4b: publisher.quotationSent done", Date.now());
      }
      if (status === QUOTATION_STATUS.ACCEPTED) {
        await publisher.quotationAccepted(updated, user.id);
      }
    } catch (err) {
      logger?.error?.("setStatus: event publish failed", {
        id,
        status,
        error: err.message,
      });
    }

    if (status === QUOTATION_STATUS.SENT) {
      // Fire-and-forget — mail failure must not fail the status change.
      sendQuotationMail(updated, user).catch((err) => {
        logger?.error?.("setStatus: sendQuotationMail failed", {
          id,
          error: err.message,
        });
      });
    }

    console.log("[send] 5: about to return from setStatus", Date.now());
    return shape(updated);
  }

  static async send(id, user) {
    return QuotationService.setStatus(id, QUOTATION_STATUS.SENT, user);
  }

  static async accept(id, user) {
    return QuotationService.setStatus(id, QUOTATION_STATUS.ACCEPTED, user);
  }

  static async reject(id, user) {
    return QuotationService.setStatus(id, QUOTATION_STATUS.REJECTED, user);
  }

  /** Turns an accepted quotation into a draft sales order. */
  static async convert(id, payload, user) {
    if (!id) throw ApiError.badRequest("Quotation id is required");

    let q;
    try {
      q = await QuotationRepository.findById(id);
    } catch (err) {
      logger?.error?.("convert: findById failed", { id, error: err.message });
      throw ApiError.internal("Failed to fetch quotation");
    }
    if (!q) throw ApiError.notFound("Quotation not found");
    if (q.status !== QUOTATION_STATUS.ACCEPTED) {
      throw ApiError.conflict("Only an accepted quotation can be converted");
    }
    if (q.convertedOrderId) {
      throw ApiError.conflict("Quotation already converted", {
        orderId: q.convertedOrderId,
      });
    }

    let order;
    try {
      order = await OrderService.createFromQuotation(q, payload || {}, user);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      logger?.error?.("convert: order creation failed", {
        id,
        error: err.message,
      });
      throw ApiError.internal("Failed to create order from quotation");
    }

    let updated;
    try {
      updated = await QuotationRepository.update(id, {
        status: QUOTATION_STATUS.CONVERTED,
        convertedOrderId: order.id,
        updatedBy: user.id,
      });
    } catch (err) {
      logger?.error?.("convert: repository write failed", {
        id,
        orderId: order.id,
        error: err.message,
      });
      throw ApiError.internal(
        "Order was created but quotation could not be updated — manual reconciliation needed",
        { orderId: order.id },
      );
    }

    try {
      await publisher.quotationConverted(updated, order.id, user.id);
    } catch (err) {
      logger?.error?.("convert: event publish failed", {
        id,
        orderId: order.id,
        error: err.message,
      });
    }

    return { quotation: shape(updated), order };
  }

  static async expireDue() {
    let due = [];
    try {
      due = await QuotationRepository.expirable(new Date());
    } catch (err) {
      logger?.error?.("expireDue: expirable lookup failed", {
        error: err.message,
      });
      throw ApiError.internal("Failed to fetch expirable quotations");
    }

    let expired = 0;
    for (const q of due) {
      try {
        await QuotationRepository.update(q.id, {
          status: QUOTATION_STATUS.EXPIRED,
        });
        expired++;
      } catch (err) {
        logger?.error?.("expireDue: failed to expire quotation", {
          id: q.id,
          error: err.message,
        });
      }
    }

    return { expired };
  }

  static async renderPdf(id) {
    if (!id) throw ApiError.badRequest("Quotation id is required");

    let q;
    try {
      q = await QuotationRepository.findById(id);
    } catch (err) {
      logger?.error?.("renderPdf: findById failed", { id, error: err.message });
      throw ApiError.internal("Failed to fetch quotation");
    }
    if (!q) throw ApiError.notFound("Quotation not found");

    try {
      return await QuotationPdfService.renderBuffer(q);
    } catch (err) {
      logger?.error?.("renderPdf: PDF rendering failed", {
        id,
        error: err.message,
      });
      throw ApiError.internal("Failed to generate quotation PDF");
    }
  }

  static shape = shape;
}

module.exports = QuotationService;
