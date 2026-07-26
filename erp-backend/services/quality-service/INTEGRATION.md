# Quality Inspection Service (port 4011) — drop-in

Extract into `erp-backend/services/`.

## DB + client
```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS erp_quality CHARACTER SET utf8mb4;"
cd services/quality-service && npm install && npx prisma generate && npx prisma migrate dev --name init_quality
```

## ecosystem.config.js (paste in apps[])
```js
    {
      name: 'erp-quality-service', cwd: './services/quality-service', script: 'src/server.js',
      instances: process.env.QUALITY_INSTANCES || 2, exec_mode: 'cluster', max_memory_restart: '512M',
      autorestart: true, watch: false, kill_timeout: 10000,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'quality-service', RUN_WORKERS_INLINE: 'false' },
      env_production: { NODE_ENV: 'production', SERVICE_NAME: 'quality-service', RUN_WORKERS_INLINE: 'false' },
      error_file: './logs/pm2-error.log', out_file: './logs/pm2-out.log', merge_logs: true, time: true
    },
    {
      name: 'erp-quality-worker', cwd: './services/quality-service', script: 'src/queues/worker.js',
      instances: 1, exec_mode: 'fork', max_memory_restart: '512M', autorestart: true, watch: false, kill_timeout: 15000,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'quality-worker' },
      env_production: { NODE_ENV: 'production', SERVICE_NAME: 'quality-worker' },
      error_file: './logs/pm2-worker-error.log', out_file: './logs/pm2-worker-out.log', merge_logs: true, time: true
    },
```
Root `.env` already has `QUALITY_SERVICE_URL=http://127.0.0.1:4011`; gateway maps `quality` -> `/quality`.

## Flow
GRN received -> `POST /quality/inspections` (part, receivedQty, warehouseId, grnId).
start -> results -> complete(acceptedQty, rejectedQty, disposition).
On ACCEPT/USE_AS_IS the accepted qty is posted to **Inventory** (`POST /inventory/receipts`)
= available stock -> Warehouse auto-putaway fires. Emits `quality.inspection.passed|failed|partial`
(supplier scorecard listens). Set `AUTO_RECEIPT_ON_ACCEPT=false` to disable stock posting.

Endpoints (RBAC quality.*): /plans (crud), /stats, /inspections (list/create/:id),
/inspections/:id/start|results|complete|hold|cancel.
