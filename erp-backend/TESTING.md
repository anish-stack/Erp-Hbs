# ERP Backend — Testing & Run Guide

How a developer boots all 20 services locally, seeds data, and tests every
module end-to-end. Windows (XAMPP) is the reference; Linux/macOS notes inline.

---

## 0. Prerequisites (install once)

| Tool | Why | Check |
|------|-----|-------|
| Node.js >= 20 | runtime | `node -v` |
| MySQL 8 (XAMPP) | 20 databases | `mysql --version` |
| Redis 7 | cache + BullMQ | `redis-cli ping` -> `PONG` |
| RabbitMQ 3.12 | inter-service events | `http://localhost:15672` (guest/guest) |
| PM2 (`npm i -g pm2`) | run all services | `pm2 -v` |

Start XAMPP MySQL, Redis, and RabbitMQ before anything else. RabbitMQ user the
services expect: `erp` / `erp_password` (or edit `RABBITMQ_URL` in `.env`).

```bash
# create the rabbitmq user once
rabbitmqctl add_user erp erp_password
rabbitmqctl set_permissions -p / erp ".*" ".*" ".*"
```

---

## 1. Create the 20 databases

Each service owns its own schema (`erp_<name>`). One-liner:

```bash
for db in auth user role master supplier crm rfq purchase inventory warehouse \
  quality sales finance shipment notification report dashboard file audit gateway; do
  mysql -u root -e "CREATE DATABASE IF NOT EXISTS erp_$db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
done
```

> Gateway has no tables of its own but the DB is harmless to create. Default DSN
> is `mysql://root:@localhost:3306/erp_<name>` (empty XAMPP root password).

---

## 2. Install + generate Prisma clients

From repo root (npm workspaces):

```bash
npm install                      # installs every service + packages/shared
```

Then per service: generate client, run migrations. Fast loop:

```bash
for s in auth user role master supplier crm rfq purchase inventory warehouse \
  quality sales finance shipment notification report dashboard file audit; do
  echo "== $s =="
  ( cd services/$s-service && npx prisma generate && npx prisma migrate deploy )
done
```

`migrate deploy` applies committed migrations. First time on a fresh DB, if a
service has no migration yet, use `npx prisma migrate dev --name init` inside it.

---

## 3. Seed baseline data (order matters)

Only three services ship seeds, and they must run in this order — roles &
permissions first, then the admin user, then the parts catalog reference data:

```bash
npm run role:seed      # permissions matrix + default roles (admin, sales, purchase, warehouse, finance, quality)
npm run auth:seed      # default admin login  ->  admin@erp.local / Admin@12345
( cd services/master-service && npm run seed )   # UOMs, currencies, tax rates, categories
```

After seeding you have an **admin** account holding `*.*` (all permissions) — use
it to log in and create the other users/roles.

---

## 4. Boot everything

### Option A — PM2 (recommended, all 36 processes)

```bash
pm2 start ecosystem.config.js
pm2 status                 # all should be "online"
pm2 logs                   # tail everything
pm2 logs erp-sales-service # tail one
pm2 reload ecosystem.config.js   # after code change
pm2 delete all             # stop + remove
```

36 processes = 20 API services + 16 workers. Services **without** a worker:
role, master, dashboard, api-gateway. Everything else runs an `erp-<svc>-worker`
alongside its API (they consume RabbitMQ events / run BullMQ jobs).

### Option B — one service at a time (debugging)

```bash
npm run auth:dev           # single service
npm run auth:worker        # its worker in another terminal
# pattern: npm run <svc>:dev  /  npm run <svc>:worker
```

### Option C — Docker

```bash
npm run docker:up          # docker compose up -d --build
npm run docker:logs
npm run docker:down
```

---

## 5. Smoke test — is everything alive?

Every service exposes health on its own port (not through the gateway):

```
GET http://127.0.0.1:<port>/health/live    -> 200 {"status":"ok"}     (process up)
GET http://127.0.0.1:<port>/health/ready   -> 200 {...checks...}       (DB/Redis/RabbitMQ/upstreams ok)
```

Loop all ports:

```bash
for p in 4000 4001 4002 4003 4004 4005 4006 4007 4008 4009 4010 4011 4012 \
         4013 4014 4015 4016 4017 4018 4019; do
  printf "%s " $p; curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:$p/health/ready
done
```

Port map:

| Port | Service | Port | Service |
|------|---------|------|---------|
| 4000 | api-gateway | 4010 | warehouse |
| 4001 | auth | 4011 | quality |
| 4002 | user | 4012 | sales |
| 4003 | role | 4013 | finance |
| 4004 | master | 4014 | shipment |
| 4005 | supplier | 4015 | notification |
| 4006 | crm | 4016 | file |
| 4007 | rfq | 4017 | report |
| 4008 | purchase | 4018 | dashboard |
| 4009 | inventory | 4019 | audit |

