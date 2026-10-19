# System Architecture

## Overview

Her Choice is a monorepo containing two independently runnable and deployable applications:

| App        | Stack                                                    | Responsibility                                                                                   |
| ---------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `backend`  | Node.js 22, Express 5 (ES modules), Prisma 7, MySQL 8    | **All** business logic: pricing, stock, orders, payments, authorization, emails, audit logs     |
| `frontend` | Next.js 16 (App Router), React 19, Tailwind CSS 4, Zustand | Presentation only. Renders API data and submits user intent. Never the source of truth.        |

```
Browser ──► Next.js frontend (:3000)
   │
   └──(fetch, credentials: 'include')──► Express API (:5000/api/v1) ──► MySQL (Prisma)
                                              ├──► Razorpay   (orders, signature + webhook verification)
                                              ├──► Cloudinary (signed image uploads)
                                              └──► SMTP/Brevo (transactional email)
Razorpay webhooks ───────────────────────────► Express API (/api/v1/payments/webhook)
```

### Trust boundary

The API recalculates and verifies everything the browser sends:

- Prices, discounts, shipping and totals are computed server-side from the database.
- Stock is checked and decremented inside database transactions.
- Roles come from the database / signed JWT, never from the request body.
- Payment success is accepted only after Razorpay signature or webhook verification.
- Frontend route guards (account/admin) exist for UX only; the API enforces authorization on every request.

## Directory tree

`✓` = exists now · `·` = planned, created by the module noted in brackets.
Empty planned folders contain a `.gitkeep` so Git tracks them.

```
Her-Choice/
├── README.md                              ✓
├── .gitignore  .gitattributes  .editorconfig  .nvmrc   ✓
├── docs/                                  ✓ (see docs/README.md)
│
├── backend/
│   ├── package.json  package-lock.json    ✓
│   ├── .env.example                       ✓
│   ├── eslint.config.js                   ✓
│   ├── prisma.config.js                   ✓ Prisma CLI config (schema path, migrations, DATABASE_URL)
│   ├── prisma/
│   │   ├── schema.prisma                  ✓ generator + datasource; models  · [Database]
│   │   ├── migrations/                    · [Database]
│   │   └── seed.js                        · [Database]
│   ├── src/
│   │   ├── app.js                         ✓ Express app factory (no port binding; used by tests)
│   │   ├── server.js                      ✓ entry point: listen + graceful shutdown
│   │   ├── config/
│   │   │   ├── env.js                     ✓ validated environment
│   │   │   ├── database.js                · Prisma client instance [Backend foundation]
│   │   │   ├── razorpay.js                · [Payments]
│   │   │   ├── cloudinary.js              · [Uploads]
│   │   │   └── mailer.js                  · [Notifications]
│   │   ├── constants/                     · roles, statuses, business rules [Database]
│   │   ├── middlewares/
│   │   │   ├── cors.js  httpLogger.js  rateLimiter.js            ✓
│   │   │   ├── validate.js  notFound.js  errorHandler.js         ✓
│   │   │   ├── authenticate.js  authorize.js                     · [Auth]
│   │   │   └── idempotency.js                                    · [Checkout/Payments]
│   │   ├── routes/
│   │   │   ├── index.js                   ✓ mounts every router under /api/v1
│   │   │   ├── health.routes.js           ✓
│   │   │   ├── <feature>.routes.js        · public/customer routes
│   │   │   └── admin/<feature>.routes.js  · admin-only routes (/api/v1/admin/...)
│   │   ├── controllers/<feature>.controller.js   ✓ health · others per module
│   │   ├── services/<feature>.service.js         · business logic + transactions
│   │   ├── repositories/<entity>.repository.js   · Prisma queries
│   │   ├── validators/<feature>.validator.js     · Zod request schemas
│   │   ├── jobs/                          · scheduled work (expire unpaid orders, reconcile payments, email retries)
│   │   ├── templates/emails/              · transactional email templates [Notifications]
│   │   └── utils/
│   │       ├── ApiError.js  apiResponse.js  logger.js            ✓
│   │       └── money.js  pagination.js  slug.js                  · as needed
│   └── tests/
│       ├── setup.js                       ✓ test environment preload
│       ├── unit/                          ✓ pure logic (pricing, validators, middleware)
│       └── integration/                   ✓ HTTP-level tests via supertest
│
└── frontend/
    ├── package.json  package-lock.json    ✓
    ├── .env.example                       ✓
    ├── next.config.mjs  postcss.config.mjs  eslint.config.mjs  jsconfig.json   ✓
    ├── public/                            ✓ static assets (logo, favicon, placeholder images)
    ├── tests/unit/                        ✓ node:test unit tests for utils and lib
    └── src/
        ├── app/
        │   ├── layout.js                  ✓ root document shell (fonts, metadata)
        │   ├── globals.css                ✓ Tailwind + theme tokens
        │   ├── not-found.js               ✓ public 404
        │   ├── global-error.js            ✓ last-resort error boundary
        │   ├── (storefront)/              ✓ public site: header + footer
        │   │   ├── layout.js  loading.js  error.js  page.js (home)   ✓
        │   │   ├── products/  products/[slug]/  categories/[slug]/   · [Products]
        │   │   ├── search/                                           · [Products]
        │   │   ├── cart/  wishlist/                                  · [Cart & wishlist]
        │   │   └── checkout/                                         · [Checkout]
        │   ├── (auth)/                    · login, register, forgot/reset password [Auth]
        │   ├── (account)/account/         ✓ customer area: header + side nav
        │   │   ├── layout.js  loading.js  error.js  page.js          ✓
        │   │   ├── profile/  addresses/                              · [Auth, Addresses]
        │   │   ├── orders/  orders/[orderNumber]/                    · [Orders]
        │   │   └── returns/  reviews/                                · [Returns, Reviews]
        │   └── admin/                     ✓ admin dashboard: own shell + side nav
        │       ├── layout.js  loading.js  error.js  not-found.js  page.js   ✓
        │       └── products/ categories/ inventory/ orders/ payments/
        │           shipments/ returns/ reviews/ customers/ reports/ audit-logs/   · per module
        ├── components/
        │   ├── ui/                        ✓ Button, Input, Spinner, EmptyState, ErrorState
        │   └── layout/                    ✓ SiteHeader, SiteFooter, SideNav
        ├── features/<feature>/            · components/, hooks/, schemas.js specific to one feature
        ├── hooks/                         · shared React hooks (useDebounce, useMediaQuery)
        ├── lib/
        │   ├── api-client.js              ✓ fetch wrapper for the API
        │   ├── navigation.js              ✓ account/admin nav entries
        │   └── site.js                    ✓ site name, URL, description
        ├── services/<feature>.service.js  · one function per API endpoint (productService.list, ...)
        ├── store/                         · Zustand stores (cart badge, UI state)
        └── utils/
            ├── cn.js                      ✓ Tailwind class merging
            └── format.js                  ✓ currency (INR) and date formatting
```

