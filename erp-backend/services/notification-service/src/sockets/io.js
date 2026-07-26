'use strict';

const { Server } = require('socket.io');
const { logger } = require('@erp/shared');
const config = require('../config');

let io = null;

/**
 * Initialises the Socket.IO server on top of the shared HTTP server.
 * Clients join a room per user (`user:<id>`) and, optionally, per role
 * (`role:<role>`) after authenticating with their JWT-derived identity
 * (sent once on connect via a `identify` event from the client).
 */
function init(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.socket.corsOrigin, methods: ['GET', 'POST'] },
    path: '/socket.io'
  });

  io.on('connection', (socket) => {
    logger.info('Socket connected: %s', socket.id);

    socket.on('identify', ({ userId, role } = {}) => {
      if (userId) socket.join(`user:${userId}`);
      if (role) socket.join(`role:${role}`);
      socket.emit('identified', { userId, role });
    });

    socket.on('disconnect', () => logger.info('Socket disconnected: %s', socket.id));
  });

  logger.info('Socket.IO server initialised');
  return io;
}

function getIO() {
  return io;
}

/** Emits to a specific user's room. */
function toUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, payload);
}

/** Emits to everyone subscribed to a role room (e.g. all finance users). */
function toRole(role, event, payload) {
  if (!io || !role) return;
  io.to(`role:${role}`).emit(event, payload);
}

/** Emits to every connected client (broadcast notifications). */
function toAll(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}

module.exports = { init, getIO, toUser, toRole, toAll };
