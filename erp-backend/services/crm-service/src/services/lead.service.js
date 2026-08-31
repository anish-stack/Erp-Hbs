"use strict";

const { randomUUID } = require("crypto");
const { ApiError, utils, cache } = require("@erp/shared");
const LeadRepository = require("../repositories/lead.repository");
const RelationRepository = require("../repositories/relation.repository");
const publisher = require("../events/publisher");
const XLSX = require("xlsx");
const {
  LEAD_STAGE,
  STAGE_TRANSITIONS,
  STAGE_PROBABILITY,
  CACHE,
} = require("../constants");

function decimal(v) {
  return v === null || v === undefined ? null : String(v);
}
function safeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function safeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

function shape(lead) {
  return {
    id: lead.id,
    code: lead.code,
    companyName: lead.companyName,
    contactName: lead.contactName,
    email: lead.email,
    phone: lead.phone,
    designation: lead.designation,
    source: lead.source,
    followUpHistory: lead.followUpHistory,
    stage: lead.stage,
    estimatedValue: decimal(lead.estimatedValue),
    currencyCode: lead.currencyCode,
    probability: lead.probability,
    weightedValue: lead.estimatedValue
      ? Number(
          (Number(lead.estimatedValue) * (lead.probability / 100)).toFixed(2),
        )
      : null,
    city: lead.city,
    state: lead.state,
    country: lead.country,
    ownerId: lead.ownerId,
    categoryIds: lead.categoryIds,
    nextFollowUpAt: lead.nextFollowUpAt,
    lastContactedAt: lead.lastContactedAt,
    lostReason: lead.lostReason,
    convertedAt: lead.convertedAt,
    convertedToId: lead.convertedToId,
    tags: lead.tags || [],
    notes: lead.notes,
    activityCount: lead._count ? lead._count.activities : undefined,
    activities: lead.activities,
    stageHistory: lead.stageLogs,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

function assertTransition(from, to) {
  const allowed = STAGE_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw ApiError.badRequest(`A lead cannot move from ${from} to ${to}`, {
      currentStage: from,
      allowedNext: allowed,
    });
  }
}

class LeadService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: [
        "createdAt",
        "companyName",
        "estimatedValue",
        "nextFollowUpAt",
      ],
      defaultSortField: "createdAt",
    });

    const now = new Date();

    // Start/end of today
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    /**
     * Follow-up filter
     */
    let followUpFilter = {};

    switch (query.followUp) {
      case "overdue":
        followUpFilter = {
          nextFollowUpAt: {
            not: null,
            lt: now,
          },
        };
        break;

      case "today":
        followUpFilter = {
          nextFollowUpAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        };
        break;

      case "upcoming":
        followUpFilter = {
          nextFollowUpAt: {
            not: null,
            gt: endOfToday,
          },
        };
        break;

      case "none":
        followUpFilter = {
          nextFollowUpAt: null,
        };
        break;

      default:
        followUpFilter = {};
        break;
    }

    const where = {
      deletedAt: null,

      ...(query.stage
        ? {
            stage: query.stage,
          }
        : {}),

      ...(query.source
        ? {
            source: query.source,
          }
        : {}),

      ...(query.ownerId
        ? {
            ownerId: query.ownerId,
          }
        : {}),

      ...followUpFilter,

      ...(query.search
        ? {
            OR: [
              {
                companyName: {
                  contains: query.search,
                },
              },
              {
                contactName: {
                  contains: query.search,
                },
              },
              {
                email: {
                  contains: query.search,
                },
              },
            ],
          }
        : {}),
    };

    const { items, total } = await LeadRepository.paginate({
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
  }

  static async getById(id) {
    const lead = await LeadRepository.findById(id);
    if (!lead) throw ApiError.notFound("Lead not found");
    return shape(lead);
  }

  static async create(payload, user) {
    const code = `LEAD-${Date.now().toString(36).toUpperCase()}-${randomUUID()
      .slice(0, 4)
      .toUpperCase()}`;

    console.log("user:", user);
    console.log("payload:", payload);

    const lead = await LeadRepository.create(
      {
        code,

        companyName: payload.companyName,
        contactName: payload.contactName,

        email: payload.email || null,
        phone: payload.phone || null,
        designation: payload.designation || null,

        source: payload.source || "OTHER",

        // Always force new leads to NEW
        stage: LEAD_STAGE.NEW,

        estimatedValue: payload.estimatedValue ?? null,
        currencyCode: payload.currencyCode || "INR",

        // Default probability for NEW stage
        probability: STAGE_PROBABILITY.NEW,

        categoryIds: payload.categoryIds || [],

        city: payload.city || null,
        state: payload.state || null,
        country: payload.country || "India",

        // Selected owner if provided,
        // otherwise logged-in user
        ownerId: payload.ownerId || user.id,

        assignedAt: new Date(),

        nextFollowUpAt: payload.nextFollowUpAt
          ? new Date(payload.nextFollowUpAt)
          : null,

        tags: payload.tags || [],

        notes: payload.notes || null,
      },
      user.id,
    );

    await LeadRepository.logStage({
      leadId: lead.id,
      fromStage: null,
      toStage: LEAD_STAGE.NEW,
      reason: "Lead created",
      actorId: user.id,
    });

    await cache.del(CACHE.pipeline());

    await publisher.leadCreated(lead, user.id);

    return shape(lead);
  }

  static async update(id, payload, user) {
    const existing = await LeadRepository.findById(id);
    if (!existing) throw ApiError.notFound("Lead not found");
    if (
      ["WON", "LOST"].includes(existing.stage) &&
      payload.stage === undefined
    ) {
      // Allow metadata edits even on closed leads (notes, tags) but not reopening via update().
    }

    const data = { ...payload };
    delete data.stage; // stage changes go through the dedicated transition endpoint
    if (data.nextFollowUpAt)
      data.nextFollowUpAt = new Date(data.nextFollowUpAt);

    const lead = await LeadRepository.update(id, data, user.id);
    await cache.del(CACHE.pipeline());
    return shape(lead);
  }

  static async remove(id, user) {
    const existing = await LeadRepository.findById(id);
    if (!existing) throw ApiError.notFound("Lead not found");
    await LeadRepository.softDelete(id, user.id);
    await cache.del(CACHE.pipeline());
    return { deleted: true };
  }

  /** Moves the lead one legal step along the 7-stage pipeline. */
  static async changeStage(id, toStage, { reason, lostReason } = {}, user) {
    const existing = await LeadRepository.findById(id);
    if (!existing) throw ApiError.notFound("Lead not found");

    assertTransition(existing.stage, toStage);

    if (toStage === "LOST" && !lostReason) {
      throw ApiError.badRequest("A reason is required to mark a lead as lost");
    }

    const data = {
      stage: toStage,
      probability: STAGE_PROBABILITY[toStage],
      lastContactedAt: new Date(),
    };

    if (toStage === "LOST") {
      data.lostReason = lostReason;
      data.nextFollowUpAt = null;
    }
    if (toStage === "CONTACTED" && existing.stage === "LOST") {
      data.lostReason = null; // revived
    }

    const lead = await LeadRepository.update(id, data, user.id);

    await LeadRepository.logStage({
      leadId: id,
      fromStage: existing.stage,
      toStage,
      reason: reason || lostReason || null,
      actorId: user.id,
    });
    await cache.del(CACHE.pipeline());
    await publisher.leadStageChanged(lead, existing.stage, user.id);

    return shape(lead);
  }

  static async logFollowUp(id, notes, nextFollowUpAt, dueAt, user) {
    const existing = await LeadRepository.findById(id);
    if (!existing) throw ApiError.notFound("Lead not found");

    const dueDate = dueAt ?? nextFollowUpAt;

    await RelationRepository.createActivity({
      leadId: id,
      type: "CALL",
      subject: "Follow-up logged",
      notes: notes || null,
      dueAt: dueDate ? new Date(dueDate) : null,
      completedAt: new Date(),
      createdBy: user.id,
    });

    // Build the running history array: existing dates + the new one.
    let history = [];
    try {
      history = existing.followUpHistory
        ? JSON.parse(existing.followUpHistory)
        : [];
    } catch {
      history = [];
    }

    if (nextFollowUpAt) {
      history.push({
        date: new Date(nextFollowUpAt).toISOString(),
        notes: notes || null,
        loggedAt: new Date().toISOString(),
        loggedBy: user.id,
      });
    }

    const lead = await LeadRepository.update(
      id,
      {
        lastContactedAt: new Date(),
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
        followUpHistory: JSON.stringify(history),
      },
      user.id,
    );

    return shape(lead);
  }
  static async pipeline() {
    return cache.remember(CACHE.pipeline(), 300, async () => {
      const rows = await LeadRepository.pipelineSummary();
      const byStage = Object.fromEntries(
        Object.keys(LEAD_STAGE).map((stage) => [stage, { count: 0, value: 0 }]),
      );

      for (const row of rows) {
        byStage[row.stage] = {
          count: row._count._all,
          value: Number(row._sum.estimatedValue || 0),
        };
      }

      const openStages = [
        "NEW",
        "CONTACTED",
        "QUALIFIED",
        "PROPOSAL",
        "NEGOTIATION",
      ];
      const openValue = openStages.reduce(
        (sum, stage) => sum + byStage[stage].value,
        0,
      );
      const openCount = openStages.reduce(
        (sum, stage) => sum + byStage[stage].count,
        0,
      );
      const winRate =
        byStage.WON.count + byStage.LOST.count > 0
          ? Number(
              (
                (byStage.WON.count / (byStage.WON.count + byStage.LOST.count)) *
                100
              ).toFixed(1),
            )
          : 0;

      return { byStage, openCount, openValue, winRate };
    });
  }

  static async myLeads(ownerId, query) {
    const leads = await LeadRepository.byOwner(ownerId, query);
    return leads.map(shape);
  }

  static async scanFollowUps() {
    const due = await LeadRepository.dueFollowUps(new Date());
    if (due.length) await publisher.followUpDue(due);
    return { due: due.length };
  }
static async importExcel(file, user) {
  if (!file) {
    throw ApiError.badRequest("Excel file is required");
  }

  const workbook = XLSX.read(file.buffer, {
    type: "buffer",
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw ApiError.badRequest("Excel sheet not found");
  }

  const worksheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: null,
    raw: false,
  });

  if (!rows.length) {
    throw ApiError.badRequest("Excel file is empty");
  }

  const created = [];
  const failed = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const excelRow = index + 2;

    try {
      // -------------------------------------------------------
      // Company Name
      // -------------------------------------------------------

      const companyName = String(
        row.companyName ||
          row["Company Name"] ||
          row.company ||
          row.Company ||
          "",
      ).trim();

      // IMPORTANT:
      // Validate before repository.create()
      if (!companyName) {
        throw new Error("Company Name is required");
      }

      // -------------------------------------------------------
      // Contact Name
      // -------------------------------------------------------

      const contactName = String(
        row.contactName ||
          row["Contact Name"] ||
          row.contact ||
          row.Contact ||
          "",
      ).trim();

      /*
       * If contactName is required in Prisma, don't send null.
       *
       * Either reject the row:
       */
      if (!contactName) {
        throw new Error("Contact Name is required");
      }

      // -------------------------------------------------------
      // Other fields
      // -------------------------------------------------------

      const email =
        row.email ||
        row.Email ||
        null;

      const phone =
        row.phone ||
        row.Phone ||
        null;

      const designation =
        row.designation ||
        row.Designation ||
        null;

      const source =
        row.source ||
        row.Source ||
        "OTHER";

      const estimatedValue = safeNumber(
        row.estimatedValue ||
          row["Estimated Value"],
      );

      const currencyCode =
        row.currencyCode ||
        row["Currency Code"] ||
        "INR";

      const city =
        row.city ||
        row.City ||
        null;

      const state =
        row.state ||
        row.State ||
        null;

      const country =
        row.country ||
        row.Country ||
        "India";

      const ownerId =
        row.ownerId ||
        row["Owner ID"] ||
        user.id;

      const nextFollowUpAt = safeDate(
        row.nextFollowUpAt ||
          row["Next Follow Up"],
      );

      const tags = row.tags
        ? String(row.tags)
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];

      const notes =
        row.notes ||
        row.Notes ||
        null;

      // -------------------------------------------------------
      // Generate lead code
      // -------------------------------------------------------

      const code =
        `LEAD-${Date.now()
          .toString(36)
          .toUpperCase()}-${randomUUID()
          .slice(0, 4)
          .toUpperCase()}`;

      // -------------------------------------------------------
      // Create Lead
      // -------------------------------------------------------

      const lead = await LeadRepository.create(
        {
          code,

          companyName,

          contactName,

          email,

          phone,

          designation,

          source,

          stage: LEAD_STAGE.NEW,

          estimatedValue,

          currencyCode,

          probability: STAGE_PROBABILITY.NEW,

          categoryIds: [],

          city,

          state,

          country,

          ownerId,

          assignedAt: new Date(),

          nextFollowUpAt,

          tags,

          notes,
        },
        user.id,
      );

      // -------------------------------------------------------
      // Stage History
      // -------------------------------------------------------

      await LeadRepository.logStage({
        leadId: lead.id,
        fromStage: null,
        toStage: LEAD_STAGE.NEW,
        reason: "Lead imported from Excel",
        actorId: user.id,
      });

      created.push(shape(lead));
    } catch (error) {
      // -------------------------------------------------------
      // Clean error message
      // -------------------------------------------------------

      let errorMessage = error?.message || "Import failed";

      /*
       * Convert Prisma's huge error into something useful.
       */
      if (
        errorMessage.includes(
          "Argument `contactName` must not be null",
        )
      ) {
        errorMessage = "Contact Name is required";
      }

      if (
        errorMessage.includes(
          "Argument `companyName` must not be null",
        )
      ) {
        errorMessage = "Company Name is required";
      }

      failed.push({
        row: excelRow,

        companyName:
          row.companyName ||
          row["Company Name"] ||
          row.company ||
          row.Company ||
          null,

        error: errorMessage,
      });
    }
  }

  // -------------------------------------------------------
  // Clear cache only if something was imported
  // -------------------------------------------------------

  if (created.length > 0) {
    await cache.del(CACHE.pipeline());
  }

  return {
    total: rows.length,
    imported: created.length,
    failed: failed.length,
    failures: failed,
    leads: created,
  };
}
  static async exportExcel(query = {}) {
    console.log(query)
    const where = {
      deletedAt: null,

      ...(query.stage
        ? {
            stage: query.stage,
          }
        : {}),

      ...(query.source
        ? {
            source: query.source,
          }
        : {}),

     

      ...(query.fromDate || query.toDate
        ? {
            createdAt: {
              ...(query.fromDate
                ? { gte: new Date(`${query.fromDate}T00:00:00.000Z`) }
                : {}),
              ...(query.toDate
                ? { lte: new Date(`${query.toDate}T23:59:59.999Z`) }
                : {}),
            },
          }
        : {}),

      ...(query.search
        ? {
            OR: [
              {
                companyName: {
                  contains: query.search,
                },
              },
              {
                contactName: {
                  contains: query.search,
                },
              },
              {
                email: {
                  contains: query.search,
                },
              },
            ],
          }
        : {}),
    };
    console.log(where)
    const leads = await LeadRepository.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    const rows = leads.map((lead) => ({
      ID: lead.id,
      Code: lead.code,
      "Company Name": lead.companyName,
      "Contact Name": lead.contactName,
      Email: lead.email,
      Phone: lead.phone,
      Designation: lead.designation,
      Source: lead.source,
      Stage: lead.stage,
      "Estimated Value": decimal(lead.estimatedValue),
      Currency: lead.currencyCode,
      Probability: lead.probability,
      "Weighted Value": lead.estimatedValue
        ? Number(
            (Number(lead.estimatedValue) * (lead.probability / 100)).toFixed(2),
          )
        : null,
      City: lead.city,
      State: lead.state,
      Country: lead.country,
      "Owner ID": lead.ownerId,
      "Next Follow Up": lead.nextFollowUpAt,
      "Last Contacted": lead.lastContactedAt,
      "Lost Reason": lead.lostReason,
      "Converted At": lead.convertedAt,
      "Converted To": lead.convertedToId,
      Tags: Array.isArray(lead.tags) ? lead.tags.join(", ") : "",
      Notes: lead.notes,
      "Created At": lead.createdAt,
      "Updated At": lead.updatedAt,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 25 },
      { wch: 30 },
      { wch: 25 },
      { wch: 30 },
      { wch: 18 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
      { wch: 12 },
      { wch: 15 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 30 },
      { wch: 40 },
      { wch: 22 },
      { wch: 22 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

    return XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });
  }

  static async scanStale(staleDays) {
    const cutoff = new Date(Date.now() - staleDays * 86400000);
    const stale = await LeadRepository.staleLeads(cutoff);
    if (stale.length) await publisher.leadStale(stale);
    return { stale: stale.length };
  }

  static shape = shape;
  static assertTransition = assertTransition;
}

module.exports = LeadService;
