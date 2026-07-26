# ERP Backend — Frontend Integration Guide

All 20 microservices, complete. This doc is for whoever builds the frontend
(admin panel, employee panel, or a unified SPA) against this backend.

Gateway base URL: `http://127.0.0.1:4000/api/v1` (all requests go through the
gateway — it forwards to the right service and injects identity headers).

---

## 1. Auth flow (do this first)

```
POST /api/v1/auth/login          { email, password } -> { accessToken, refreshToken, user }
POST /api/v1/auth/send-otp       { email|phone }      -> OTP-based login alternative
POST /api/v1/auth/verify-otp     { email|phone, otp }
POST /api/v1/auth/refresh        { refreshToken }      -> new accessToken (rotates refresh token)
POST /api/v1/auth/logout
GET  /api/v1/auth/me             -> current user + role
GET  /api/v1/auth/permissions    -> flat permission list for the logged-in user, e.g. ["inventory.view", "sales.create", ...]
```

Send `Authorization: Bearer <accessToken>` on every other call. The gateway
decodes it and forwards `x-user-id` / `x-user-role` / `x-user-permissions`
(base64 JSON) to the downstream service — frontend never needs to touch those
headers directly, just the Bearer token.

**Permission-gate the UI**: fetch `/auth/permissions` once after login, cache
it, and show/hide buttons/menu items by checking `module.action` (e.g.
`sales.create`, `finance.approve`). The backend enforces this regardless, but
hiding disabled actions is better UX than letting them 403.

---

## 2. Response envelope (every endpoint, every service)

```json
{
  "success": true,
  "message": "Fetched",
  "data": { "...": "..." },
  "timestamp": "2026-07-25T12:00:00.000Z"
}
```

List endpoints add pagination in `meta`:
```json
{
  "success": true,
  "data": [ "...items..." ],
  "meta": {
    "pagination": { "total": 42, "page": 1, "limit": 20, "totalPages": 3, "hasNextPage": true, "hasPrevPage": false }
  }
}
```

Errors (any 4xx/5xx):
```json
{ "success": false, "code": "VALIDATION_ERROR", "message": "...", "details": { } }
```
Common codes: `BAD_REQUEST`, `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`,
`NOT_FOUND`, `CONFLICT`, `SERVICE_UNAVAILABLE` (an internal service-to-service
call failed — show a retry-able error, not a form validation error).

**List query params, universal pattern**: `?page=1&limit=20&search=...&sortBy=...&sortOrder=asc|desc`
plus per-resource filters (documented per service below). `limit` max is 100
everywhere.

---

## 3. Service map

| # | Service | Gateway prefix | Notes |
|---|---------|----------------|-------|
| 1 | api-gateway | — | entry point, JWT decode, routing |
| 2 | auth | `/auth` | login/OTP/JWT/sessions |
| 3 | user | `/users`, `/departments` | staff accounts |
| 4 | role | `/roles`, `/permissions`, `/menus` | RBAC config |
| 5 | master | `/parts`, `/manufacturers`, `/categories`, `/uoms`, `/currencies`, `/tax-rates`, `/settings`, `/sequences` | shared reference data |
| 6 | supplier | `/suppliers` | vendor master + approval workflow |
| 7 | crm | `/leads`, `/customers`, `/activities` | customer master + pipeline |
| 8 | rfq | `/rfq` | request-for-quote to suppliers |
| 9 | purchase | `/purchase`, `/grn` | purchase orders + goods receipt |
| 10 | inventory | `/inventory` | stock ledger, lots, reservations |
| 11 | warehouse | `/warehouse` | bins, zones, putaway, tasks |
| 12 | quality | `/quality` | incoming inspection |
| 13 | sales | `/sales` | quotations + sales orders |
| 14 | finance | `/finance` | GST invoices (AR/AP) + payments |
| 15 | shipment | `/shipment` | pick/pack/dispatch |
| 16 | notification | `/notifications` | in-app/email/SMS + Socket.IO |
| 17 | file | `/files` | uploads, downloads, sharing |
| 18 | report | `/reports` | async Excel/CSV generation |
| 19 | dashboard | `/dashboard` | role-aware widget summary |
| 20 | audit | `/audit` | activity log (mostly read-only for admins) |

