# ERP Backend — Combined Bundle

Node.js microservices ERP for electronic-components trading.
Stack: Express, Prisma (MySQL), Redis, RabbitMQ, BullMQ, PM2.

## Services (20 built of 20) — ALL SERVICES COMPLETE

| Port | Service | DB | Status |
|------|---------|----|--------|
| 4000 | api-gateway | — | ✅ |
| 4001 | auth-service (+worker) | erp_auth | ✅ |
| 4002 | user-service (+worker) | erp_user | ✅ |
| 4003 | role-service | erp_role | ✅ |
| 4004 | master-service | erp_master | ✅ |
| 4005 | supplier-service (+worker) | erp_supplier | ✅ |
| 4006 | crm-service (+worker) | erp_crm | ✅ |
| 4007 | rfq-service (+worker) | erp_rfq | ✅ |
| 4008 | purchase-service (+worker) | erp_purchase | ✅ |
| 4009 | inventory-service (+worker) | erp_inventory | ✅ |
| 4010 | warehouse-service (+worker) | erp_warehouse | ✅ |
| 4011 | quality-service (+worker) | erp_quality | ✅ |
| 4012 | sales-service (+worker) | erp_sales | ✅ |
| 4016 | file-service (+worker) | erp_file | ✅ |
| 4019 | audit-service (+worker) | erp_audit | ✅ |
| 4013 | finance-service (+worker) | erp_finance | ✅ |
| 4014 | shipment-service (+worker) | erp_shipment | ✅ |
| 4015 | notification-service (+worker, Socket.IO) | erp_notification | ✅ |
| 4017 | report-service (+worker) | erp_report | ✅ |
| 4018 | dashboard-service (no worker) | erp_dashboard | ✅ |

Root `.env`, gateway registry, and `ecosystem.config.js` already list all 20 services
services (pending ones only mount at the gateway when their `*_SERVICE_URL` is set).

## First run
```bash
# 1. shared package
cd packages/shared && npm install && cd ../..

# 2. per-service install + prisma (each has its own DB)
for s in auth user role master supplier crm rfq purchase inventory warehouse quality sales finance shipment notification report dashboard file audit; do
  ( cd services/$s-service && npm install && npx prisma generate && npx prisma migrate deploy ) 2>/dev/null
done
# api-gateway has no prisma:
( cd services/api-gateway && npm install )

# 3. create databases (adjust host/user)
for db in auth user role master supplier crm rfq purchase inventory warehouse quality sales finance shipment notification report dashboard file audit; do
  mysql -u root -e "CREATE DATABASE IF NOT EXISTS erp_$db CHARACTER SET utf8mb4;"
done

# 4. bring up infra (Redis + RabbitMQ) then start everything
pm2 start ecosystem.config.js
pm2 logs
```
Gateway on http://127.0.0.1:4000. Per-service Swagger at `/docs`.

## New cross-service flows (this bundle)
- Purchase GRN receipt -> **POST /inventory/receipts** (stock in).
- **inventory.receipt.posted** -> Warehouse auto-creates a PUTAWAY task;
  completing it calls **POST /inventory/transfers** (bin -> bin).
- Quality inspection accept -> **POST /inventory/receipts** (available) ->
  Warehouse putaway; emits quality.inspection.passed|failed (supplier scorecard).
- Sales order confirm -> **POST /inventory/reservations** per line
  (refType SALES_ORDER); cancel emits **sales.order.cancelled** -> Inventory
  auto-releases; **shipment.dispatched** -> Sales rolls fulfilment.
- **sales.order.confirmed** -> Finance auto-drafts a GST **AR invoice**; payments
  allocate across invoices and roll status to PAID. Purchase bills (AP) draft from POs.
- **sales.order.confirmed** -> Shipment auto-creates a shipment + Warehouse PICK tasks;
  **dispatch** converts Inventory reservations into real issues and emits
  **shipment.dispatched** back to Sales for fulfilment roll-up.
- Notification fans in nearly every event above (sales/purchase/quality/inventory/
  finance/shipment/warehouse/report) and pushes over Socket.IO + optional email/SMS.
- **Report** pulls paginated data live from any service, renders XLSX/CSV, and
  stores it via **File** service; emits report.completed/failed (Notification alerts the requester).
- **Dashboard** aggregates every service's `/stats` into role-aware widgets, Redis-cached.

Each service ships an INTEGRATION.md with its own setup notes.