## Folder responsibilities

### Backend: request flow through the layers

```
route  ──►  middlewares (authenticate, authorize, validate)  ──►  controller  ──►  service  ──►  repository  ──►  Prisma
```

| Folder           | Responsibility                                                                                                  | Must NOT                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `routes/`        | Map URL + method to a middleware chain and controller. Admin routes live in `routes/admin/` behind role checks. | Contain logic                                  |
| `validators/`    | Zod schemas for `params`, `query` and `body` of each endpoint.                                                  | Touch the database                             |
| `controllers/`   | Translate HTTP ⇄ service calls: read `req.validated` and `req.user`, call a service, `sendSuccess()`.           | Contain business rules or Prisma calls         |
| `services/`      | Business rules: pricing, stock, status transitions, payment verification. Own database transactions.            | Read `req`/`res`                               |
| `repositories/`  | All Prisma queries for one entity; accept an optional transaction client (`tx`).                                | Make business decisions                        |
| `middlewares/`   | Cross-cutting concerns: logging, security, auth, validation, errors.                                            |                                                |
| `config/`        | Validated env and configured third-party clients (Prisma, Razorpay, Cloudinary, mailer).                         | Read `process.env` anywhere else               |
| `constants/`     | Single source of truth for roles and every status enum and allowed transition.                                  |                                                |
| `jobs/`          | Scheduled/background tasks, each idempotent and safe to re-run.                                                 |                                                |
| `templates/`     | Email templates rendered by the notifications service.                                                          |                                                |
| `utils/`         | Small, pure helpers.                                                                                            | Depend on Express or Prisma                    |

### Planned backend features

| Feature         | Routes (public / customer)     | Admin routes                      | Service / repository                  |
| --------------- | ------------------------------ | --------------------------------- | ------------------------------------- |
| Authentication  | `/auth`                        |                                   | `auth.service`, `user.repository`, `refreshToken.repository` |
| Users           | `/users/me`                    | `/admin/customers`                | `user.service`                        |
| Addresses       | `/addresses`                   | `/admin/customers/:id/addresses`  | `address.service/repository`          |
| Categories      | `/categories`                  | `/admin/categories`               | `category.service/repository`         |
| Products        | `/products`                    | `/admin/products`                 | `product.service/repository`          |
| Inventory       |                                | `/admin/inventory`                | `inventory.service` (stock movements) |
| Cart            | `/cart`                        |                                   | `cart.service/repository`             |
| Wishlist        | `/wishlist`                    |                                   | `wishlist.service/repository`         |
| Checkout        | `/checkout`                    |                                   | `checkout.service` (quote, place order) |
| Orders          | `/orders`                      | `/admin/orders`                   | `order.service/repository`            |
| Payments        | `/payments`, `/payments/webhook` | `/admin/payments`               | `payment.service/repository`          |
| Shipments       | `/orders/:id/tracking`         | `/admin/shipments`                | `shipment.service/repository`         |
| Returns         | `/returns`                     | `/admin/returns`                  | `return.service/repository`           |
| Reviews         | `/products/:id/reviews`        | `/admin/reviews`                  | `review.service/repository`           |
| Notifications   | (internal)                     |                                   | `notification.service`, `templates/emails` |
| Admin analytics |                                | `/admin/analytics`, `/admin/reports`, `/admin/audit-logs` | `analytics.service`, `auditLog.repository` |