Every service also exposes `/docs` (Swagger UI) directly on its own port if
you run it standalone during dev (e.g. `http://127.0.0.1:4009/docs` for
Inventory) — useful for exact request/response schemas beyond this doc.

---

## 4. Endpoints by service

### auth — `/auth`
```
POST   /login                          public
POST   /refresh
POST   /forgot-password
POST   /reset-password
POST   /send-otp | /resend-otp
POST   /verify-otp
GET    /me
GET    /permissions
GET    /sessions                       list active sessions (device/IP)
DELETE /sessions/:jti                  revoke one session
POST   /logout | /logout-all
POST   /change-password
```

### user — `/users`, `/departments`
```
GET    /users/me                        PUT /users/me
GET    /users/stats
GET    /users/import/template            POST /users/import        (bulk CSV)
GET    /users                            POST /users
GET    /users/:id | PUT /users/:id | DELETE /users/:id
PATCH  /users/:id/status                 PATCH /users/:id/role
POST   /users/:id/reset-password
GET    /departments/options              GET/POST/PUT/DELETE /departments
```
Frontend: staff directory, add/edit user, department tree, CSV bulk import UI.

### role — `/roles`, `/permissions`, `/menus`
```
GET/POST /roles                          GET/PUT/DELETE /roles/:id
POST     /roles/:id/clone
GET      /roles/:id/permissions          PUT /roles/:id/permissions
GET      /permissions                    GET /permissions/matrix   GET /permissions/modules
POST     /permissions/sync               (admin: reconcile MODULES list into DB)
GET      /menus/me                       (role-filtered nav for the logged-in user)
GET/POST /menus                          PUT /menus/reorder
GET/PUT/DELETE /menus/:id
```
Frontend: role management screen with a permission matrix (module x action
checkboxes), and drive your app's sidebar from `GET /menus/me` rather than
hardcoding nav.

### master — `/parts` + reference collections
```
GET  /parts/search                       (typeahead)
GET  /parts/stats
GET/POST /parts                          GET/PUT/DELETE /parts/:id
POST /parts/:id/attachments               DELETE /parts/:id/attachments/:childId
GET/POST/PUT/DELETE /manufacturers, /categories, /uoms, /currencies, /tax-rates
GET/PUT /settings                        GET/POST/PUT/DELETE /sequences
```
Frontend: this is your product catalog. Every other module's part picker
(sales lines, PO lines, inspections, stock) should hit `/parts/search` for
autocomplete.

### supplier — `/suppliers`
```
GET  /suppliers/options | /stats | /leaderboard
GET  /suppliers/prices | /suppliers/prices/compare
GET/POST /suppliers                      GET/PUT/DELETE /suppliers/:id
GET  /suppliers/:id/readiness            (onboarding checklist)
POST /suppliers/:id/submit|approve|reject|hold|blacklist|reinstate   (approval workflow)
POST/PUT/DELETE /suppliers/:id/addresses|contacts|bank-accounts|documents/:childId
GET  /suppliers/:id/parts                (parts this supplier can quote)
POST/PUT/DELETE /suppliers/:id/prices/:priceId   PUT /suppliers/:id/prices/bulk
GET/POST /suppliers/:id/ratings
```
Frontend: vendor onboarding wizard (status stepper DRAFT to SUBMITTED to
APPROVED), price list management, scorecard/leaderboard view.

### crm — `/leads`, `/customers`, `/activities`
```
GET  /leads/pipeline | /leads/mine
GET/POST /leads                          GET/PUT/DELETE /leads/:id
PATCH /leads/:id/stage                   POST /leads/:id/followup
POST /leads/:id/convert                  (lead -> customer)
GET  /leads/:id/activities
GET  /customers/options | /stats
GET/POST /customers                      GET/PUT/DELETE /customers/:id
PATCH /customers/:id/status
POST /customers/:id/credit/adjust        GET /customers/:id/credit/check
POST/PUT/DELETE /customers/:id/addresses|contacts/:childId
GET  /customers/:id/activities
POST /activities                          POST /activities/:id/complete
```
Frontend: Kanban pipeline board (`/leads/pipeline`), customer 360 page with
tabs (info/addresses/contacts/credit/activity timeline).

