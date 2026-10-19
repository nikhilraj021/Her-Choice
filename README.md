# Her Choice

End-to-end e-commerce platform: a Next.js storefront, customer account area and admin dashboard, backed by an Express REST API and MySQL.

| Folder                  | What it is                                              | Default URL                    |
| ----------------------- | ------------------------------------------------------- | ------------------------------ |
| [`backend/`](backend)   | Express 5 REST API (ES modules), Prisma 7, MySQL 8      | http://localhost:5000/api/v1   |
| [`frontend/`](frontend) | Next.js 16 App Router, Tailwind CSS 4, Zustand          | http://localhost:3000          |
| [`docs/`](docs)         | Architecture, conventions, setup and lifecycle docs     |                                |

The two apps are independent: each has its own `package.json`, dependencies, environment file, scripts and tests.

## Quick start

Requires Node.js 22.12+ and MySQL 8. Full instructions: [docs/development.md](docs/development.md).

```powershell
# Terminal 1: API
cd backend
Copy-Item .env.example .env      # then set DATABASE_URL
npm install
npm run dev

# Terminal 2: website
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

## Common commands

| Task         | Backend               | Frontend         |
| ------------ | --------------------- | ---------------- |
| Develop      | `npm run dev`         | `npm run dev`    |
| Lint         | `npm run lint`        | `npm run lint`   |
| Test         | `npm test`            | `npm test`       |
| Build/start  | `npm start`           | `npm run build && npm start` |
| Migrations   | `npm run db:migrate`  | –                |

## Documentation

See [docs/README.md](docs/README.md). Start with [architecture.md](docs/architecture.md).