### Frontend

| Folder          | Responsibility                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| `app/`          | Routes, layouts, and route-level `loading.js` / `error.js` / `not-found.js`. Thin: compose features.       |
| `components/`   | Reusable, feature-agnostic UI (`ui/`) and page chrome (`layout/`).                                         |
| `features/`     | Everything specific to one feature: its components, hooks and Zod form schemas (e.g. `features/cart/`).   |
| `services/`     | One function per API endpoint, built on `lib/api-client.js`. Components never call `fetch` directly.      |
| `store/`        | Zustand for client-only state (UI toggles, optimistic cart badge). Server data is not duplicated here.    |
| `hooks/`        | Shared React hooks.                                                                                        |
| `lib/`          | Configured infrastructure: API client, site config, navigation.                                            |
| `utils/`        | Pure helpers (formatting, class names). No React, no network.                                             |
| `public/`       | Static files served as-is.                                                                                 |

**Route areas:**

- `(storefront)` is the public site, with a header and footer.
- `(account)/account` is the customer area, behind a login check (Auth module).
- `admin` has its own shell and a role check (Auth module).

Route groups in parentheses only group files; they don't appear in URLs.

## How the frontend talks to the backend

1. Components call a **service** (`services/product.service.js`). The service calls **`api`** from `lib/api-client.js`.
2. `api-client` sends `fetch(NEXT_PUBLIC_API_URL + path)` with `credentials: 'include'` and JSON bodies.
3. The API's CORS allowlist (`CORS_ORIGINS`) permits the frontend origin with credentials.
4. **Auth:** the API sets HTTP-only, `Secure` (in production), `SameSite=Lax` cookies.
   - JavaScript never sees tokens; the browser attaches the cookies automatically.
   - `localhost:3000` and `localhost:5000` count as the same *site*, so cookies work in development.
   - In production, serve the API from a subdomain of the storefront (e.g. `shop.example.com` and `api.example.com`) so the cookies stay first-party.
5. **Responses:** `api-client` unwraps `{ success, data, meta, message }`. On failure it throws `ApiClientError`, with `status`, `code`, `details` (field errors for forms) and `requestId`.
6. **Server components:** these don't have the browser's cookies. For authenticated server-side fetches, the Auth module adds a helper that forwards the incoming request's cookies explicitly. Public data (products, categories) is fetched server-side without cookies, for SEO.

## Recommended implementation sequence

Each step is designed, implemented, tested and approved before the next.

| #  | Module                                   | Why this order                                                                 |
| -- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| 0  | Project structure & configuration ✓      | Everything else plugs into it                                                  |
| 1  | Backend foundation                       | Prisma client, DB readiness check, Prisma error mapping, pagination/money utils |
| 2  | Database schema                          | All models, enums, constraints, `DECIMAL` money, migrations, seed              |
| 3  | Authentication & users                   | Every customer/admin feature depends on identity and roles                     |
| 4  | Categories & products (+ inventory)      | Catalogue needed by cart, orders and reviews                                   |
| 5  | Image uploads (Cloudinary)               | Completes product management                                                   |
| 6  | Addresses                                | Needed by checkout                                                             |
| 7  | Cart & wishlist                          | Needed by checkout                                                             |
| 8  | Checkout & orders (incl. COD)            | Core transaction: price recalculation, stock in transactions, snapshots       |
| 9  | Payments (Razorpay)                      | Builds on orders: signature + webhook verification, idempotency, refunds       |
| 10 | Shipments, cancellations & returns       | Post-purchase lifecycle                                                        |
| 11 | Reviews & ratings                        | Requires delivered orders for eligibility                                      |
| 12 | Email notifications                      | Hooks into order/payment/shipment events                                       |
| 13 | Admin analytics, reports & audit logs    | Aggregates data produced by all earlier modules                                |
| 14 | Hardening & deployment                   | CSP, shared rate-limit store, CI, production config                           |

Frontend pages for each module are built in the same step as its API, so every feature is usable end-to-end when approved.
