'use strict';

const { ApiError, utils, cache } = require('@erp/shared');
const { prisma } = require('../config/prisma');
const StockRepository = require('../repositories/stock.repository');
const ReservationRepository = require('../repositories/reservation.repository');
const publisher = require('../events/publisher');
const StockService = require('./stock.service');
const { postMovement } = require('./movement.service');
const valuation = require('./valuation.service');
const { MOVEMENT_TYPE, RESERVATION_STATUS, RESERVATION_OPEN, REF_TYPE, CACHE } = require('../constants');
const config = require('../config');

function shape(r) {
  return {
    id: r.id,
    partId: r.partId,
    warehouseId: r.warehouseId,
    quantity: String(r.quantity),
    fulfilledQty: String(r.fulfilledQty),
    outstanding: String(valuation.qty(Number(r.quantity) - Number(r.fulfilledQty))),
    status: r.status,
    refType: r.refType,
    refId: r.refId,
    refCode: r.refCode,
    expiresAt: r.expiresAt,
    releasedAt: r.releasedAt,
    fulfilledAt: r.fulfilledAt,
    createdAt: r.createdAt
  };
}

class ReservationService {
  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['createdAt', 'expiresAt'],
      defaultSortField: 'createdAt'
    });
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.partId ? { partId: query.partId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.refType ? { refType: query.refType } : {}),
      ...(query.refId ? { refId: query.refId } : {})
    };
    const { items, total } = await ReservationRepository.paginate({
      where,
      skip: pagination.skip,
      take: pagination.take
    });
    return { items: items.map(shape), total, page: pagination.page, limit: pagination.limit };
  }

  /** Soft-allocates stock: raises reserved, lowers available. onHand unchanged. */
  static async reserve(payload, user) {
    const warehouseId = await StockService.resolveWarehouse(payload.warehouseId);
    const qtyReq = valuation.qty(payload.quantity);
    if (qtyReq <= 0) throw ApiError.badRequest('Reservation quantity must be positive');

    const result = await prisma.$transaction(async (tx) => {
      const item = await StockRepository.findPosition(payload.partId, warehouseId, payload.binLocation || 'DEFAULT', tx);
      if (!item) throw ApiError.notFound('No stock position for this part and warehouse');

      if (Number(item.available) < qtyReq) {
        throw ApiError.conflict('Insufficient available stock to reserve', {
          available: String(item.available),
          requested: String(qtyReq)
        });
      }

      const newReserved = valuation.qty(Number(item.reserved) + qtyReq);
      await StockRepository.updateBalances(
        item.id,
        { reserved: newReserved, available: valuation.qty(Number(item.onHand) - newReserved), updatedBy: user.id },
        tx
      );

      await postMovement(tx, { ...item, reserved: newReserved }, {
        type: MOVEMENT_TYPE.RESERVE,
        quantity: qtyReq,
        unitCost: item.avgCost,
        refType: payload.refType || REF_TYPE.SALES_ORDER,
        refId: payload.refId,
        refCode: payload.refCode || null,
        reason: 'Stock reserved',
        actorId: user.id
      });

      const expiresAt =
        payload.expiresAt
          ? new Date(payload.expiresAt)
          : new Date(Date.now() + config.reservationTtlHours * 3600 * 1000);

      const reservation = await ReservationRepository.create({
        partId: payload.partId,
        warehouseId,
        stockItemId: item.id,
        quantity: qtyReq,
        status: RESERVATION_STATUS.ACTIVE,
        refType: payload.refType || REF_TYPE.SALES_ORDER,
        refId: payload.refId,
        refCode: payload.refCode || null,
        reason: payload.reason || null,
        expiresAt,
        createdBy: user.id
      });

      return { reservation, itemId: item.id };
    });

    await cache.del(CACHE.stock(result.itemId));
    await publisher.reserved(result.reservation, user.id);
    return shape(result.reservation);
  }

  static async release(id, user) {
    const reservation = await ReservationRepository.findById(id);
    if (!reservation) throw ApiError.notFound('Reservation not found');
    if (!RESERVATION_OPEN.includes(reservation.status)) {
      throw ApiError.conflict(`Reservation is already ${reservation.status}`);
    }
    return ReservationService.releaseInternal(reservation, user ? user.id : null, RESERVATION_STATUS.RELEASED);
  }

  static async releaseInternal(reservation, actorId, finalStatus) {
    const outstanding = valuation.qty(Number(reservation.quantity) - Number(reservation.fulfilledQty));

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.stockItem.findUnique({ where: { id: reservation.stockItemId } });
      if (item && outstanding > 0) {
        const newReserved = valuation.qty(Math.max(0, Number(item.reserved) - outstanding));
        await StockRepository.updateBalances(
          item.id,
          { reserved: newReserved, available: valuation.qty(Number(item.onHand) - newReserved), updatedBy: actorId },
          tx
        );
        await postMovement(tx, { ...item, reserved: newReserved }, {
          type: MOVEMENT_TYPE.RELEASE,
          quantity: outstanding,
          unitCost: item.avgCost,
          refType: reservation.refType,
          refId: reservation.refId,
          refCode: reservation.refCode,
          reason: `Reservation ${finalStatus.toLowerCase()}`,
          actorId
        });
      }
      return ReservationRepository.update(reservation.id, {
        status: finalStatus,
        releasedAt: new Date()
      });
    });

    if (reservation.stockItemId) await cache.del(CACHE.stock(reservation.stockItemId));
    await publisher.reservationReleased(updated, actorId);
    return shape(updated);
  }

  /** Converts a reservation into an actual issue (reserved -> out of stock). */
  static async fulfill(id, payload, user) {
    const reservation = await ReservationRepository.findById(id);
    if (!reservation) throw ApiError.notFound('Reservation not found');
    if (!RESERVATION_OPEN.includes(reservation.status)) {
      throw ApiError.conflict(`Reservation is already ${reservation.status}`);
    }

    const outstanding = valuation.qty(Number(reservation.quantity) - Number(reservation.fulfilledQty));
    const qtyFulfil = payload.quantity ? valuation.qty(payload.quantity) : outstanding;
    if (qtyFulfil <= 0 || qtyFulfil > outstanding) {
      throw ApiError.badRequest('Fulfilment quantity exceeds the outstanding reservation', {
        outstanding: String(outstanding)
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.stockItem.findUnique({ where: { id: reservation.stockItemId } });
      if (!item) throw ApiError.notFound('Stock position no longer exists');

      // Free the reserved portion, then issue it out of on-hand.
      const newReserved = valuation.qty(Math.max(0, Number(item.reserved) - qtyFulfil));
      await StockRepository.updateBalances(item.id, { reserved: newReserved }, tx);
      await StockService.consumeLots(tx, item.id, qtyFulfil);

      const posted = await postMovement(tx, { ...item, reserved: newReserved }, {
        type: MOVEMENT_TYPE.ISSUE,
        quantity: qtyFulfil,
        unitCost: item.avgCost,
        refType: reservation.refType,
        refId: reservation.refId,
        refCode: payload.refCode || reservation.refCode,
        reason: 'Reservation fulfilled',
        actorId: user.id
      });

      const newFulfilled = valuation.qty(Number(reservation.fulfilledQty) + qtyFulfil);
      const status =
        newFulfilled >= Number(reservation.quantity)
          ? RESERVATION_STATUS.FULFILLED
          : RESERVATION_STATUS.PARTIALLY_FULFILLED;

      const updated = await ReservationRepository.update(reservation.id, {
        fulfilledQty: newFulfilled,
        status,
        ...(status === RESERVATION_STATUS.FULFILLED ? { fulfilledAt: new Date() } : {})
      });

      return { reservation: updated, item: posted.item };
    });

    await cache.del(CACHE.stock(reservation.stockItemId), CACHE.lowStock());
    await StockService.checkReorder(result.item);
    return shape(result.reservation);
  }

  /** Releases every open reservation tied to a reference (e.g. a cancelled SO). */
  static async releaseByRef(refType, refId, actorId) {
    const open = await ReservationRepository.openForRef(refType, refId);
    for (const reservation of open) {
      await ReservationService.releaseInternal(reservation, actorId, RESERVATION_STATUS.RELEASED);
    }
    return { released: open.length };
  }

  static async sweepExpired() {
    const expired = await ReservationRepository.expiredActive(new Date());
    for (const reservation of expired) {
      await ReservationService.releaseInternal(reservation, null, RESERVATION_STATUS.EXPIRED);
    }
    return { expired: expired.length };
  }

  static shape = shape;
}

module.exports = ReservationService;
