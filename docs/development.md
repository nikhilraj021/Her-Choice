# Local Development

## Prerequisites

- Node.js **22.12+** (`node -v`; see `.nvmrc`)
- npm 10+
- MySQL **8.0+** running locally

## 1. Create the database

Create a dedicated user. Prisma's `migrate dev` also needs permission to create a temporary *shadow database*, so the user gets global `CREATE`/`DROP` locally.

```sql
-- mysql -u root -p
CREATE DATABASE her_choice CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'her_choice'@'localhost' IDENTIFIED BY 'choose-a-strong-password';
GRANT ALL PRIVILEGES ON her_choice.* TO 'her_choice'@'localhost';
GRANT CREATE, DROP, ALTER, INDEX, REFERENCES ON *.* TO 'her_choice'@'localhost';  -- shadow database (development only)
FLUSH PRIVILEGES;
```

## 2. Backend

```powershell
cd backend
Copy-Item .env.example .env      # macOS/Linux: cp .env.example .env
# edit .env → set DATABASE_URL=mysql://her_choice:<password>@localhost:3306/her_choice
npm install
npm run dev                      # http://localhost:5000/api/v1/health
```

## 3. Frontend (second terminal)

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev                      # http://localhost:3000
```

The apps are independent: either can run, be tested, and be deployed without the other. The frontend only needs the API for pages that load data.

## Scripts

| App      | Script                | Purpose                                              |
| -------- | --------------------- | ---------------------------------------------------- |
| backend  | `npm run dev`         | Start with auto-restart on file changes              |
| backend  | `npm start`           | Start without watching (production)                  |
| backend  | `npm run lint`        | ESLint (`lint:fix` to auto-fix)                      |
| backend  | `npm test`            | All tests (`test:watch` to re-run on change)         |
| backend  | `npm run db:generate` | Regenerate the Prisma client after schema changes    |
| backend  | `npm run db:migrate`  | Create + apply a migration in development            |
| backend  | `npm run db:deploy`   | Apply pending migrations (production / CI)           |
| backend  | `npm run db:status`   | Show migration status                                |
| backend  | `npm run db:studio`   | Browse data in Prisma Studio                         |
| frontend | `npm run dev`         | Next.js dev server                                   |
| frontend | `npm run build`       | Production build                                     |
| frontend | `npm start`           | Serve the production build                           |
| frontend | `npm run lint`        | ESLint (`lint:fix` to auto-fix)                      |
| frontend | `npm test`            | Unit tests for utils and lib                         |

## Environment variables

The backend validates its variables at startup (`src/config/env.js`) and refuses to start if any are invalid. Commented sections in `backend/.env.example` become required in the module noted beside them.

### Backend (`backend/.env`)

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
| `DATABASE_URL`         | –                        | MySQL connection URL (used by Prisma)                  |

### Frontend (`frontend/.env.local`)

`NEXT_PUBLIC_*` values are embedded in the browser bundle: never put secrets in them.

| Variable               | Example                         | Description                    |
| ---------------------- | ------------------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_URL`  | `http://localhost:5000/api/v1`  | API base URL                   |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000`         | Public site URL for metadata   |

## Troubleshooting

| Symptom                                               | Fix                                                                                       |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `Port 5000 is already in use`                         | Another backend is running. Stop it (Ctrl+C in its terminal) or set a different `PORT`. |
| `Invalid environment configuration`                   | The message lists each bad variable; fix it in `backend/.env`.                            |
| `PrismaConfigEnvError: ... DATABASE_URL`              | Create `backend/.env` from `.env.example` and set `DATABASE_URL`.                          |
| Browser shows CORS error                              | Add the frontend origin (exact scheme + host + port) to `CORS_ORIGINS`.                   |
| `NEXT_PUBLIC_API_URL is not configured`               | Create `frontend/.env.local` and restart `npm run dev`.                                    |
