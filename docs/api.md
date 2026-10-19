# API Reference

Base URL: `http://localhost:5000/api/v1`

All responses use the envelope described in [architecture.md](architecture.md#response-format).
Every response carries an `X-Request-Id` header; quote it when reporting a problem.

## Common error codes

| HTTP | Code                    | When                                                    |
| ---- | ----------------------- | ------------------------------------------------------- |
| 400  | `BAD_REQUEST`           | Request is semantically invalid                         |
| 400  | `VALIDATION_ERROR`      | Params/query/body failed validation (`details` lists each issue) |
| 400  | `INVALID_JSON`          | Body is not valid JSON                                  |
| 401  | `UNAUTHORIZED`          | Not logged in or session expired                        |
| 403  | `FORBIDDEN`             | Logged in but not allowed                               |
| 404  | `NOT_FOUND`             | Route or resource does not exist                        |
| 409  | `CONFLICT`              | State conflict (e.g. duplicate email, insufficient stock) |
| 413  | `PAYLOAD_TOO_LARGE`     | Body exceeds `BODY_SIZE_LIMIT`                          |
| 429  | `TOO_MANY_REQUESTS`     | Rate limit exceeded (see `RateLimit` / `Retry-After` headers) |
| 500  | `INTERNAL_SERVER_ERROR` | Unexpected failure                                      |

## Endpoints

### Health

| Method | Path      | Auth | Description     |
| ------ | --------- | ---- | --------------- |
| GET    | `/health` | –    | Liveness check  |

```json
{ "success": true, "data": { "status": "ok", "uptimeSeconds": 12, "timestamp": "2026-10-19T07:06:04.683Z" } }
```
