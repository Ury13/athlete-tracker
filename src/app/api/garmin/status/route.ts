import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.account.findFirst({
    where: {
      provider: "garmin",
      userId: session.user.id,
    },
  });

  const connected = !!account;

  let lastSync: string | null = null;
  if (connected) {
    const latest = await prisma.bodyMetric.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    lastSync = latest?.createdAt?.toISOString() ?? null;
  }

  return NextResponse.json({ connected, lastSync });
}
