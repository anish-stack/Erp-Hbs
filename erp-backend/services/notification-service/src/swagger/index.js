'use strict';
const { swagger } = require('@erp/shared');
const config = require('../config');
const base = `${config.basePath}/notifications`;
const idParam = [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }];

const paths = {
  [base]: {
    get: { tags: ['Notifications'], summary: "List the caller's notifications (filter read/category/type)", responses: { 200: { description: 'Fetched' } } },
    post: { tags: ['Notifications'], summary: 'Send a notification directly', description: 'Provide recipientId (specific user), audienceRole (role room), or neither for a broadcast. Fans out across the requested channels (IN_APP via Socket.IO, EMAIL, SMS).', responses: { 201: { description: 'Sent' } } }
  },
  [`${base}/unread-count`]: { get: { tags: ['Notifications'], summary: 'Unread count for the caller (cached 30s)', responses: { 200: { description: 'Fetched' } } } },
  [`${base}/mark-all-read`]: { post: { tags: ['Notifications'], summary: 'Mark all of the caller\'s notifications read', responses: { 200: { description: 'Updated' } } } },
  [`${base}/preferences`]: {
    get: { tags: ['Preferences'], summary: 'Get the caller\'s channel preferences', responses: { 200: { description: 'Fetched' } } },
    put: { tags: ['Preferences'], summary: 'Update channel toggles, contact details, muted types', responses: { 200: { description: 'Updated' } } }
  },
  [`${base}/{id}`]: { get: { tags: ['Notifications'], summary: 'Notification detail with delivery attempts', parameters: idParam, responses: { 200: { description: 'Fetched' } } } },
  [`${base}/{id}/read`]: { post: { tags: ['Notifications'], summary: 'Mark one notification read', parameters: idParam, responses: { 200: { description: 'Updated' } } } }
};

function buildDocument() {
  return swagger.buildBaseDocument({
    title: 'ERP Notification Service',
    description: 'Realtime (Socket.IO) and email/SMS notifications driven by domain events from every other service (sales, purchase, quality, inventory, finance, shipment, warehouse). Connect a Socket.IO client to /socket.io and emit `identify` with { userId, role } to join your rooms.',
    version: config.version,
    tags: [{ name: 'Notifications', description: 'In-app/email/SMS notifications' }, { name: 'Preferences', description: 'Per-user channel preferences' }],
    paths,
    components: {}
  });
}
module.exports = { buildDocument, swaggerUiOptions: swagger.swaggerUiOptions };
