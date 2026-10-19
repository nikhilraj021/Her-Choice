# Her Choice — Architecture Blueprint

Status: proposal (milestone 0). Nothing below is implemented yet except the scaffold noted in §1.

## 1. Current state

| | Frontend (`frontend/`) | Backend (`backend/`) |
|---|---|---|
| Runtime | Next.js 16.4.2, React 19.3.0 | Node 22.18, Express ^5.3.0, ES modules |
| Styling / data | Tailwind CSS v4 (`@tailwindcss/turbopack`), ESLint 9 | `mysql2` pool, `cors`, `helmet`, `morgan` |
| Config | `cacheComponents: true`, App Router, `src/`, `@/*` alias | `.env` loaded with `node --env-file-if-exists` |
| Code | default page, `src/lib/api.js` | `app.js`, `server.js`, `config/`, `GET /api/health` |

Local MySQL Server 8.0.46 is installed. Note that the `prisma` `latest` dist-tag currently points to `8.0.0-rc.23`, which is a release candidate. Pin to **7.10.1** (stable).

Next.js 16 changes that affect this design:
- `middleware.js` is now **`proxy.js`**. It is for optimistic redirects only and must not be the authorization layer.
- With `cacheComponents` on, reading `cookies()` outside a `<Suspense>` boundary is a build error. Anything that depends on the session goes in a component inside a boundary. Public catalog data uses `'use cache'` plus `cacheTag`.

## 2. Key decisions (inferred — change here if wrong)

1. **Money is stored as integer paise (`Int`)**, with INR as the only currency. This matches Razorpay, which charges in paise, and avoids floating-point errors. Prices include tax.
2. **Inventory is tracked per variant (SKU).** Every product has ≥1 `ProductVariant` (e.g. size/colour). A product without options gets one default variant. Cart, stock, and order lines all point to a variant.
3. **Auth uses server-side sessions, not JWTs.** A random token goes in an `httpOnly; Secure; SameSite=Lax` cookie, and only its SHA-256 hash is stored in the `Session` table. Sessions can be revoked (logout, password change, banning an admin), and there is no JWT secret rotation or algorithm-confusion risk. A JWT library is not needed.
4. **The same origin serves both apps.** A Next.js `rewrites()` maps `/api/:path*` to the Express server, so the browser only ever talks to the Next origin. Cookies are first-party and CORS isn't needed in the browser. Server Components call Express directly over an internal URL and forward the `cookie` header.
5. **Checkout requires login (v1).** The cart is stored on the server, one per user. Guest carts kept in `localStorage` and merged on login can come later.
6. **Stock is reserved when an order is created**, using a conditional decrement. It is released if payment fails or does not arrive within 30 minutes.
7. **Emails go through an outbox.** The order transaction writes a row to `EmailOutbox`, and a small in-process worker sends it with retries. A failed SMTP call never rolls back or blocks an order.
8. **Images are uploaded with `multer`** into a storage service interface: local `uploads/` in development, S3 or Cloudinary in production.

## 3. Folder structure

### Backend (feature modules; each module owns routes → controller → service → Prisma)

```
backend/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.js                 # admin user, categories, sample products
├─ prisma.config.js
├─ database/schema.sql        # existing: CREATE DATABASE only
├─ src/
│  ├─ server.js               # existing: boot, graceful shutdown, starts workers
│  ├─ app.js                  # existing: middleware stack + /api router
│  ├─ config/                 # env.js (validated with zod), db.js → Prisma client
│  ├─ lib/                    # prisma.js, razorpay.js, mailer.js, storage.js, money.js
│  ├─ middlewares/            # auth (requireAuth, requireRole), validate(zod), rateLimit,
│  │                          # notFound, errorHandler, upload, rawBody (webhooks)
│  ├─ utils/                  # ApiError, asyncHandler, pagination, slugify, crypto
│  ├─ modules/
│  │  ├─ auth/                # register, login, logout, me, password reset
│  │  ├─ users/               # profile
│  │  ├─ addresses/
│  │  ├─ categories/
│  │  ├─ products/            # public catalog + admin CRUD + variants + images
│  │  ├─ inventory/           # stock adjustments, movement ledger
│  │  ├─ cart/
│  │  ├─ orders/              # checkout, history, admin status transitions
│  │  ├─ payments/            # Razorpay order, verify, webhook, refunds
│  │  └─ notifications/       # email templates, outbox worker
│  ├─ jobs/                   # releaseExpiredReservations, emailOutboxWorker
│  └─ routes/index.js         # mounts module routers
└─ tests/                     # vitest + supertest; unit/ and integration/
```

