import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface HealthImportBody {
  date: string;
  weight?: number;
  restingHR?: number;
  sleepHours?: number;
  hrv?: number;
  steps?: number;
  vo2max?: number;
}

// POST /api/health/import
// Authenticated via API key (Authorization: Bearer {apiKey})
export async function POST(req: NextRequest) {
  // Extract API key from Authorization header
  const authHeader = req.headers.get("authorization") ?? "";
  const apiKey = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }

  // Find user by API key
  const user = await prisma.user.findUnique({
    where: { apiKey },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const userId = user.id;

  let body: HealthImportBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { date, weight, restingHR, sleepHours, hrv, steps, vo2max } = body;

  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  // Normalise to midnight UTC
  const parsedDate = new Date(date + "T00:00:00.000Z");
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD" },
      { status: 400 }
    );
  }

  // Build update/create objects — only include fields that were sent
  const updateData: Record<string, number | string | null> = {};
  if (weight !== undefined) updateData.weight = weight;
  if (restingHR !== undefined) updateData.restingHR = Math.round(restingHR);
  if (sleepHours !== undefined) updateData.sleepHours = sleepHours;
  if (hrv !== undefined) updateData.hrv = Math.round(hrv);
  if (vo2max !== undefined) updateData.vo2max = vo2max;
  // Store steps in notes field
  if (steps !== undefined) {
    updateData.notes = `steps:${Math.round(steps)}`;
  }

  try {
    await prisma.bodyMetric.upsert({
      where: { userId_date: { userId, date: parsedDate } },
      update: updateData,
      create: {
        userId,
        date: parsedDate,
        ...updateData,
      },
    });

    return NextResponse.json({
      success: true,
      date,
      updated: {
        weight: weight ?? null,
        restingHR: restingHR !== undefined ? Math.round(restingHR) : null,
        sleepHours: sleepHours ?? null,
        hrv: hrv !== undefined ? Math.round(hrv) : null,
      },
    });
  } catch (err) {
    console.error("[health/import]", err);
    return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
  }
}
