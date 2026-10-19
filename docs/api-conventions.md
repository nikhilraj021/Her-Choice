# API Conventions

Base URL: `http://localhost:5000/api/v1` (the version prefix is part of every path).

## URLs and methods

- Paths use plural, kebab-case nouns: `/products`, `/return-requests`, `/products/:id/reviews`.
- Admin endpoints live under `/admin/...` and require an admin role. Customer endpoints act on the logged-in user (`/users/me`, `/orders`).
- `GET` reads, `POST` creates or runs an action (`/orders/:id/cancel`), `PATCH` partially updates, `PUT` replaces, `DELETE` removes.
- Status changes are explicit actions (`POST /admin/orders/:id/ship`), never free-form `PATCH { status }`, so every transition is validated and audited.

## Response format

Every response is JSON in one of two envelopes.

```jsonc
// Success
{ "success": true, "data": { ... }, "message": "optional", "meta": { ... } }

// Error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [ ... ], "requestId": "uuid" } }
```

- **Controllers** respond with `sendSuccess(res, data, { status, message, meta })`.
- **Failures:** throw `ApiError` (e.g. `throw ApiError.notFound('Product not found')`).
  - Express 5 forwards rejected promises from async handlers to the error handler automatically.
- **Unknown errors** become a generic 500. Details are logged and never sent to clients in production.
- **Request IDs:** every response has an `X-Request-Id` header, also echoed as `error.requestId`. Quote it when reporting a problem.

## Validation

- `validate({ params, query, body })` runs Zod schemas from `src/validators/`.
- The parsed, coerced values, with unknown keys stripped, go on `req.validated`. Handlers read only from `req.validated`.
- A failure returns 400 `VALIDATION_ERROR`, and `details` lists every issue:

```json
{ "location": "body", "path": "email", "message": "Invalid email address" }
```

## Pagination, filtering and sorting (list endpoints)

- **Query:** `?page=1&limit=20&sort=price&order=asc&q=scarf&category=accessories`
  - `limit` is capped server-side.
  - `sort` accepts only allowlisted fields.
- **Response meta:** `{ "page": 1, "limit": 20, "total": 134, "totalPages": 7 }`

## Money

- Stored as MySQL `DECIMAL(12,2)` and calculated with Prisma `Decimal`, never JavaScript floats.
- Sent in JSON as **decimal strings** (`"1499.00"`), currency INR. The frontend formats them for display only.

## Idempotency

- Retryable writes (place order, create payment) accept an `Idempotency-Key` header.
- Razorpay callbacks and webhooks are de-duplicated by Razorpay's payment/event IDs.

## Error codes

| HTTP | Code                    | When                                                             |
| ---- | ----------------------- | ---------------------------------------------------------------- |
| 400  | `BAD_REQUEST`           | Request is semantically invalid                                  |
| 400  | `VALIDATION_ERROR`      | Params/query/body failed validation (`details` lists each issue) |
| 400  | `INVALID_JSON`          | Body is not valid JSON                                           |
| 401  | `UNAUTHORIZED`          | Not logged in or session expired                                 |
| 403  | `FORBIDDEN`             | Logged in but not allowed                                        |
| 404  | `NOT_FOUND`             | Route or resource does not exist                                 |
| 409  | `CONFLICT`              | State conflict (duplicate email, insufficient stock, invalid status transition) |
| 413  | `PAYLOAD_TOO_LARGE`     | Body exceeds `BODY_SIZE_LIMIT`                                   |
| 415  | `UNSUPPORTED_ENCODING`  | Unsupported body encoding/charset                                |
| 429  | `TOO_MANY_REQUESTS`     | Rate limit exceeded (see `RateLimit` / `Retry-After` headers)    |
| 500  | `INTERNAL_SERVER_ERROR` | Unexpected failure                                               |
| 503  | `SERVICE_UNAVAILABLE`   | Database unreachable or overloaded; retry later                  |

Unhandled Prisma errors are mapped as a safety net:
- `P2002` (unique) and `P2003` (foreign key) → 409
- `P2025` (record not found) → 404
- `P2000` (value too long) → 400
- connection errors → 503

Services still translate expected cases themselves, to give specific messages.

## Endpoints

Each module adds its endpoints here.

### Health

| Method | Path      | Auth | Description    |
| ------ | --------- | ---- | -------------- |
| GET    | `/health` | –    | API and database health. `200` when healthy, `503` when the database is unreachable. Never cached. |

```jsonc
// 200 OK
{
  "success": true,
  "data": {
    "status": "ok",
    "uptimeSeconds": 12,
    "timestamp": "2026-10-19T07:06:04.683Z",
    "checks": { "database": { "status": "up", "latencyMs": 2 } }
  }
}

// 503 Service Unavailable
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service temporarily unavailable",
    "details": { "status": "unavailable", "uptimeSeconds": 12, "timestamp": "...", "checks": { "database": { "status": "down" } } },
    "requestId": "..."
  }
}
```