A module looks like `modules/products/{products.routes.js, products.controller.js, products.service.js, products.schemas.js}`. Controllers only handle HTTP; business rules live in services.

### Frontend

```
frontend/src/
├─ app/
│  ├─ layout.js, globals.css, not-found.js, error.js
│  ├─ (shop)/                 # public storefront layout (header, footer, cart badge)
│  │  ├─ page.js              # home
│  │  ├─ products/page.js     # list: search/filter/sort via searchParams
│  │  ├─ products/[slug]/page.js
│  │  ├─ categories/[slug]/page.js
│  │  └─ cart/page.js
│  ├─ (auth)/login, register, forgot-password, reset-password
│  ├─ (account)/account/      # profile, addresses, orders, orders/[id]
│  ├─ checkout/               # address → review → pay → success/failed
│  └─ admin/                  # dashboard, products, products/[id], categories,
│                             # inventory, orders, orders/[id]  (role-gated)
├─ components/
│  ├─ ui/                     # Button, Input, Select, Dialog, Badge, Pagination, Toast…
│  ├─ layout/                 # Header, Footer, AdminSidebar, MobileNav
│  ├─ product/, cart/, checkout/, admin/
├─ lib/
│  ├─ api/                    # server.js (forwards cookies), client.js (fetch /api)
│  ├─ auth.js                 # getCurrentUser() ('use cache: private'), requireAdmin()
│  ├─ format.js               # formatINR(paise), dates
│  └─ validation/             # zod schemas for forms
├─ hooks/                     # useCart, useRazorpay
└─ proxy.js                   # optimistic redirect for /account, /checkout, /admin
```

**Data flow.** Catalog pages are Server Components that fetch with `'use cache'` and `cacheTag('products')`. Mutations use Server Actions or client `fetch('/api/...')`. Admin product writes call `revalidateTag`. Pages that read the session are wrapped in `<Suspense>`.

## 4. Modules and dependencies

```
auth ─────────────► users
addresses ────────► auth
categories ◄────── products ◄── inventory
cart ─────────────► products, inventory (availability check)
orders ───────────► cart, addresses, products, inventory, notifications
payments ─────────► orders, inventory, notifications, razorpay
notifications ────► mailer (outbox)
```

### Dependencies to add (nothing already installed is reinstalled)

| Package | Where | Version | Why |
|---|---|---|---|
| `@prisma/client`, `@prisma/adapter-mariadb` | backend | 7.10.1 | ORM. Prisma 7 needs a driver adapter; the MariaDB adapter works with MySQL 8 |
| `prisma` (dev) | backend | 7.10.1 | CLI and migrations (avoid the 8.0 RC) |
| `zod` | backend + frontend | ^4 | request, env, and form validation |
| `bcryptjs` | backend | ^3 | password hashing (cost 12) |
| `cookie-parser` | backend | ^1.4 | session cookie |
| `express-rate-limit` | backend | ^8 | login/register/reset/checkout throttling |
| `razorpay` | backend | ^2.9 | payment orders and refunds |
| `nodemailer` | backend | latest stable | SMTP |
| `multer` | backend | ^2 | image uploads (milestone 4) |
| `vitest`, `supertest` (dev) | backend | latest | tests |

Once Prisma is in place, **`mysql2` becomes unused** and can be removed in milestone 1, after you confirm. Keep `morgan` for now. Frontend: only `zod` is needed. Load Razorpay Checkout with `next/script`; no npm package is required.

