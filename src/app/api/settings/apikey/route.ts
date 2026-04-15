import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/settings/apikey
// Returns { apiKey: string | null } for the authenticated user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { apiKey: true },
  });

  return NextResponse.json({ apiKey: user?.apiKey ?? null });
}

// POST /api/settings/apikey
// Generates a new random API key, saves to DB, returns it
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = crypto.randomUUID();

  await prisma.user.update({
    where: { id: session.user.id },
    data: { apiKey },
  });

  return NextResponse.json({ apiKey });
}
