# Shipment Service (port 4014) — drop-in

Pick / pack / dispatch tracking for sales orders.

## DB + client
```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS erp_shipment CHARACTER SET utf8mb4;"
cd services/shipment-service && npm install && npx prisma generate && npx prisma migrate dev --name init_shipment
```

## ecosystem.config.js (already appended in the combined bundle)
`erp-shipment-service` + `erp-shipment-worker` blocks, same pattern as other services
(cwd `./services/shipment-service`, ports via `.env`).

Root `.env` already has `SHIPMENT_SERVICE_URL=http://127.0.0.1:4014`; gateway maps
`shipment` -> `/shipment`.

## Flow
`sales.order.confirmed` -> auto-creates a **PENDING** shipment mirroring unshipped
order lines (carries each line's `reservationId`) -> raises Warehouse **PICK**
tasks (`AUTO_CREATE_PICK_TASKS`) -> pick -> pack -> **dispatch**: converts each
line's Inventory reservation into an actual stock issue (reservation fulfil;
falls back to a direct issue if no reservation), fails hard if Inventory
rejects it -> emits `shipment.dispatched` with shipped lines, which **Sales**
consumes to roll order status to PARTIALLY_FULFILLED / FULFILLED.

## Events
Publishes: shipment.created|picking|picked|packed|dispatched|delivered|cancelled.
Consumes: sales.order.confirmed.

Endpoints (RBAC shipment.*): /stats, / (list/create), /from-order,
/:id, /:id/pick-tasks, /:id/pick, /:id/pack, /:id/dispatch, /:id/deliver, /:id/cancel.