## 5. Database model (Prisma, MySQL)

All IDs are `Int @id @default(autoincrement())` internally. Orders also get a public `orderNumber` (e.g. `HC-2026-000123`) so sequential IDs aren't exposed in URLs. All money columns are `Int` paise. Timestamps are `createdAt` and `updatedAt`.

| Model | Key fields | Notes |
|---|---|---|
| **User** | email (unique, lowercase), passwordHash, name, phone, role `CUSTOMER\|ADMIN`, isActive, emailVerifiedAt | |
| **Session** | userId, tokenHash (unique), expiresAt, userAgent, ip | delete on logout; delete all on password change |
| **PasswordResetToken** | userId, tokenHash, expiresAt, usedAt | single use, 30 min |
| **Address** | userId, fullName, phone, line1, line2, city, state, postalCode, country `IN`, isDefault | soft-deleted (`deletedAt`) so old orders aren't affected |
| **Category** | name, slug (unique), description, parentId?, isActive, sortOrder | optional one-level nesting |
| **Product** | name, slug (unique), description, categoryId, status `DRAFT\|ACTIVE\|ARCHIVED`, isSoldOut (manual override), basePrice, compareAtPrice? | index (categoryId, status); FULLTEXT(name, description) for search |
| **ProductVariant** | productId, sku (unique), optionLabel (e.g. "M / Red"), price, stock `Int ≥ 0`, isActive | price here is authoritative; `basePrice` is for display and sorting |
| **ProductImage** | productId, url, alt, sortOrder | alt text is required (accessibility) |
| **InventoryMovement** | variantId, delta (±), reason `RESTOCK\|ADJUSTMENT\|ORDER_RESERVED\|ORDER_RELEASED\|RETURN`, orderId?, actorId?, note | append-only audit ledger |
| **Cart** | userId (unique) | |
| **CartItem** | cartId, variantId, quantity | unique (cartId, variantId); **no price column**, priced live |
| **Order** | orderNumber, userId, status, subtotal, shippingFee, discount, total, shipping-address snapshot columns, reservationExpiresAt, placedAt, paidAt, cancelledAt | the address is copied, not referenced |
| **OrderItem** | orderId, variantId, productName, variantLabel, sku, unitPrice, quantity, lineTotal | snapshot: later product edits never change past orders |
| **OrderStatusHistory** | orderId, fromStatus, toStatus, actorId?, note | audit trail for admin changes |
| **Payment** | orderId, provider `RAZORPAY`, providerOrderId (unique), providerPaymentId (unique, nullable), amount, currency, status `CREATED\|AUTHORIZED\|CAPTURED\|FAILED\|REFUNDED`, method, failureReason, rawPayload (JSON) | an order can have several attempts; at most one is `CAPTURED` |
| **WebhookEvent** | provider, eventId (unique), type, payload, processedAt | idempotency for Razorpay retries |
| **EmailOutbox** | to, template, payload (JSON), status `PENDING\|SENT\|FAILED`, attempts, lastError, sendAfter | |

**Order status machine** (enforced in `orders.service`):

```
PENDING_PAYMENT ─► PAID ─► PROCESSING ─► SHIPPED ─► DELIVERED
      │              │          │
      ▼              ▼          ▼
  CANCELLED      CANCELLED ─► REFUNDED   (cancelling after payment triggers a refund)
  (expired/failed)
```

## 6. API route groups and permissions

Every route is under `/api/v1`. Roles: **public**, **customer** (any logged-in user), **admin**. `requireAuth` loads the session; `requireRole('ADMIN')` gates `/admin/*`. Customer resources are always queried with `WHERE userId = session.userId`, so nobody can read another user's data by changing an ID (IDOR).

