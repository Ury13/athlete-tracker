import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/diet
// Query: date (exact ISO date), from, to (ISO), limit (default 100)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const { searchParams } = req.nextUrl;
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);

    let dateFilter: Record<string, unknown> = {};

    if (date) {
      // Match the full calendar day
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      dateFilter = { date: { gte: start, lte: end } };
    } else if (from || to) {
      dateFilter = {
        date: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      };
    }

    const data = await prisma.dietEntry.findMany({
      where: { userId, ...dateFilter },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[diet GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/diet
// Body: DietEntryInput
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const body = await req.json();
    const { date, mealType, foodName, calories, protein, carbs, fat, fiber, notes } = body;

    if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });
    if (!mealType) return NextResponse.json({ error: "mealType is required" }, { status: 400 });
    if (!foodName) return NextResponse.json({ error: "foodName is required" }, { status: 400 });

    const data = await prisma.dietEntry.create({
      data: {
        userId,
        date: new Date(date),
        mealType,
        foodName,
        calories: calories ?? null,
        protein: protein ?? null,
        carbs: carbs ?? null,
        fat: fat ?? null,
        fiber: fiber ?? null,
        notes: notes ?? null,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[diet POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
