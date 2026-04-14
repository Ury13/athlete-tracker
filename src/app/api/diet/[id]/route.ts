import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/diet/[id]
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
    const existing = await prisma.dietEntry.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.dietEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[diet/[id] DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
