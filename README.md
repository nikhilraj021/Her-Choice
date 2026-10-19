# Her Choice

End-to-end e-commerce platform: a Next.js storefront/admin panel backed by an Express REST API and MySQL.

| Folder                  | What it is                                    | Default URL                      |
| ----------------------- | --------------------------------------------- | -------------------------------- |
| [`backend/`](backend)   | Express 5 REST API (ES modules)               | http://localhost:5000/api/v1     |
| [`frontend/`](frontend) | Next.js App Router + Tailwind CSS             | http://localhost:3000            |
| [`docs/`](docs)         | Architecture, conventions and API reference   |                                  |

The two apps are independent: each has its own `package.json`, dependencies, environment file and scripts.

## Prerequisites

- Node.js **22.12+** (see `.nvmrc`)
- npm 10+
- MySQL 8 (required from the Database module onward)

## Setup

```bash
# Backend
cd backend
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
npm install
npm run dev                 # http://localhost:5000/api/v1/health

# Frontend (in a second terminal)
cd frontend
cp .env.example .env.local  # Windows PowerShell: Copy-Item .env.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

## Scripts

| App      | Command              | Purpose                                  |
| -------- | -------------------- | ---------------------------------------- |
| backend  | `npm run dev`        | Start with auto-restart (`node --watch`) |
| backend  | `npm start`          | Start for production                     |
| backend  | `npm test`           | Run the test suite (`node:test`)         |
| frontend | `npm run dev`        | Next.js dev server                       |
| frontend | `npm run build`      | Production build                         |
| frontend | `npm start`          | Serve the production build               |
| frontend | `npm run lint`       | ESLint                                   |

## Environment variables

### Backend (`backend/.env`)

The API validates these at startup and refuses to start if any are invalid.

| Variable               | Default                  | Description                                            |
| ---------------------- | ------------------------ | ------------------------------------------------------ |
| `NODE_ENV`             | `development`            | `development`, `production` or `test`                  |
| `PORT`                 | `5000`                   | HTTP port                                              |
| `CORS_ORIGINS`         | `http://localhost:3000`  | Comma-separated browser origins allowed with cookies   |
| `TRUST_PROXY`          | `0`                      | Reverse-proxy hops in front of the API                 |
| `LOG_LEVEL`            | `info`                   | pino log level                                         |
| `BODY_SIZE_LIMIT`      | `100kb`                  | Max JSON / form body size                              |
| `RATE_LIMIT_WINDOW_MS` | `900000`                 | Global rate-limit window (ms)                          |
| `RATE_LIMIT_MAX`       | `300`                    | Requests per IP per window                             |

### Frontend (`frontend/.env.local`)

| Variable               | Example                         | Description                    |
| ---------------------- | ------------------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_URL`  | `http://localhost:5000/api/v1`  | API base URL (public)          |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000`         | Public site URL for metadata   |

## Documentation

- [Architecture & conventions](docs/architecture.md)
- [API reference](docs/api.md)