### rfq — `/rfq`
```
GET  /rfq/stats
GET/POST /rfq                            GET/PUT/DELETE /rfq/:id
POST /rfq/:id/suppliers                  DELETE /rfq/:id/suppliers/:supplierId
POST /rfq/:id/send | /rfq/:id/cancel
GET  /rfq/:id/compare                    (side-by-side supplier quote comparison)
POST /rfq/:id/compared | /rfq/:id/award | /rfq/:id/close
```
Frontend: multi-supplier comparison grid is the centerpiece screen here.

### purchase — `/purchase`, `/grn`
```
GET  /purchase/stats
GET/POST /purchase                       GET/PUT/DELETE /purchase/:id
POST /purchase/:id/submit|approve|reject|issue|cancel|close
GET/POST /purchase/:poId/grns            (goods receipt against a PO)
GET  /grn/:id                            POST /grn/:id/inspection-result
```
Frontend: PO builder (line items from `/parts/search`), approval workflow
buttons gated by `purchase.approve` permission, GRN receiving screen that
shows ordered vs already-received qty per line.

### inventory — `/inventory`
```
GET  /inventory/stats | /inventory/low-stock | /inventory/availability
GET  /inventory/stock                    (list, filter by warehouseId/partId)
GET  /inventory/stock/by-part/:partId    GET /inventory/stock/:id
PUT  /inventory/stock/:id/reorder        (set min/reorder/max levels)
POST /inventory/receipts | /issues | /transfers   (the 3 stock movement primitives)
GET  /inventory/movements                 (audit ledger, read-only)
GET  /inventory/lots                      GET /inventory/lots/:id
GET/POST /inventory/reservations          POST /inventory/reservations/:id/release|fulfill
GET/POST /inventory/adjustments           GET /inventory/adjustments/:id
```
Frontend: stock position grid (by warehouse/bin), a movement history viewer,
manual receipt/issue/transfer forms (usually admin-only, most stock flow is
automatic via Purchase/Quality/Sales/Shipment events), and a low-stock alert
list.

### warehouse — `/warehouse`
```
GET  /warehouse/options | /stats
GET/POST /warehouse                      GET/PUT/DELETE /warehouse/:id
POST /warehouse/:id/activate|deactivate|set-default
GET/POST /warehouse/:id/zones            PUT/DELETE /warehouse/zones/:zoneId
GET/POST /warehouse/:id/bins             POST /warehouse/:id/bins/bulk
GET  /warehouse/:id/bins/suggest         GET/PUT/DELETE /warehouse/bins/:binId
POST /warehouse/bins/:binId/block|unblock
GET/POST /warehouse/:id/putaway-rules    PUT/DELETE /warehouse/putaway-rules/:ruleId
GET  /warehouse/:id/putaway/suggest
GET/POST /warehouse/tasks                GET /warehouse/tasks/:taskId
POST /warehouse/tasks/:taskId/assign|start|complete|cancel
```
Frontend: warehouse floor-plan-ish bin grid (bulk-create via aisle/rack/
shelf/level ranges), a task queue/kanban for pickers (PENDING to ASSIGNED to
IN_PROGRESS to COMPLETED), putaway rule config screen.

### quality — `/quality`
```
GET/POST /quality/plans                  GET/PUT/DELETE /quality/plans/:id
GET  /quality/stats
GET/POST /quality/inspections            GET /quality/inspections/:id
POST /quality/inspections/:id/start|results|complete|hold|cancel
```
Frontend: inspection queue (filter by pending/status), a results entry form
(dynamic checkpoints from the matched plan), accept/reject split at complete
time with disposition dropdown.

### sales — `/sales`
```
GET  /sales/stats
GET/POST /sales/quotations               GET/PUT /sales/quotations/:id
POST /sales/quotations/:id/send|accept|reject|convert
GET/POST /sales/orders                   GET/PUT /sales/orders/:id
POST /sales/orders/:id/confirm|cancel|close
```
Frontend: quotation builder (line pricing preview live as qty/discount/tax
change), order detail page showing reserved/shipped/invoiced qty per line
(three progress indicators), confirm button shows a shortfall warning if the
response includes `shortfalls`.

### finance — `/finance`
```
GET  /finance/stats | /finance/payments/stats
GET/POST /finance/invoices               POST /finance/invoices/from-sales-order|from-purchase-order
GET  /finance/invoices/:id               POST /finance/invoices/:id/issue|cancel
GET/POST /finance/payments               GET /finance/payments/:id
```
Frontend: AR/AP split dashboard, invoice detail with GST breakdown (CGST/
SGST/IGST lines), a payment recording modal where you pick one or more open
invoices and split the amount across them (allocations array).

