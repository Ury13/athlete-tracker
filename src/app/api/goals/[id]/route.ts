import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/goals/[id]
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
    const existing = await prisma.goal.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, targetValue, currentValue, unit, deadline, completed } = body;

    const data = await prisma.goal.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(targetValue !== undefined ? { targetValue } : {}),
        ...(currentValue !== undefined ? { currentValue } : {}),
        ...(unit !== undefined ? { unit } : {}),
        ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
        ...(completed !== undefined ? { completed } : {}),
      },
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[goals/[id] PUT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/goals/[id]
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
    const existing = await prisma.goal.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.goal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[goals/[id] DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
