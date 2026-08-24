"use strict";

const { randomUUID } = require("crypto");
const { ApiError, utils, cache } = require("@erp/shared");
const LeadRepository = require("../repositories/lead.repository");
const RelationRepository = require("../repositories/relation.repository");
const publisher = require("../events/publisher");
const {
  LEAD_STAGE,
  STAGE_TRANSITIONS,
  STAGE_PROBABILITY,
  CACHE,
} = require("../constants");

function decimal(v) {
  return v === null || v === undefined ? null : String(v);
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
    categoryIds:lead.categoryIds,
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

    const where = {
      deletedAt: null,
      ...(query.stage ? { stage: query.stage } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.search
        ? {
            OR: [
              { companyName: { contains: query.search } },
              { contactName: { contains: query.search } },
              { email: { contains: query.search } },
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
