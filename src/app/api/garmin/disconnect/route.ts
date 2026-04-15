import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.account.deleteMany({
      where: {
        provider: "garmin",
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[garmin/disconnect]", err);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