| Group | Routes | Access |
|---|---|---|
| health | `GET /health` | public |
| auth | `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`; `GET /auth/me` | public (rate-limited) / `me`, `logout`: customer |
| profile | `GET/PATCH /me`, `PATCH /me/password` | customer |
| addresses | `GET/POST /me/addresses`, `PATCH/DELETE /me/addresses/:id` | customer (own) |
| catalog | `GET /categories`, `GET /products?q&category&minPrice&maxPrice&inStock&sort&page`, `GET /products/:slug` | public (only `ACTIVE`, non-archived) |
| cart | `GET /cart`, `POST /cart/items`, `PATCH/DELETE /cart/items/:id`, `DELETE /cart` | customer |
| checkout | `POST /orders` (body: addressId only; the server computes everything), `POST /orders/:orderNumber/pay` (creates or reuses a Razorpay order), `POST /payments/verify` | customer |
| orders | `GET /orders`, `GET /orders/:orderNumber`, `POST /orders/:orderNumber/cancel` (only before shipping) | customer (own) |
| webhooks | `POST /webhooks/razorpay` (raw body, signature-verified, no session) | Razorpay |
| admin | `GET /admin/dashboard`; `/admin/products` CRUD + `/variants` + `/images` + `PATCH …/status` (archive/sold-out); `/admin/categories` CRUD; `POST /admin/inventory/adjust`, `GET /admin/inventory/movements`; `GET /admin/orders`, `GET /admin/orders/:id`, `PATCH /admin/orders/:id/status`; `POST /admin/orders/:id/refund` | admin |

Response shape: `{ data, meta? }` on success, `{ error: { code, message, details? } }` on failure, with zod issues mapped to `details`.

## 7. Security risks and mitigations

| Risk | Mitigation |
|---|---|
| Client-side price/total tampering | Ignore every client price. Totals are computed from DB variant prices inside the order transaction, and the Razorpay amount is `order.total` read from the DB |
| Mass assignment (e.g. `role: "ADMIN"` sent on register) | zod `.strict()` schemas per route; services pick fields explicitly |
| IDOR on orders/addresses/cart | Scope every query by `userId`; use `orderNumber`, not the ID, in URLs |
| Session theft / CSRF | `httpOnly`, `Secure` (prod), `SameSite=Lax`; same-origin via rewrites; check `Origin` on state-changing requests; rotate the session on login |
| Credential stuffing / brute force | Rate limits on auth routes; bcrypt cost 12; the same generic error for unknown email and wrong password; forgot-password always returns 200 |
| SQL injection | Prisma parameterises queries; FULLTEXT search uses `$queryRaw` tagged templates only |
| XSS | React escapes output; never put `dangerouslySetInnerHTML` around product descriptions (render plain text or sanitised markdown); CSP via `helmet` |
| Malicious uploads | `multer` limits (2 MB, 8 files), MIME + magic-byte check (jpeg/png/webp), random filenames, served from a separate path with `nosniff` |
| Webhook spoofing / replay | HMAC-SHA256 over the **raw body** with the webhook secret, `timingSafeEqual`, `WebhookEvent.eventId` uniqueness |
| Secrets leakage | zod-validated env at boot; Razorpay `key_secret` only on the backend; only `key_id` goes to the browser; `.env` gitignored |
| Error detail leakage | Existing `errorHandler` hides 5xx messages in production; no stack traces in responses |
| Admin compromise impact | Separate admin role check on the server (the `proxy.js` redirect is cosmetic); audit fields (`actorId`) on inventory and status changes |

## 8. Payment and inventory edge cases

