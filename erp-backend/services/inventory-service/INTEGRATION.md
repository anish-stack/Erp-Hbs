# Inventory Service (port 4009) — drop-in

Extract this folder into `erp-backend/services/` so you get
`erp-backend/services/inventory-service/`.

## 1. Root `.env` — already done
`INVENTORY_SERVICE_URL=http://127.0.0.1:4009` is already present, and the
gateway registry already lists `inventory` -> `/inventory`. No gateway edit needed.

## 2. Create DB + generate client
```bash
# XAMPP MySQL, create the schema
mysql -u root -e "CREATE DATABASE IF NOT EXISTS erp_inventory CHARACTER SET utf8mb4;"

cd services/inventory-service
npm install                 # workspace install from repo root also works
npx prisma generate
npx prisma migrate dev --name init_inventory
```

## 3. Add to ecosystem.config.js
Paste these two objects inside the `apps: [ ... ]` array (after the purchase
worker block), then `pm2 restart ecosystem.config.js`:

```js
    {
      name: 'erp-inventory-service', cwd: './services/inventory-service', script: 'src/server.js',
      instances: process.env.INVENTORY_INSTANCES || 2, exec_mode: 'cluster', max_memory_restart: '512M',
      autorestart: true, watch: false, kill_timeout: 10000,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'inventory-service', RUN_WORKERS_INLINE: 'false' },
      env_production: { NODE_ENV: 'production', SERVICE_NAME: 'inventory-service', RUN_WORKERS_INLINE: 'false' },
      error_file: './logs/pm2-error.log', out_file: './logs/pm2-out.log', merge_logs: true, time: true
    },
    {
      name: 'erp-inventory-worker', cwd: './services/inventory-service', script: 'src/queues/worker.js',
      instances: 1, exec_mode: 'fork', max_memory_restart: '512M', autorestart: true, watch: false, kill_timeout: 15000,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'inventory-worker' },
      env_production: { NODE_ENV: 'production', SERVICE_NAME: 'inventory-worker' },
      error_file: './logs/pm2-worker-error.log', out_file: './logs/pm2-worker-out.log', merge_logs: true, time: true
    },
```

## 4. Set a default warehouse (optional until Warehouse service exists)
Warehouse service (4010) isn't built yet. Until then, either pass `warehouseId`
on every receipt/issue, OR set `DEFAULT_WAREHOUSE_ID=<any-uuid>` in
`services/inventory-service/.env`. `warehouseId` is treated as a plain cross-
service id (no FK), same as `partId`.

## Event contracts
Publishes: `inventory.stock.updated`, `inventory.receipt.posted`,
`inventory.issue.posted`, `inventory.stock.low`, `inventory.stock.out`,
`inventory.reservation.created|released|failed`, `inventory.adjustment.posted`,
`inventory.lot.expiring`.

Consumes: `sales.order.cancelled|lost` (auto-releases reservations by ref),
`shipment.dispatched` (informational). GRN stock-in is NOT event-driven because
`purchase.grn.created` carries no line detail — Purchase/GRN completion (or the
employee panel) must `POST /api/v1/inventory/receipts` with full lines. Idempotent
per GRN: a `refType=GRN` receipt for the same `refId` is rejected on the 2nd call.

## Key endpoints (all under /api/v1/inventory, RBAC: inventory.*)
- GET  /stats | /low-stock | /availability?partId&warehouseId&quantity
- GET  /stock | /stock/:id | /stock/by-part/:partId | PUT /stock/:id/reorder
- POST /receipts | /issues | /transfers
- GET  /movements | /lots | /lots/:id
- GET/POST /reservations | POST /reservations/:id/release | /fulfill
- GET/POST /adjustments | /:id (get/put) | submit | approve | reject | post
