# Notification Service (port 4015) — drop-in

Realtime (Socket.IO) + email/SMS, driven by domain events from every service.

## DB + client
```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS erp_notification CHARACTER SET utf8mb4;"
cd services/notification-service && npm install && npx prisma generate && npx prisma migrate dev --name init_notification
```

## ecosystem.config.js (already appended in the combined bundle)
`erp-notification-service` + `erp-notification-worker`. Note: this service wraps
Express in a raw `http.createServer` so Socket.IO can share the port — same
port (4015) serves both REST and `/socket.io`.

Root `.env` already has `NOTIFICATION_SERVICE_URL=http://127.0.0.1:4015`; gateway
maps `notifications` -> `/notifications`. Socket.IO is **not** proxied through
the gateway by default — clients connect directly to
`http://127.0.0.1:4015/socket.io` (or your reverse proxy needs a WebSocket-aware
route for it).

## Realtime client usage
```js
const socket = io('http://127.0.0.1:4015');
socket.emit('identify', { userId, role }); // joins user:<id> and role:<role> rooms
socket.on('notification', (n) => { /* show toast */ });
```

## Email / SMS
Disabled by default (`EMAIL_ENABLED=false`, `SMS_ENABLED=false`) so the service
runs cleanly with no external accounts. Fill in `SMTP_*` + `EMAIL_ENABLED=true`
for email (nodemailer). SMS is a provider-agnostic stub in
`src/providers/sms.provider.js` — wire in your gateway (MSG91/Twilio/etc.) and
set `SMS_PROVIDER` + `SMS_API_KEY` + `SMS_ENABLED=true`.

## Event fan-in
Subscribes to a wide set of topic patterns (sales.*, purchase.*, quality.*,
inventory.stock.low/out, finance.*, shipment.*, warehouse.bin.blocked, etc. —
see `src/constants/index.js SUBSCRIBED_PATTERNS`). Each event is mapped to a
title/message/category/priority/channels via `src/services/template.service.js`;
unmapped events still get a generic system notice so nothing is silently
dropped. Recipient is the event's carried user id (assignedTo/inspectorId/
requestedBy) if present, else a best-effort role room (sales/purchase/quality/
warehouse/finance/shipment), else a broadcast.

Retention: read notifications older than `RETENTION_DAYS` (default 90) are
purged nightly (`RETENTION_SCAN_CRON`).

Endpoints (RBAC notifications.*): / (list/create), /unread-count,
/mark-all-read, /preferences (get/put), /:id, /:id/read.
