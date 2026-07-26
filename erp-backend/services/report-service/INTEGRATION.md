# Report Service (port 4017) — drop-in

Async Excel/CSV report generation via BullMQ.

## DB + client
```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS erp_report CHARACTER SET utf8mb4;"
cd services/report-service && npm install && npx prisma generate && npx prisma migrate dev --name init_report
```
`npm install` pulls in **exceljs** for XLSX generation.

## ecosystem.config.js (already appended in the combined bundle)
`erp-report-service` + `erp-report-worker`.

Root `.env` already has `REPORT_SERVICE_URL=http://127.0.0.1:4017`; gateway maps
`reports` -> `/reports`.

## Available reports (registry in src/generators/registry.js)
- `sales-orders-register` (Sales)
- `purchase-orders-register` (Purchase)
- `inventory-valuation` (Inventory)
- `finance-outstanding` (Finance, AR+AP)
- `quality-rejections` (Quality, defaults to FAILED inspections)

## Flow
`POST /reports/runs {reportKey, format, params}` -> returns `QUEUED` immediately.
Worker: pages through the owning service's list endpoint (100/page, capped at
`MAX_PAGES_PER_REPORT`), builds an in-memory XLSX (exceljs) or CSV buffer, then
**uploads it to the File service** (`POST /files/upload`, category SPREADSHEET)
via native fetch+FormData+Blob (Node 20+, no extra multipart dependency).
Poll `GET /reports/runs/:id` — once `COMPLETED`, `downloadPath` points to
`/api/v1/files/{fileId}/download` through the gateway.

PDF export isn't included — add a `pdfkit`-based generator alongside
`xlsx.generator.js` / `csv.generator.js` and a `PDF` case in
`reportGenerator.service.js` if needed later.

## Events
Publishes: report.completed, report.failed (both carry `assignedTo` = the
requester, so Notification pushes a "report ready" alert with no extra wiring).
Has no consumers — generation is always user-requested.

Endpoints (RBAC report.*): /definitions, /runs (list/create), /runs/:id.
