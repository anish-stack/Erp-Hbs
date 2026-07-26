# Dashboard Service (port 4018) — drop-in

Role-aware widget aggregation, Redis-cached. No RabbitMQ needed (pure read
aggregator over other services' `/stats` endpoints).

## DB + client
```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS erp_dashboard CHARACTER SET utf8mb4;"
cd services/dashboard-service && npm install && npx prisma generate && npx prisma migrate dev --name init_dashboard
```
(The DB only stores each user's optional custom widget layout — everything
else is fetched live and cached in Redis.)

## ecosystem.config.js (already appended in the combined bundle)
`erp-dashboard-service` only — **no worker process**, this service has no queue.

Root `.env` already has `DASHBOARD_SERVICE_URL=http://127.0.0.1:4018`; gateway
maps `dashboard` -> `/dashboard`.

## Widgets (src/widgets/)
sales-summary, purchase-summary, inventory-health, quality-health,
finance-outstanding, shipment-pipeline — each wraps one service's `/stats`
(+ inventory also pulls `/low-stock` for a count). Every widget fetch is
wrapped so a downed upstream service degrades to `{available:false}` instead
of breaking the whole dashboard response.

## Role defaults (src/constants/index.js ROLE_WIDGETS)
admin/owner see all 6; sales/purchase/warehouse/finance/quality each get a
relevant 2-3. Override per request with `?widgets=key1,key2`, or save a
personal layout via `PUT /dashboard/layout`.

## Endpoints (RBAC dashboard.*)
`GET /dashboard/summary` (role-aware, cached `WIDGET_CACHE_TTL` seconds per
widget), `GET /dashboard/widgets` (catalog + role map), `GET /dashboard/widgets/:key`
(single widget), `GET`/`PUT /dashboard/layout` (per-user override).
