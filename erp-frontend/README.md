# Nexus ERP — Frontend

Operations console for the 20-service ERP backend. Next.js (App Router,
**JavaScript only**), Tailwind CSS v3, shadcn/ui, light theme, IBM Plex Sans.

## Run it

```bash
npm install
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_BASE at your gateway
npm run dev                        # http://localhost:3000
```

The backend gateway must be running (default `http://127.0.0.1:4000`). All REST
goes through it; the app talks to `${NEXT_PUBLIC_API_BASE}/api/v1`.

## Architecture

```
app/
  (auth)/login          public login (branded split layout)
  (app)/                 auth-guarded shell (sidebar + topbar) — every module lives here
    dashboard            role-aware widgets from /dashboard/summary
    sales/orders         list + confirm/cancel workflow (shortfall-aware)
    sales/quotations     list
    customers, parts     list
    suppliers            list + approval workflow (approve/reject/hold/blacklist)
    purchase             list
    inventory/stock      live stock grid
    finance/invoices     AR/AP list
    users                list + create dialog (full CRUD reference)
components/
  ui/                    shadcn primitives (owned, editable)
  shared/                app building blocks (see below)
lib/
  api/client.js          axios instance + token refresh + envelope helpers
  api/services.js        every backend call, grouped by module — UI never calls axios directly
  auth/                  AuthProvider + useCan() RBAC hook
  constants/             nav config (permission-gated) + status→colour map
  utils.js               cn() + INR/number/date formatters
```

### The pieces that make it scale

- **`lib/api/services.js`** — one place for all endpoints. Adding a call is a one-liner.
- **`components/shared/resource-list.jsx`** — owns search + pagination + query; a list
  page is ~30 lines: pass a `queryKey`, the fetcher, and column config.
- **`components/shared/data-table.jsx`** — the table workhorse (loading skeletons,
  empty state, pagination) driven entirely by a `columns` array.
- **`components/shared/status-badge.jsx`** + **`lib/constants/status.js`** — every status
  string maps to one semantic colour, everywhere.
- **`<Protected>`** + **`useCan()`** — RBAC. Buttons/sections hide when the user lacks the
  permission; the `(app)` layout guards routes; the sidebar filters itself.

## Add a new module (the whole pattern)

1. Add the endpoints to `lib/api/services.js`:
   ```js
   export const shipmentApi = { list: (p) => api.get('/shipment', { params: p }).then(unwrapList), /* … */ };
   ```
2. Add a nav entry in `lib/constants/nav.js` (with its `permission`).
3. Create `app/(app)/<module>/page.js`:
   ```jsx
   'use client';
   import { PageHeader } from '@/components/shared/page-header';
   import { ResourceList } from '@/components/shared/resource-list';
   import { StatusBadge } from '@/components/shared/status-badge';
   import { shipmentApi } from '@/lib/api/services';

   export default function ShipmentsPage() {
     const columns = [
       { key: 'code', header: 'Shipment', render: (s) => s.code },
       { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> }
     ];
     return (
       <div className="space-y-6">
         <PageHeader title="Shipments" crumbs={[{ label: 'Operations' }, { label: 'Shipments' }]} />
         <ResourceList queryKey={['shipments']} fetcher={shipmentApi.list} columns={columns} />
       </div>
     );
   }
   ```

That's a fully working, permission-gated, paginated, searchable module. Actions
(confirm/cancel/approve) follow the `suppliers` / `sales/orders` pattern:
a `DropdownMenu` + `ConfirmDialog` + a `useMutation` calling `moduleApi.action`.

## Design system

- **Colours** — light only. Blue `#2563EB` primary; semantic success/warning/info/
  destructive/neutral; no purple/violet/gold. Tokens are HSL CSS vars in
  `app/globals.css`, consumed via Tailwind (`bg-primary`, `text-success`, …).
- **Type** — single family, IBM Plex Sans, with tabular figures on all numeric data.
- **Signature** — operations-console feel: dense left rail with a blue active spine,
  ⌘K command navigator, tabular data tables, semantic status chips.

## Notes

- shadcn is set up for **Tailwind v3** (JSX components, HSL variables) — the stable,
  hand-editable path for a JS-only project. To pull more primitives:
  `npx shadcn@2.3.0 add <component>`.
- Real-time notifications: connect Socket.IO directly to
  `NEXT_PUBLIC_NOTIFICATIONS_URL` (see backend `FRONTEND.md`); the bell already
  polls unread count.
- Several modules are built as **reference implementations**; the remaining backend
  endpoints (warehouse, quality, shipment, reports, roles, audit…) plug in with the
  same three-step pattern above. `lib/api/services.js` already has their calls stubbed.
