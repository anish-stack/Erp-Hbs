'use strict';

const { prisma } = require('../config/prisma');

const LIST_SELECT = {
  id: true,
  code: true,
  companyName: true,
  contactName: true,
  email: true,
  phone: true,
  designation: true,

  source: true,
  stage: true,

  estimatedValue: true,
  currencyCode: true,
  probability: true,

  ownerId: true,
  nextFollowUpAt: true,
  lastContactedAt: true,

  followUpHistory: true,

  city: true,
  state: true,
  country: true,

  lostReason: true,
  convertedAt: true,
  convertedToId: true,

  tags: true,
  notes: true,

  createdAt: true,
  updatedAt: true,

  _count: {
    select: {
      activities: true
    }
  }
};
class LeadRepository {
  static async paginate({ where, skip, take, orderBy }) {
    const [items, total] = await prisma.$transaction([
      prisma.lead.findMany({ where, skip, take, orderBy, select: LIST_SELECT }),
      prisma.lead.count({ where })
    ]);
    return { items, total };
  }

  static async findById(id) {
    return prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
        stageLogs: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
    });
  }

  static async findByCode(code) {
    return prisma.lead.findFirst({ where: { code, deletedAt: null } });
  }

  static async create(data, actorId) {
    return prisma.lead.create({ data: { ...data, createdBy: actorId, updatedBy: actorId } });
  }

  static async update(id, data, actorId) {
    return prisma.lead.update({ where: { id }, data: { ...data, updatedBy: actorId } });
  }

  static async softDelete(id, actorId) {
    return prisma.lead.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actorId } });
  }

  static async logStage(data) {
    return prisma.leadStageLog.create({ data });
  }

  static async pipelineSummary() {
    return prisma.lead.groupBy({
      by: ['stage'],
      where: { deletedAt: null },
      _count: { _all: true },
      _sum: { estimatedValue: true }
    });
  }

  static async dueFollowUps(before) {
    return prisma.lead.findMany({
      where: {
        deletedAt: null,
        nextFollowUpAt: { lte: before },
        stage: { notIn: ['WON', 'LOST'] }
      },
      select: { id: true, code: true, companyName: true, ownerId: true, nextFollowUpAt: true, stage: true }
    });
  }

  static async staleLeads(cutoff) {
    return prisma.lead.findMany({
      where: {
        deletedAt: null,
        stage: { notIn: ['WON', 'LOST'] },
        OR: [{ lastContactedAt: { lt: cutoff } }, { lastContactedAt: null, createdAt: { lt: cutoff } }]
      },
      select: { id: true, code: true, companyName: true, ownerId: true, stage: true }
    });
  }

  static async byOwner(ownerId, query) {
    return prisma.lead.findMany({
      where: { ownerId, deletedAt: null, ...(query.stage ? { stage: query.stage } : {}) },
      orderBy: { createdAt: 'desc' },
      select: LIST_SELECT
    });
  }

  static get LIST_SELECT() {
    return LIST_SELECT;
  }
}

module.exports = LeadRepository;
