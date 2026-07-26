# Warehouse Service (port 4010) — drop-in

Extract into `erp-backend/services/` so you get
`erp-backend/services/warehouse-service/`.

## 1. Root `.env` — already done
`WAREHOUSE_SERVICE_URL=http://127.0.0.1:4010` is present and the gateway
registry already maps `warehouse` -> `/warehouse`. No gateway edit needed.

## 2. Create DB + generate client
```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS erp_warehouse CHARACTER SET utf8mb4;"

cd services/warehouse-service
npm install
npx prisma generate
npx prisma migrate dev --name init_warehouse
```

## 3. Add to ecosystem.config.js
Paste inside the `apps: [ ... ]` array (after the inventory worker block):

```js
    {
      name: 'erp-warehouse-service', cwd: './services/warehouse-service', script: 'src/server.js',
      instances: process.env.WAREHOUSE_INSTANCES || 2, exec_mode: 'cluster', max_memory_restart: '512M',
      autorestart: true, watch: false, kill_timeout: 10000,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'warehouse-service', RUN_WORKERS_INLINE: 'false' },
      env_production: { NODE_ENV: 'production', SERVICE_NAME: 'warehouse-service', RUN_WORKERS_INLINE: 'false' },
      error_file: './logs/pm2-error.log', out_file: './logs/pm2-out.log', merge_logs: true, time: true
    },
    {
      name: 'erp-warehouse-worker', cwd: './services/warehouse-service', script: 'src/queues/worker.js',
      instances: 1, exec_mode: 'fork', max_memory_restart: '512M', autorestart: true, watch: false, kill_timeout: 15000,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'warehouse-worker' },
      env_production: { NODE_ENV: 'production', SERVICE_NAME: 'warehouse-worker' },
      error_file: './logs/pm2-worker-error.log', out_file: './logs/pm2-worker-out.log', merge_logs: true, time: true
    },
```

## 4. Wire with Inventory (recommended)
1. Create your first warehouse: `POST /api/v1/warehouse` with a `code`.
2. Copy the returned `id` into `services/inventory-service/.env` as
   `DEFAULT_WAREHOUSE_ID=<that-id>` (or always pass `warehouseId` on inventory
   receipts/issues). Inventory's `warehouseId` is this service's warehouse `id`.
3. Add a RECEIVING zone and some bins (`/:id/bins/bulk`) so putaway tasks have
   somewhere to land.

## Cross-service flow (already wired)
`inventory.receipt.posted` -> Warehouse auto-creates a **PUTAWAY** task
(suggests a bin from putaway rules). Completing that task calls
`POST /inventory/transfers` (bin -> bin) so the stock physically lands in the
storage bin, and updates bin occupancy. Set `AUTO_PUTAWAY_TASKS=false` to
disable auto-seeding.

## Event contracts
Publishes: `warehouse.created|updated|activated|deactivated`,
`warehouse.bin.blocked`, `warehouse.task.created|assigned|completed`,
`warehouse.putaway.completed`, `warehouse.pick.completed`.
Consumes: `inventory.receipt.posted`.

## Endpoints (all under /api/v1/warehouse, RBAC: warehouse.*)
- Warehouses: GET / | POST / | /options | /stats | GET/PUT/DELETE /:id | /:id/activate|deactivate|set-default
- Zones: GET/POST /:id/zones | PUT/DELETE /zones/:zoneId
- Bins: GET/POST /:id/bins | POST /:id/bins/bulk | GET /:id/bins/suggest | GET/PUT/DELETE /bins/:binId | /bins/:binId/block|unblock
- Putaway: GET/POST /:id/putaway-rules | PUT/DELETE /putaway-rules/:ruleId | GET /:id/putaway/suggest
- Tasks: GET/POST /tasks | GET /tasks/:taskId | /tasks/:taskId/assign|start|complete|cancel
