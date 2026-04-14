import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/training/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await params;

  try {
    const data = await prisma.trainingSession.findFirst({
      where: { id, userId },
    });

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[training/[id] GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/training/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await params;

  try {
    // Verify ownership
    const existing = await prisma.trainingSession.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { date, type, duration, distance, pace, heartRateAvg, heartRateMax,
            elevationGain, calories, perceivedEffort, notes } = body;

    const data = await prisma.trainingSession.update({
      where: { id },
      data: {
        ...(date !== undefined ? { date: new Date(date) } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(duration !== undefined ? { duration } : {}),
        ...(distance !== undefined ? { distance } : {}),
        ...(pace !== undefined ? { pace } : {}),
        ...(heartRateAvg !== undefined ? { heartRateAvg } : {}),
        ...(heartRateMax !== undefined ? { heartRateMax } : {}),
        ...(elevationGain !== undefined ? { elevationGain } : {}),
        ...(calories !== undefined ? { calories } : {}),
        ...(perceivedEffort !== undefined ? { perceivedEffort } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[training/[id] PUT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/training/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await params;

  try {
    const existing = await prisma.trainingSession.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.trainingSession.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[training/[id] DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
