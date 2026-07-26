# Finance Service (port 4013) — drop-in

AR + AP: GST invoices (CGST/SGST/IGST) and payments with allocation.

## DB + client
```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS erp_finance CHARACTER SET utf8mb4;"
cd services/finance-service && npm install && npx prisma generate && npx prisma migrate dev --name init_finance
```

## ecosystem.config.js (paste in apps[])
```js
    {
      name: 'erp-finance-service', cwd: './services/finance-service', script: 'src/server.js',
      instances: process.env.FINANCE_INSTANCES || 2, exec_mode: 'cluster', max_memory_restart: '512M',
      autorestart: true, watch: false, kill_timeout: 10000,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'finance-service', RUN_WORKERS_INLINE: 'false' },
      env_production: { NODE_ENV: 'production', SERVICE_NAME: 'finance-service', RUN_WORKERS_INLINE: 'false' },
      error_file: './logs/pm2-error.log', out_file: './logs/pm2-out.log', merge_logs: true, time: true
    },
    {
      name: 'erp-finance-worker', cwd: './services/finance-service', script: 'src/queues/worker.js',
      instances: 1, exec_mode: 'fork', max_memory_restart: '512M', autorestart: true, watch: false, kill_timeout: 15000,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'finance-worker' },
      env_production: { NODE_ENV: 'production', SERVICE_NAME: 'finance-worker' },
      error_file: './logs/pm2-worker-error.log', out_file: './logs/pm2-worker-out.log', merge_logs: true, time: true
    },
```
Root `.env` already has `FINANCE_SERVICE_URL=http://127.0.0.1:4013`; gateway maps `finance` -> `/finance`.
(This block is already appended in the combined bundle's ecosystem.config.js.)

## GST config (.env)
- `SELLER_STATE_CODE` (e.g. 07 = Delhi) and `SELLER_GSTIN`.
- Intra-state (invoice `placeOfSupply` == seller state, or null) -> CGST + SGST (half each).
- Inter-state (placeOfSupply != seller state) -> IGST (full rate).
- Totals rounded to the rupee; the difference is stored in `roundOff`.

## Flow
- **AR**: `sales.order.confirmed` -> auto-draft SALES invoice (`AUTO_INVOICE_ON_SALES_CONFIRM`,
  default on), or `POST /finance/invoices/from-sales-order`. issue -> record payment
  (partyType CUSTOMER = INBOUND) -> allocate -> invoice PAID.
- **AP**: `purchase.grn.completed` -> optional AP bill (`AUTO_BILL_ON_GRN_COMPLETE`,
  default off), or `POST /finance/invoices/from-purchase-order`. Pay supplier
  (partyType SUPPLIER = OUTBOUND).
- Payments allocate atomically across invoices; each invoice's amountPaid / amountDue /
  status recomputed. Overdue invoices flagged nightly (`OVERDUE_SCAN_CRON`).

## Events
Publishes: finance.invoice.created|issued|paid|cancelled|overdue, finance.payment.recorded.
Consumes: sales.order.confirmed, purchase.grn.completed.

Endpoints (RBAC finance.*): /stats, /payments/stats,
/invoices (list/create/from-sales-order/from-purchase-order/:id/issue/cancel),
/payments (list/create/:id).
