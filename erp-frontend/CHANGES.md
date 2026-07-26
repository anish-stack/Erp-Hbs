# Frontend v1.1 — What changed & why

Four things you asked for, plus one bonus the cookie change unlocks.

---

## 1. Next.js version updated (14 → 15) + React 19

**Why:** Next.js 14 reached **end-of-life (Oct 2025)** — no more security patches.
Moved to **Next 15** (a supported LTS) with **React 19**, and refreshed every
dependency (Radix, TanStack Query, lucide, sonner, date-fns, cmdk) to versions
that support React 19.

- `package.json` now uses **caret ranges** (`^`) so `npm install` resolves the
  latest compatible patch of each package instead of a brittle exact pin.
- If `npm install` ever complains about peer versions, run:
  ```bash
  npm install --legacy-peer-deps
  ```

**Files:** `package.json`

---

## 2. Tokens now in cookies (not localStorage)

**Why:** localStorage is invisible to the server, so it can't guard routes and is
awkward to expire. Cookies fix both.

- New dependency **`js-cookie`**.
- `lib/api/client.js` now reads/writes the access + refresh tokens as cookies
  (`erp_access_token`, `erp_refresh_token`) with `sameSite=lax`, `secure` in
  production, an access-token expiry of ~1 day and refresh of 7 days.
- Everything else (the axios interceptor, silent refresh, `AuthProvider`) keeps
  working unchanged because the `getAccessToken / setTokens / clearTokens`
  interface stayed the same — only the storage behind it changed.

**Honest note on security:** these are **JS-readable** cookies, not `httpOnly`.
The tokens arrive in the login *response body*, so the browser JS has to store
them to send the `Authorization` header. Truly httpOnly tokens would need a
server-side proxy/BFF that sets `Set-Cookie` itself — this SPA doesn't have one.
This is the standard trade-off for a token-in-body SPA, and it's called out in a
comment at the top of `client.js`.

**Files:** `lib/api/client.js`, `package.json`

---

## 3. BONUS — server-side route guard (only possible with cookies)

**Why it matters:** because the token is now a cookie, Next.js **middleware** can
read it on the server and redirect *before* a protected page renders.

- New `middleware.js`:
  - no token + protected route → redirect to `/login?from=<path>`
  - has token + on `/login` → redirect to `/dashboard`
- `login/page.js` now sends you back to the `?from=` page after signing in.
- The client-side `AuthProvider` still does the full session load — middleware is
  just the fast first line of defence (no logged-out flash).

**Files:** `middleware.js`, `app/(auth)/login/page.js`

---

## 4. Error boundaries — see exactly which component broke

**Why:** a single component throwing used to blank the screen with no clue where.
Now every layer has a boundary that **names the place that failed**, shows the
message + a reference id, and in development prints the full stack.

New pieces:
- **`components/shared/error-state.jsx`** — one consistent error screen. Shows
  *"Failed in: <where>"*, the message, a `digest` reference, and (dev only) an
  expandable stack trace.
- **`components/shared/error-boundary.jsx`** — a React class `ErrorBoundary` you
  wrap around any component with a `name`, e.g.
  ```jsx
  <ErrorBoundary name="Sales orders table"><DataTable .../></ErrorBoundary>
  ```
  It also logs the failing **component stack** to the console with that name.

Next App Router error pages (auto-caught, no wiring needed):
- **`app/error.js`** — catches errors anywhere in the app tree.
- **`app/(app)/error.js`** — catches errors inside the authenticated section and
  shows the exact **route segment** that failed (e.g. `/sales/orders`).
- **`app/global-error.js`** — last resort if the root layout itself throws
  (renders its own minimal HTML so it can't fail the same way).
- **`app/not-found.js`** — a proper 404 page.

Already-wired boundaries so component crashes are localised out of the box:
- `AppShell` wraps page content in `<ErrorBoundary name="Page content">` — a page
  crash shows the error *inside* the shell (sidebar/topbar stay usable).
- `ResourceList` wraps its table in `<ErrorBoundary name="Data table">`.

**How to read an error now:** the screen tells you the segment/component
("Failed in: /sales/orders" or "Data table"), the message, and in `npm run dev`
the full stack trace is one click away. The browser console additionally logs
`[ErrorBoundary: <name>]` with the React component stack.

**Files:** `components/shared/error-state.jsx`,
`components/shared/error-boundary.jsx`, `app/error.js`, `app/(app)/error.js`,
`app/global-error.js`, `app/not-found.js`, `components/shared/app-shell.jsx`,
`components/shared/resource-list.jsx`

---

## Run it

```bash
npm install            # or: npm install --legacy-peer-deps
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_BASE at your gateway
npm run dev
```

## Validation done

- All 61 source files transform-clean (esbuild, no JSX/syntax errors).
- Every local `@/…` import resolves to a real export.
- Every third-party import is declared in `package.json`.
- `next build` couldn't be run here (needs a full install), so if the build flags
  anything environment-specific, it'll be a dependency/peer note — use
  `--legacy-peer-deps` as above.