Each service also serves Swagger at `http://127.0.0.1:<port>/docs` — the fastest
way to see exact request/response shapes and try endpoints by hand.

---

## 6. Get a token (everything else needs it)

All real calls go through the gateway (`:4000`) with a Bearer token.

```bash
# login
curl -s -X POST http://127.0.0.1:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@erp.local","password":"Admin@12345"}'
# -> { "data": { "accessToken":"...", "refreshToken":"...", "user":{...} } }

# save it
TOKEN="<paste accessToken>"
AUTH="Authorization: Bearer $TOKEN"

# confirm identity + permissions
curl -s http://127.0.0.1:4000/api/v1/auth/me -H "$AUTH"
curl -s http://127.0.0.1:4000/api/v1/auth/permissions -H "$AUTH"
```

The gateway decodes the JWT and forwards `x-user-id / x-user-role /
x-user-permissions` to downstream services — you never set those by hand when
going through the gateway.

---

## 7. Per-module manual test (happy path)

All paths are prefixed `http://127.0.0.1:4000/api/v1`. Send `-H "$AUTH"` on every
call. This walks the two flows that exercise almost every service.

### 7a. Reference data first

```
POST /parts                     create a part            -> partId
POST /suppliers                 create supplier          -> supplierId
POST /suppliers/:id/submit
POST /suppliers/:id/approve     supplier now APPROVED
POST /customers                 create customer          -> customerId
POST /warehouse                 create warehouse         -> warehouseId
POST /warehouse/:id/set-default
POST /warehouse/:id/bins/bulk   create bins
```

### 7b. Procure-to-pay (purchase -> GRN -> quality -> inventory -> warehouse)

```
POST /purchase                          create PO (supplierId + line partId)   -> poId
POST /purchase/:id/submit
POST /purchase/:id/approve
POST /purchase/:id/issue
POST /purchase/:poId/grns               receive goods                          -> grnId
# GRN triggers a quality inspection event:
GET  /quality/inspections               find the auto-created inspection        -> inspId
POST /quality/inspections/:id/start
POST /quality/inspections/:id/results   enter accepted/rejected qty
POST /quality/inspections/:id/complete  accepted qty -> Inventory receipt (event)
GET  /inventory/stock?partId=<partId>   onHand should now reflect accepted qty
GET  /warehouse/tasks                   putaway task auto-created (event)
```

**Verify:** `inventory/stock` `onHand` increased by accepted qty; a `PUTAWAY`
task exists in warehouse; audit log has entries.

### 7c. Order-to-cash (sales -> reserve -> invoice -> shipment -> dispatch)

```
POST /sales/quotations                  create quote (customerId + lines)      -> quoteId
POST /sales/quotations/:id/send
POST /sales/quotations/:id/accept
POST /sales/quotations/:id/convert      -> salesOrderId
POST /sales/orders/:id/confirm          reserves stock; may return "shortfalls"
GET  /inventory/reservations?refId=<orderId>   reservation exists
GET  /finance/invoices                  AR invoice auto-drafted (event)        -> invoiceId
GET  /shipment                          shipment auto-created (event)          -> shipmentId
POST /shipment/:id/pick-tasks
POST /shipment/:id/pick
POST /shipment/:id/pack
POST /shipment/:id/dispatch             reservation -> real stock issue (event)
GET  /sales/orders/:id                  fulfilment rolled forward (shipped qty up)
POST /finance/payments                  record payment against invoiceId
GET  /finance/invoices/:id              status -> PAID / PARTIALLY_PAID
```

**Verify:** reservation created on confirm; dispatch reduced `inventory/stock`
onHand; invoice `amountDue` dropped after payment; `dashboard/summary` moved.

### 7d. Cross-cutting

```
GET  /dashboard/summary                 role-aware widgets (cached 60s)
POST /reports/runs {"reportKey":"sales-orders-register","format":"XLSX"}   -> runId
GET  /reports/runs/:id                  poll until COMPLETED, then downloadPath
GET  /notifications                     in-app alerts fired by the flows above
GET  /notifications/unread-count
GET  /audit                             every state change is logged here
POST /files/upload  (multipart)         upload; note returned fileId
GET  /files/:id/download
```

---

## 8. Event-flow testing (RabbitMQ)

Most automation is event-driven. To watch it:

1. Open RabbitMQ UI -> `http://localhost:15672` -> **Exchanges** -> `erp.events`.
2. Trigger an action (e.g. confirm a sales order).
3. Watch message rates on the bound queues (each consuming service has one).
4. If a downstream effect didn't happen, check that service's worker log:
   `pm2 logs erp-<svc>-worker`.

Event chains to assert:
- `purchase.grn.completed` -> quality inspection created
- `quality.inspection.completed` -> inventory receipt + warehouse putaway task
- `sales.order.confirmed` -> finance AR invoice + shipment created
- `shipment.dispatched` -> inventory issue + sales fulfilment update
- `sales.order.cancelled` -> inventory reservation released
- `report.completed` -> notification to requester

---

