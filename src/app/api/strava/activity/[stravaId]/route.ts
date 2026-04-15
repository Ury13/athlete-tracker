import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ stravaId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = session.user.stravaAccessToken;
  if (!token) {
    return NextResponse.json({ error: "no_token" }, { status: 400 });
  }

  const { stravaId } = await params;

  const res = await fetch(
    `https://www.strava.com/api/v3/activities/${stravaId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    if (res.status === 401) {
      return NextResponse.json({ error: "token_expired" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: res.status }
    );
  }

  const activity = await res.json();
  return NextResponse.json({ data: activity });
}
