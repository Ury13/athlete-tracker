# AthletIQ — Personal Training Tracker

An all-in-one personal tracker for training sessions, diet logging, body metrics, and goals — with AI-powered insights via Claude.

## Tech Stack

- **Next.js 14** (App Router) + TypeScript strict
- **Tailwind CSS v3** + Lucide React icons
- **Prisma v6** + SQLite (better-sqlite3 adapter)
- **NextAuth v5** with Credentials provider
- **Recharts** for data visualisation
- **Anthropic SDK** (claude-sonnet-4-6) for AI insights

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
- `AUTH_SECRET` — generate with `openssl rand -hex 32`
- `ANTHROPIC_API_KEY` — your Anthropic API key
- `DATABASE_URL` — leave as `file:./prisma/dev.db` for local SQLite

### 3. Generate Prisma client and push schema

```bash
npx prisma generate
npx prisma db push
```

### 4. Seed the default user

```bash
curl -X POST http://localhost:3000/api/seed
```

Or after starting the dev server, visit `POST /api/seed` with any HTTP client.

Default credentials:
- **Email:** admin@athletiq.com
- **Password:** athletiq123

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    (auth)/login/       — Login page
    (dashboard)/        — Protected dashboard layout + routes
      page.tsx          — Dashboard home
    api/
      auth/[...nextauth]/ — NextAuth handlers
      seed/             — Database seed endpoint
    globals.css
    layout.tsx          — Root layout with SessionProvider
  components/
    Sidebar.tsx         — Navigation sidebar (collapsible on mobile)
  lib/
    auth.ts             — NextAuth v5 config
    prisma.ts           — Prisma client (better-sqlite3 adapter)
  types/
    index.ts            — TypeScript interfaces
prisma/
  schema.prisma         — Database schema
```

## Models

| Model | Description |
|---|---|
| `User` | Authentication + profile |
| `TrainingSession` | Runs, rides, swims, strength, yoga, etc. |
| `DietEntry` | Meal logging with macro breakdown |
| `BodyMetric` | Weight, HR, sleep, HRV, VO2max |
| `Goal` | Targets with progress tracking |

## Prisma Studio

```bash
npm run prisma:studio
```
