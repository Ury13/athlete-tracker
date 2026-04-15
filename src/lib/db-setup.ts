import { prisma } from "./prisma";

/**
 * Creates all tables if they don't exist.
 * Uses IF NOT EXISTS — safe to call on every server startup.
 */
export async function setupDatabase(): Promise<void> {
  const statements = [
    // ── User ────────────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS "User" (
      "id"            TEXT NOT NULL,
      "email"         TEXT,
      "name"          TEXT,
      "image"         TEXT,
      "emailVerified" TIMESTAMP(3),
      "apiKey"        TEXT UNIQUE,
      "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "User_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
    // Add columns if the table already existed without them
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3)`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "apiKey" TEXT UNIQUE`,

    // ── Account (NextAuth OAuth) ─────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS "Account" (
      "id"                TEXT NOT NULL,
      "userId"            TEXT NOT NULL,
      "type"              TEXT NOT NULL,
      "provider"          TEXT NOT NULL,
      "providerAccountId" TEXT NOT NULL,
      "refresh_token"     TEXT,
      "access_token"      TEXT,
      "expires_at"        INTEGER,
      "token_type"        TEXT,
      "scope"             TEXT,
      "id_token"          TEXT,
      "session_state"     TEXT,
      CONSTRAINT "Account_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key"
      ON "Account"("provider", "providerAccountId")`,

    // ── Session ──────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS "Session" (
      "id"           TEXT NOT NULL,
      "sessionToken" TEXT NOT NULL,
      "userId"       TEXT NOT NULL,
      "expires"      TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key"
      ON "Session"("sessionToken")`,

    // ── VerificationToken ────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS "VerificationToken" (
      "identifier" TEXT NOT NULL,
      "token"      TEXT NOT NULL,
      "expires"    TIMESTAMP(3) NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key"
      ON "VerificationToken"("token")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key"
      ON "VerificationToken"("identifier", "token")`,

    // ── TrainingSession ──────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS "TrainingSession" (
      "id"              TEXT NOT NULL,
      "userId"          TEXT NOT NULL,
      "stravaId"        TEXT UNIQUE,
      "date"            TIMESTAMP(3) NOT NULL,
      "type"            TEXT NOT NULL,
      "name"            TEXT,
      "distance"        DOUBLE PRECISION,
      "duration"        INTEGER NOT NULL,
      "pace"            DOUBLE PRECISION,
      "heartRateAvg"    INTEGER,
      "heartRateMax"    INTEGER,
      "elevationGain"   DOUBLE PRECISION,
      "calories"        INTEGER,
      "perceivedEffort" INTEGER NOT NULL,
      "notes"           TEXT,
      "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "TrainingSession_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    // Add new columns to existing tables
    `ALTER TABLE "TrainingSession" ADD COLUMN IF NOT EXISTS "stravaId" TEXT UNIQUE`,
    `ALTER TABLE "TrainingSession" ADD COLUMN IF NOT EXISTS "name" TEXT`,

    // ── DietEntry ────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS "DietEntry" (
      "id"        TEXT NOT NULL,
      "userId"    TEXT NOT NULL,
      "date"      TIMESTAMP(3) NOT NULL,
      "mealType"  TEXT NOT NULL,
      "foodName"  TEXT NOT NULL,
      "calories"  INTEGER,
      "protein"   DOUBLE PRECISION,
      "carbs"     DOUBLE PRECISION,
      "fat"       DOUBLE PRECISION,
      "fiber"     DOUBLE PRECISION,
      "notes"     TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DietEntry_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "DietEntry_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,

    // ── BodyMetric ───────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS "BodyMetric" (
      "id"           TEXT NOT NULL,
      "userId"       TEXT NOT NULL,
      "date"         TIMESTAMP(3) NOT NULL,
      "weight"       DOUBLE PRECISION,
      "restingHR"    INTEGER,
      "sleepHours"   DOUBLE PRECISION,
      "sleepQuality" INTEGER,
      "hrv"          INTEGER,
      "vo2max"       DOUBLE PRECISION,
      "notes"        TEXT,
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BodyMetric_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "BodyMetric_userId_date_key" UNIQUE ("userId", "date"),
      CONSTRAINT "BodyMetric_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,

    // ── Goal ─────────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS "Goal" (
      "id"           TEXT NOT NULL,
      "userId"       TEXT NOT NULL,
      "title"        TEXT NOT NULL,
      "description"  TEXT,
      "type"         TEXT NOT NULL,
      "targetValue"  DOUBLE PRECISION,
      "currentValue" DOUBLE PRECISION,
      "unit"         TEXT,
      "deadline"     TIMESTAMP(3),
      "completed"    BOOLEAN NOT NULL DEFAULT false,
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Goal_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
  ];

  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }
}