## 9. What a developer writes (adding tests to a service)

No test runner is bundled yet — wire one per service. Convention:

```bash
cd services/<svc>-service
npm i -D jest supertest cross-env
```

`package.json`:
```json
"scripts": { "test": "cross-env NODE_ENV=test jest --runInBand" }
```

### Unit test (pure logic, no DB). Example: finance GST split.
```js
// services/finance-service/src/services/__tests__/tax.service.test.js
const { computeTax } = require('../tax.service');

test('intra-state splits CGST + SGST', () => {
  const r = computeTax({ taxable: 1000, ratePct: 18, placeOfSupply: '07', sellerState: '07' });
  expect(r.cgst).toBeCloseTo(90);
  expect(r.sgst).toBeCloseTo(90);
  expect(r.igst).toBe(0);
});

test('inter-state uses IGST', () => {
  const r = computeTax({ taxable: 1000, ratePct: 18, placeOfSupply: '29', sellerState: '07' });
  expect(r.igst).toBeCloseTo(180);
  expect(r.cgst).toBe(0);
});
```

### API test (route + validation + service) with supertest against the Express app.
```js
// services/sales-service/src/__tests__/orders.api.test.js
const request = require('supertest');
const createApp = require('../app');

const app = createApp();
// fake the gateway identity headers a real request would carry
const asUser = (r) => r
  .set('x-user-id', 'test-user')
  .set('x-user-role', 'admin')
  .set('x-user-permissions', Buffer.from(JSON.stringify(['*.*'])).toString('base64'));

test('rejects order with no lines (400 VALIDATION_ERROR)', async () => {
  const res = await asUser(request(app).post('/api/v1/sales/orders').send({ customerId: 'x' }));
  expect(res.status).toBe(400);
  expect(res.body.code).toBe('VALIDATION_ERROR');
});
```

### Mock cross-service calls
Services talk over HTTP via `src/clients/*.client.js`. In tests, mock the client
module so you don't need the other service running:
```js
jest.mock('../clients/inventory.client', () => ({
  reserve: jest.fn().mockResolvedValue({ id: 'resv-1' }),
  releaseByRef: jest.fn().mockResolvedValue({ released: 1 })
}));
```

### Test DB
Point `DATABASE_URL` at `erp_<svc>_test`, run `prisma migrate deploy` against it
in a Jest `globalSetup`, and truncate tables between tests. Keep unit tests
DB-free where possible — they're faster and cover the tricky math.

### What's worth testing per service (priority)
- **auth**: token issue/refresh/rotation, permission wildcard resolution.
- **finance**: GST split (intra vs inter-state), payment allocation across invoices.
- **inventory**: receipt/issue/transfer math, reservation reserve/release/fulfill.
- **sales / purchase**: line totals, discount + tax rollups, status-machine guards.
- **quality**: accept/reject split, disposition routing.
- **shipment**: lifecycle transitions, reservation -> issue on dispatch.
- **role**: permission matrix resolution.
- Everything else: validators reject bad input (400), auth gate returns 403,
  not-found returns 404 — the shared response-envelope contract.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|--------|--------------|-----|
| Service exits on boot | missing env (`requireAll` failed) | ensure `.env` has `DATABASE_URL`, `JWT_ACCESS_SECRET`, `RABBITMQ_URL` |
| `/health/ready` = 503 | DB/Redis/RabbitMQ down | start the dependency; read the `checks` block in the response |
| 401 on every call | expired/absent token | re-login, resend Bearer |
| 403 with valid token | role lacks permission | seed roles, or use admin (`*.*`) |
| Event effect missing | worker not running | `pm2 status`; start `erp-<svc>-worker` |
| Prisma "table doesn't exist" | migrations not applied | `npx prisma migrate deploy` in that service |
| Sales confirm returns `shortfalls` | not enough stock reserved | receive stock first (7b), then confirm |
| Report stuck at QUEUED | report worker down / File service down | check `erp-report-worker` + `:4016` health |
| RabbitMQ connection refused | user/vhost missing | create `erp` user (step 0) |

---

## 11. Quick reference — full local boot

```bash
# 0. deps up: MySQL (XAMPP), Redis, RabbitMQ
# 1. databases
for db in auth user role master supplier crm rfq purchase inventory warehouse quality sales finance shipment notification report dashboard file audit; do mysql -u root -e "CREATE DATABASE IF NOT EXISTS erp_$db CHARACTER SET utf8mb4;"; done
# 2. install + migrate
npm install
for s in auth user role master supplier crm rfq purchase inventory warehouse quality sales finance shipment notification report dashboard file audit; do ( cd services/$s-service && npx prisma generate && npx prisma migrate deploy ); done
# 3. seed
npm run role:seed && npm run auth:seed && ( cd services/master-service && npm run seed )
# 4. boot
pm2 start ecosystem.config.js && pm2 status
# 5. login (admin@erp.local / Admin@123) and start hitting :4000/api/v1
```
