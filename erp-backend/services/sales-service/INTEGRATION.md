# Sales Service (port 4012) — drop-in

Extract into `erp-backend/services/`.

## DB + client
```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS erp_sales CHARACTER SET utf8mb4;"
cd services/sales-service && npm install && npx prisma generate && npx prisma migrate dev --name init_sales
```

## ecosystem.config.js (paste in apps[])
```js
    {
      name: 'erp-sales-service', cwd: './services/sales-service', script: 'src/server.js',
      instances: process.env.SALES_INSTANCES || 2, exec_mode: 'cluster', max_memory_restart: '512M',
      autorestart: true, watch: false, kill_timeout: 10000,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'sales-service', RUN_WORKERS_INLINE: 'false' },
      env_production: { NODE_ENV: 'production', SERVICE_NAME: 'sales-service', RUN_WORKERS_INLINE: 'false' },
      error_file: './logs/pm2-error.log', out_file: './logs/pm2-out.log', merge_logs: true, time: true
    },
    {
      name: 'erp-sales-worker', cwd: './services/sales-service', script: 'src/queues/worker.js',
      instances: 1, exec_mode: 'fork', max_memory_restart: '512M', autorestart: true, watch: false, kill_timeout: 15000,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'sales-worker' },
      env_production: { NODE_ENV: 'production', SERVICE_NAME: 'sales-worker' },
      error_file: './logs/pm2-worker-error.log', out_file: './logs/pm2-worker-out.log', merge_logs: true, time: true
    },
```
Root `.env` already has `SALES_SERVICE_URL=http://127.0.0.1:4012`; gateway maps `sales` -> `/sales`.

## Wiring
- Set `DEFAULT_WAREHOUSE_ID` (same warehouse id used by Inventory/Warehouse) or pass
  `warehouseId` per order. Confirm needs a warehouse to reserve against.
- Depends on **CRM** (customer validate, GET /api/v1/customers/:id), **Master** (parts),
  **Inventory** (reserve/release). All already running in the stack.

## Flow
Quotation (DRAFT -> SENT -> ACCEPTED) -> convert -> SalesOrder (DRAFT)
-> confirm => reserves stock per line in Inventory (refType SALES_ORDER),
   shortfall reported non-blocking + `sales.order.reservation_shortfall`.
Shipment dispatch (`shipment.dispatched` event, carrying orderId + lines)
=> shippedQty updated, status rolls PARTIALLY_FULFILLED / FULFILLED.
Cancel => releases reservations + emits `sales.order.cancelled`
(Inventory consumer auto-releases by ref too).

## Events
Publishes: sales.quotation.created|sent|accepted|converted,
sales.order.created|confirmed|cancelled|partially_fulfilled|fulfilled|closed|reservation_shortfall.
Consumes: shipment.dispatched.

Endpoints (RBAC sales.*): /stats, /quotations (list/create/:id/put/send/accept/reject/convert),
/orders (list/create/:id/put/confirm/cancel/close).
