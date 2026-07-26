# ERP Backend — Complete Setup Guide (0 to 100)

A step-by-step guide to run all 20 services on a **fresh Windows machine using
XAMPP**. Follow the steps **in order**. Copy-paste each block. Every step says
*why* so you know what you're doing.

> If something breaks, jump to **Section 10 (Common Errors)** — the exact
> symptoms you'll see are listed with fixes.

---

## What you'll have at the end

- 20 backend services running under PM2
- 20 MySQL databases in XAMPP
- An admin login to test everything: `admin@erp.local` / `Admin@12345`
- API reachable at `http://127.0.0.1:4000/api/v1`

---

# STEP 1 — Install the 5 required tools

Install these once. Restart your terminal after each install.

| Tool | Download | Verify (run in PowerShell) |
|------|----------|----------------------------|
| **Node.js 20+** | https://nodejs.org (LTS) | `node -v` |
| **XAMPP** (MySQL) | https://apachefriends.org | (starts MySQL) |
| **Redis for Windows** (Memurai) | https://www.memurai.com/get-memurai | `redis-cli ping` -> `PONG` |
| **RabbitMQ** | https://www.rabbitmq.com/install-windows.html (needs Erlang first) | see Step 3 |
| **PM2** | run: `npm install -g pm2` | `pm2 -v` |

> **Redis on Windows:** the official Redis doesn't run natively on Windows.
> Use **Memurai** (free, Redis-compatible) — it installs as a Windows service and
> just works with `redis-cli`.

---

# STEP 2 — Start the 3 background services

The ERP needs **MySQL + Redis + RabbitMQ** running *before* you start any service.

### 2a. MySQL (XAMPP)
1. Open **XAMPP Control Panel**.
2. Click **Start** next to **MySQL**. It should turn green.
3. (Apache is NOT needed — only MySQL.)

### 2b. Redis (Memurai)
Memurai runs as a service automatically. Confirm:
```powershell
redis-cli ping
```
You must see `PONG`. If not, open **Services** (Win+R -> `services.msc`) and start **Memurai**.

### 2c. RabbitMQ
RabbitMQ also runs as a service. Confirm it's up by opening the management UI:
```
http://localhost:15672
```
Default login: `guest` / `guest`. If the page doesn't open, start **RabbitMQ**
in `services.msc`.

---

# STEP 3 — Create the RabbitMQ `erp` user  ⚠️ IMPORTANT

**This is the #1 cause of workers crashing.** The services connect to RabbitMQ
as user `erp` (password `erp_password`), which does **not** exist by default.
Create it once.

Open a terminal **in the RabbitMQ sbin folder** (usually
`C:\Program Files\RabbitMQ Server\rabbitmq_server-<version>\sbin`), then run:

```powershell
.\rabbitmqctl.bat add_user erp erp_password
.\rabbitmqctl.bat set_permissions -p / erp ".*" ".*" ".*"
.\rabbitmqctl.bat set_user_tags erp administrator
```

Verify — this should now list `erp`:
```powershell
.\rabbitmqctl.bat list_users
```

> **Don't want to deal with rabbitmqctl?** Alternative: open
> `http://localhost:15672` (guest/guest) -> **Admin** tab -> **Add a user**
> (name `erp`, password `erp_password`) -> click the user -> **Set permission**
> on vhost `/` with `.*` `.*` `.*`.

---

# STEP 4 — Create the 20 databases in XAMPP

Each service uses its own database. Create all 20 at once.

1. Open **phpMyAdmin**: `http://localhost/phpmyadmin`
2. Click the **SQL** tab at the top.
3. Paste this **entire block** and click **Go**:

```sql
CREATE DATABASE IF NOT EXISTS erp_auth          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS erp_user          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS erp_role          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS erp_master        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS erp_supplier      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS erp_crm           CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS erp_rfq           CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS erp_purchase      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS erp_inventory     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS erp_warehouse     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS erp_quality       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS erp_sales         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS erp_finance       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS erp_shipment      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS erp_notification  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS erp_report        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS erp_dashboard     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS erp_file          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS erp_audit         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

You should now see all 19 `erp_*` databases in the left sidebar. (The gateway
needs no database.)

---

# STEP 5 — Check the database connection settings

Each service already ships a `.env` file. The default connection assumes
**XAMPP's default**: user `root`, **no password**, host `127.0.0.1:3306`.

Open any service's `.env`, e.g. `services\auth-service\.env`, and confirm:
```env
DATABASE_URL="mysql://root:@localhost:3306/erp_auth"
RABBITMQ_URL=amqp://erp:erp_password@127.0.0.1:5672
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

