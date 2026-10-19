# Documentation

| Document                                          | Covers                                                                                  | Status                       |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------- |
| [architecture.md](architecture.md)                | System overview, directory tree, layer responsibilities, frontend↔API flow, build order | ✓                            |
| [development.md](development.md)                  | Local setup, MySQL, environment variables, scripts, troubleshooting                    | ✓                            |
| [api-conventions.md](api-conventions.md)          | URLs, response envelope, validation, pagination, money, error codes, endpoint list     | ✓ (endpoints grow per module) |
| `database.md`                                     | ER diagram, relationships, constraints, indexes, status enums                         | Database module              |
| `auth.md`                                         | Registration, JWT cookie flow, refresh/rotation, roles and permissions, CSRF defence   | Auth module                  |
| `payment-lifecycle.md`                            | Razorpay order → checkout → signature verification → webhook → refund; idempotency     | Payments module              |
| `order-lifecycle.md`                              | Order, shipment and return status machines, allowed transitions, emails per stage      | Orders / Shipments modules   |
| `testing-and-deployment.md`                       | Test strategy and commands, CI, production build, migrations on deploy, env hardening  | Hardening module             |

Each planned document is written by the module that implements its subject, so it always describes real behaviour.
