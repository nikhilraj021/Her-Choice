# Architecture

## Overview

Her Choice is split into two independently deployable applications:

| App        | Stack                                         | Responsibility                                                                                     |
| ---------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `backend`  | Node.js, Express 5, Prisma, MySQL             | **All** business logic: pricing, stock, orders, payments, authorization, emails, audit logs        |
| `frontend` | Next.js (App Router), Tailwind CSS, Zustand   | Presentation only. Renders data from the API and submits user intent. Never the source of truth.  |

```
Browser ──► Next.js (frontend :3000) ──► Express API (backend :5000/api/v1) ──► MySQL
                                              │
                                              ├──► Razorpay (orders, signature + webhook verification)
                                              ├──► Cloudinary (signed image uploads)
                                              └──► SMTP / Brevo (transactional email)
```

### Trust boundary

The API recalculates and verifies everything the browser sends:

- Prices, discounts, shipping and totals are computed server-side from the database.
- Stock is checked and reserved inside database transactions.
- Roles come from the database / signed JWT, never from the request body.
- Payment success is accepted only after Razorpay signature or webhook verification.

## Target folder structure

Folders are created by the module that first needs them (Git does not track empty folders).

```
Her-Choice/
├── backend/
│   ├── prisma/                  # schema.prisma, migrations/, seed.js            (Database module)
│   ├── src/
│   │   ├── app.js               # Express app factory (no port binding; used by tests)
│   │   ├── server.js            # Entry point: listen + graceful shutdown
│   │   ├── config/              # env validation, third-party client config
│   │   ├── constants/           # status enums, roles, business rules           (Database module)
│   │   ├── lib/                 # prisma client, razorpay, cloudinary, mailer instances
│   │   ├── middlewares/         # cross-cutting Express middleware
│   │   ├── modules/             # one folder per feature
│   │   │   └── <feature>/
│   │   │       ├── <feature>.routes.js      # URL → middleware chain → controller
│   │   │       ├── <feature>.controller.js  # HTTP in/out only
│   │   │       ├── <feature>.service.js     # business logic + transactions
│   │   │       └── <feature>.schemas.js     # Zod request schemas
│   │   ├── routes/index.js      # mounts every feature router under /api/v1
│   │   └── utils/               # ApiError, response helpers, logger, money helpers
│   └── tests/                   # node:test + supertest
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (shop)/          # storefront routes: products, cart, checkout, account
│       │   ├── (auth)/          # login, register, password reset
│       │   └── admin/           # admin panel (role-guarded)
│       ├── components/          # ui/, layout/, product/, cart/, admin/ ...
│       ├── config/              # site config
│       ├── hooks/               # reusable React hooks
│       ├── lib/                 # api-client, formatters, validation schemas
│       └── store/               # Zustand stores (UI/cart state only)
└── docs/
```

## Backend conventions

### Request pipeline (`src/app.js`)

1. `httpLogger` – structured pino logs; assigns `req.id` and the `X-Request-Id` response header
2. `helmet` – security headers
3. `cors` – allowlist from `CORS_ORIGINS`, credentials enabled for auth cookies
4. `compression`
5. Global rate limiter on `/api/v1`
6. *(payments module)* raw-body Razorpay webhook route, before the JSON parser
7. JSON / urlencoded parsers with `BODY_SIZE_LIMIT`; cookie parser
8. Feature routers under `/api/v1`
9. `notFound` → `errorHandler`

### Response format

```jsonc
// success
{ "success": true, "data": { ... }, "message": "optional", "meta": { "page": 1, "total": 42 } }

// error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [ ... ], "requestId": "uuid" } }
```

Controllers respond with `sendSuccess(res, data, { status, message, meta })` and signal failures by
throwing `ApiError` (e.g. `throw ApiError.notFound('Product not found')`). Express 5 forwards
rejected promises from async handlers to the error handler automatically, so no `asyncHandler`
wrapper is needed. Unknown errors become a generic 500; details are logged, never returned in production.

### Validation

`validate({ params, query, body })` runs Zod schemas and puts the parsed, coerced, unknown-key-stripped
values on `req.validated`. Handlers read only from `req.validated`, never from raw `req.body`/`req.query`.

### Naming

- Files: `camelCase.js` for utilities, `<feature>.<layer>.js` inside modules, `PascalCase.js` for React components.
- API paths: plural, kebab-case nouns (`/api/v1/products`, `/api/v1/admin/return-requests`).
- Error codes: `SCREAMING_SNAKE_CASE`, stable once published.

## Module roadmap

Each module is designed, implemented, tested and approved before the next begins.

| #  | Module                                    | Key outputs                                                                 |
| -- | ----------------------------------------- | --------------------------------------------------------------------------- |
| 0  | Project structure & foundations           | Both apps runnable, error/response/validation/security conventions, tests  |
| 1  | Database schema & Prisma                  | Full schema, status enums, money as `DECIMAL`, migrations, seed, readiness |
| 2  | Authentication & users                    | Register/login/logout, JWT in HTTP-only cookies, refresh, RBAC, profile    |
| 3  | Categories & products (admin + public)    | CRUD, publish/archive, search/filter/sort/paginate, inventory fields       |
| 4  | Image uploads                             | Cloudinary signed uploads, product image management                        |
| 5  | Addresses                                 | Multiple delivery addresses, default address                               |
| 6  | Cart & wishlist                           | Server-side cart with live price/stock validation, wishlist                |
| 7  | Checkout & orders                         | Price recalculation, stock reservation in transactions, snapshots, COD     |
| 8  | Payments                                  | Razorpay orders, signature verification, webhooks, idempotency, refunds    |
| 9  | Shipments, cancellations & returns        | Status workflows, delivery confirmation, return/refund requests            |
| 10 | Reviews & ratings                         | Verified-purchase reviews, moderation                                      |
| 11 | Email notifications                       | SMTP/Brevo templates for order lifecycle events                            |
| 12 | Admin dashboard, reports & audit logs     | Metrics, reports, audit trail for sensitive actions                        |
| 13 | Frontend storefront & admin UI            | Built progressively alongside modules 2–12                                 |
| 14 | Hardening & deployment                    | CSP, shared rate-limit store, CI, production configuration                 |