- `mysql://root:@...` means user `root`, **empty password** (that `:` with nothing
  after it is the empty password). This is XAMPP's default — leave it as-is.
- **If you set a MySQL root password** in XAMPP, you must add it in **every**
  service `.env`: `mysql://root:YOURPASSWORD@127.0.0.1:3306/erp_auth`.

You normally don't need to edit anything here if you're on a stock XAMPP.

---

# STEP 6 — Install dependencies (one command)

Open PowerShell in the project root (`D:\erp\erp-backend`) and run:

```powershell
npm install
```

This installs all 20 services + shared code at once (npm workspaces). Takes a
few minutes the first time.

---

# STEP 7 — Prisma: generate clients + create tables

Two things per service:
1. **`prisma generate`** — builds the database client the code imports.
2. **`prisma db push`** — reads each service's schema and **creates its tables**
   in the database you made in Step 4.

> We use **`db push`** (not `migrate`) because it's the simplest way to create
> tables in development — it just syncs the schema straight into MySQL, no
> migration files, no prompts.

### The easy way — paste this whole PowerShell block in the project root:

```powershell
$services = @(
  "auth","user","role","master","supplier","crm","rfq","purchase",
  "inventory","warehouse","quality","sales","finance","shipment",
  "notification","report","dashboard","file","audit"
)
foreach ($s in $services) {
  Write-Host "=== $s ===" -ForegroundColor Cyan
  Push-Location "services/$s-service"
  npx prisma generate
  npx prisma db push
  Pop-Location
}
Write-Host "All 19 databases are ready." -ForegroundColor Green
```

Each service prints `Your database is now in sync with your Prisma schema`. If
any fail, check that (a) MySQL is running and (b) the matching `erp_<name>`
database exists.

### The manual way (if you prefer one service at a time):
```powershell
cd services\auth-service
npx prisma generate
npx prisma db push
cd ..\..
# repeat for each service folder
```

---

# STEP 8 — Seed all demo data (one command)

This fills **every module** with realistic demo data — roles, permissions,
menus, an admin login, plus sample parts, suppliers, customers, warehouses,
stock, a purchase order, an RFQ, a quotation, a sales order, invoices, a
shipment, inspections, notifications, files, audit logs, and staff users.

From the project root, run **one command**:

```powershell
npm run seed:all
```

That runs all seeds in the correct order:
`role -> auth -> user -> master -> supplier -> crm -> warehouse -> inventory ->
quality -> purchase -> rfq -> sales -> finance -> shipment -> notification ->
file -> audit`.

**Logins created:**
- Admin (full access): `admin@erp.local` / `Admin@12345`
- Sample staff (password `Passw0rd@123`): `neha.sales@erp.local`,
  `arjun.purchase@erp.local`, `sana.wh@erp.local`

> **Re-running is safe.** Every seed is idempotent (upsert / find-or-create) —
> run `npm run seed:all` again anytime without creating duplicates.

> **Seed one module only?** Use its own command, e.g. `npm run sales:seed`,
> `npm run inventory:seed`, `npm run supplier:seed`, etc. (one per service).

# STEP 9 — Start all services

### Option A — PM2 (recommended: runs all 36 processes together)

From the project root:
```powershell
pm2 start ecosystem.config.js
pm2 status
```

**All rows must say `online`.** 36 processes = 20 services + 16 workers.

Useful PM2 commands:
```powershell
pm2 status                      # see all processes
pm2 logs                        # tail all logs (Ctrl+C to stop tailing)
pm2 logs erp-auth-service       # tail just one
pm2 restart all                 # restart everything
pm2 reload ecosystem.config.js  # apply code changes
pm2 delete all                  # stop + remove everything
```

### Option B — one service at a time (best for finding errors)

PM2 hides crash errors. To see the **real error** printed on screen, run a
single service directly:
```powershell
npm run auth:dev        # runs auth-service, errors show live in the terminal
npm run auth:worker     # its worker in a second terminal
```

---

# STEP 10 — Verify it works