### shipment — `/shipment`
```
GET  /shipment/stats
GET/POST /shipment                       POST /shipment/from-order
GET  /shipment/:id
POST /shipment/:id/pick-tasks|pick|pack|dispatch|deliver|cancel
```
Frontend: shipment lifecycle stepper (Pending to Picking to Picked to Packed
to Dispatched to Delivered), dispatch form for carrier + tracking number.

### notification — `/notifications`
```
GET  /notifications                       POST /notifications        (send directly, admin use)
GET  /notifications/unread-count          POST /notifications/mark-all-read
GET/PUT /notifications/preferences
GET  /notifications/:id                   POST /notifications/:id/read
```
Realtime: connect Socket.IO directly to the notification service (not through
the gateway) — `io('http://127.0.0.1:4015')`, then
`socket.emit('identify', { userId, role })`, then `socket.on('notification', handler)`.
Frontend: bell icon + dropdown, toast on `notification` socket event, a
preferences page (email/SMS/in-app toggles).

### file — `/files`
```
POST /files/upload | /files/upload/bulk   (multipart/form-data, field name "file"/"files")
GET  /files | /files/stats
GET  /files/:id | /files/:id/download | /files/:id/preview
PUT  /files/:id/replace                   DELETE /files/:id
GET/DELETE /files/:id/shares              POST /files/:id/shares       (generate a share link)
GET  /files/shared/:token                 (public, no auth)
```
Frontend: generic file upload widget reusable across modules (attach to
supplier docs, part datasheets, invoices, etc.) — always upload here and
store the returned `id` on the owning record.

### report — `/reports`
```
GET  /reports/definitions                 (catalog: sales-orders-register, purchase-orders-register,
                                            inventory-valuation, finance-outstanding, quality-rejections)
GET/POST /reports/runs                    GET /reports/runs/:id
```
Frontend: "Generate Report" button per module -> POST with `reportKey` +
`format` (XLSX/CSV) + optional `params` (filters) -> poll `/reports/runs/:id`
every few seconds until `status: COMPLETED`, then link to `downloadPath`
(goes through the gateway to the File service).

### dashboard — `/dashboard`
```
GET      /dashboard/summary               (?widgets=key1,key2 to override the role default)
GET      /dashboard/widgets               (catalog + role -> widget map)
GET      /dashboard/widgets/:key
GET/PUT  /dashboard/layout                (per-user saved widget selection)
```
Frontend: this is your home/landing page after login. Render each widget in
`data.widgets[]` as a card; each item may have `available: false` if its
upstream service is down — show a "temporarily unavailable" state, not an error.

### audit — `/audit`
```
GET  /audit/me                            GET /audit/stats
GET/POST /audit                           GET /audit/:id
```
Frontend: admin-only activity log viewer with filters (user, module, date
range, action type).

---

## 5. Cross-module flows worth building UI around

These happen automatically on the backend (events between services) — the
frontend mainly needs to *reflect* the resulting state, not trigger every step:

1. **Procure-to-pay**: RFQ -> award -> PO -> approve -> issue -> GRN receipt ->
   Quality inspection -> accepted stock lands in Inventory -> Warehouse
   auto-putaway task -> Finance AP bill (optional) -> payment.
2. **Order-to-cash**: Quotation -> accept -> convert -> Sales order -> confirm
   (reserves stock) -> Finance AR invoice (auto) -> Shipment (auto) -> pick ->
   pack -> dispatch (converts reservation to real stock issue) -> Sales order
   rolls to fulfilled -> payment -> invoice PAID.
3. Any of the above can throw a **shortfall/failure** back to the UI (stock
   reservation shortfall, inventory issue failure, GRN quantity tolerance
   exceeded) — surface these as inline warnings on the relevant detail page,
   not silent failures.
4. **Notifications** fire for most of the above automatically — don't
   duplicate that logic in the frontend, just render what arrives over
   Socket.IO / the notifications list.

## 6. What's NOT built yet

Nothing — all 20 services are implemented and wired end-to-end. If frontend
work surfaces a gap (a report type, a widget, a missing filter), it's
additive work on an existing service, not a new module.