1. **Overselling under concurrency.** Reserve with `UPDATE ProductVariant SET stock = stock - ? WHERE id = ? AND stock >= ?` inside the order transaction. If any row count is 0, roll back and report which items are short.
2. **Price changed between cart and checkout.** The cart is priced live, and `POST /orders` returns the final total. The UI shows it on the review step before payment.
3. **User closes the tab after paying.** The webhook (`payment.captured` / `order.paid`) is the source of truth; `/payments/verify` is only the fast path. Both call the same idempotent `markOrderPaid(orderId, paymentId)`.
4. **Verify and webhook arrive together.** Both run in a transaction with a conditional `UPDATE Order SET status='PAID' WHERE id=? AND status='PENDING_PAYMENT'`. Whichever comes second is a no-op, so emails are sent once.
5. **Amount or currency mismatch.** Compare the captured amount with `order.total` and the currency with INR. On mismatch, don't mark paid; flag for admin and refund.
6. **Payment arrives after the reservation expired** (stock already released). Try to re-reserve. If that fails, mark the order `CANCELLED`, refund automatically, and email the customer.
7. **Retrying payment.** Reuse the existing Razorpay order while it is valid; never create a second Order. Only one `CAPTURED` Payment per order. A second capture triggers an automatic refund.
8. **Payment failed.** Record `FAILED` with the reason and keep the order `PENDING_PAYMENT` so the customer can retry until the reservation expires.
9. **Cancellations and refunds.** A cancellation before payment releases stock. A cancellation after payment calls the Razorpay refund API, sets `REFUNDED` on the `refund.processed` webhook, and restocks via an `InventoryMovement`.
10. **Product archived or edited after an order.** Order items are snapshots, so history stays correct. Archived products return 404 on the storefront but keep their admin records.
11. **Auto-capture.** Configure Razorpay payment capture as automatic. Otherwise authorised payments auto-refund after a few days.
12. **Clock/timeouts.** The reservation expiry job runs every minute and is idempotent (same conditional-update pattern).

## 9. Accessibility and responsiveness baseline

- Mobile-first Tailwind layouts; the admin sidebar collapses into a drawer below `md`.
- Semantic landmarks, one `<h1>` per page, visible focus rings, a skip link, labelled form fields with `aria-describedby` errors, `aria-live` for cart updates and toasts, AA colour contrast, required image `alt`, keyboard-operable dialogs and menus.
- Filters and sort live in `searchParams`, so pages work without JavaScript, can be shared, and the back button behaves.

## 10. Milestones

Each milestone ends with passing tests plus a manual check, and is one PR.

| # | Milestone | Done when |
|---|---|---|
| **1** | **Backend foundation:** add Prisma 7.10.1 + adapter, `prisma.config.js`, User/Session models, first migration; zod env validation; `ApiError` + `asyncHandler` + `validate` middleware; `/api/v1` prefix; vitest + supertest; switch the health check to Prisma; remove `mysql2` | `npm test` green; `/api/v1/health` reports the DB through Prisma |
| **2** | **Auth:** register/login/logout/me, session cookies, rate limits, `requireAuth`/`requireRole`, admin seed | Integration tests cover the happy paths, duplicate email, wrong password, role denial |
| **3** | **Frontend foundation:** `/api` rewrite, `lib/api` server/client, root layout + header/footer, UI primitives, login/register pages, `proxy.js` redirects, `getCurrentUser` behind Suspense | Can register, log in, see your name, log out |
| **4** | **Catalog backend:** categories, products, variants, images, inventory ledger, admin CRUD, public list with search/filter/sort/pagination | Tests for filters, the archived/draft visibility rules, stock adjustments |
| **5** | **Catalog frontend:** product list with filters, product detail with variant picker, admin product/category/inventory screens | Admin creates a product, and it appears on the storefront |
| **6** | **Addresses + cart:** backend + account pages + cart page | Cart reprices live; adding beyond available stock is rejected |
| **7** | **Orders (no payment yet):** `POST /orders` with transactional reservation, expiry job, order history, admin order list + status machine | A concurrency test proves no oversell; status rules are enforced |
| **8** | **Razorpay:** create/reuse payment order, checkout UI, `/payments/verify`, webhook with raw body + idempotency, refunds | Test-mode payment end to end; replayed webhook is a no-op; mismatch is handled |
| **9** | **Emails:** outbox, nodemailer (Ethereal/Mailtrap in development), order confirmation + admin new-order templates, password reset | Paying an order sends exactly one email to each recipient |
| **10** | **Hardening:** CSP, accessibility audit (axe/Lighthouse), error/loading states, admin dashboard metrics, seed data, README/deploy notes | Lighthouse a11y ≥ 95 on key pages; checklist in §7 verified |