### 10a. Health check — are services alive?
Open in your browser (or curl). Each returns `{"status":"ok"...}`:
```
http://127.0.0.1:4000/health/ready      (gateway)
http://127.0.0.1:4001/health/ready      (auth)
http://127.0.0.1:4009/health/ready      (inventory)
```
Ports run 4000-4019. Every service also has interactive API docs at
`http://127.0.0.1:<port>/docs`.

### 10b. Log in and get a token
```powershell
curl -Method POST http://127.0.0.1:4000/api/v1/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"admin@erp.local","password":"Admin@12345"}'
```
You should get back `accessToken`, `refreshToken`, and your user. That token
goes in the `Authorization: Bearer <token>` header on every other call.

If you got a token — **the backend is fully working.** 🎉

---

# SECTION 11 — Common Errors (and exact fixes)

### ❌ Workers keep restarting / show `stopped` in `pm2 status` (↺ count rising)
**Cause:** RabbitMQ `erp` user doesn't exist, so workers can't connect and crash
on boot.
**Fix:** Do **Step 3** — create the `erp` user in RabbitMQ. Then:
```powershell
pm2 restart all
```

### ❌ Service exits immediately / `PrismaClientInitializationError`
**Cause:** tables not created, or wrong DB password.
**Fix:** Re-run **Step 7** (`prisma db push`) for that service, and confirm the
`erp_<name>` database exists (Step 4). Check `DATABASE_URL` password (Step 5).

### ❌ `Table 'erp_xxx.yyy' doesn't exist`
**Cause:** `db push` didn't run for that service.
**Fix:**
```powershell
cd services\<name>-service
npx prisma db push
cd ..\..
pm2 restart erp-<name>-service
```

### ❌ `ECONNREFUSED 127.0.0.1:6379`
**Cause:** Redis (Memurai) isn't running.
**Fix:** Start **Memurai** in `services.msc`, confirm `redis-cli ping` -> `PONG`,
then `pm2 restart all`.

### ❌ `ECONNREFUSED 127.0.0.1:5672` or `ACCESS_REFUSED` on RabbitMQ
**Cause:** RabbitMQ not running, or `erp` user missing/wrong permissions.
**Fix:** Start RabbitMQ service; redo **Step 3**; `pm2 restart all`.

### ❌ `Access denied for user 'root'@'localhost'`
**Cause:** You set a MySQL password in XAMPP but the `.env` files still use empty.
**Fix:** Put your password in every service `.env`:
`mysql://root:YOURPASSWORD@127.0.0.1:3306/erp_<name>`.

### ❌ A `npm run <svc>:seed` says "Missing script"
**Fix:** Run that service's seed directly:
```powershell
cd services\<svc>-service
npm run seed
cd ..\..
```

### ❌ Login returns 401 / "Invalid credentials"
**Cause:** Seeds didn't run.
**Fix:** Re-run **Step 8** in order (role -> auth -> master).

### ❌ Login returns 403 after a valid token
**Cause:** That user's role lacks the permission.
**Fix:** Use the admin account (has `*.*`), or grant the role the permission via
the roles API.

---

# SECTION 12 — The whole thing, start to finish (cheat sheet)

```powershell
# --- prerequisites running: XAMPP MySQL, Memurai (Redis), RabbitMQ ---

# 1. RabbitMQ user (in RabbitMQ sbin folder) — do once
.\rabbitmqctl.bat add_user erp erp_password
.\rabbitmqctl.bat set_permissions -p / erp ".*" ".*" ".*"

# 2. Create 19 databases  ->  paste the SQL from Step 4 into phpMyAdmin

# 3. In project root (D:\erp\erp-backend):
npm install

# 4. Generate clients + create tables for every service
$services = @("auth","user","role","master","supplier","crm","rfq","purchase","inventory","warehouse","quality","sales","finance","shipment","notification","report","dashboard","file","audit")
foreach ($s in $services) { Push-Location "services/$s-service"; npx prisma generate; npx prisma db push; Pop-Location }

# 5. Seed (order matters)
npm run seed:all

# 6. Start everything
pm2 start ecosystem.config.js
pm2 status

# 7. Test: log in
curl -Method POST http://127.0.0.1:4000/api/v1/auth/login -ContentType "application/json" -Body '{"email":"admin@erp.local","password":"Admin@12345"}'
```

That's 0 to 100. If every PM2 row is `online` and login returns a token, your
ERP backend is fully up.
