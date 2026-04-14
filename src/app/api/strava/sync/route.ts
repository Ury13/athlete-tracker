import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Map Strava sport types to our training types
function mapStravaType(stravaType: string): string {
  const type = stravaType.toLowerCase();
  if (["run", "virtualrun", "trailrun"].includes(type)) return "run";
  if (["ride", "virtualride", "ebikeride", "gravelride", "handcycle", "velomobile"].includes(type)) return "bike";
  if (["swim", "openwaterswim"].includes(type)) return "swim";
  if (["weighttraining", "workout", "crossfit", "crosstraining", "rockclimbing"].includes(type)) return "strength";
  if (["yoga", "pilates"].includes(type)) return "yoga";
  return "other";
}

// GET /api/strava/sync?pages=3
// Fetches the last N pages (50 activities each) from Strava and upserts them
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = session.user.stravaAccessToken;
  if (!token) {
    return NextResponse.json(
      { error: "No Strava access token. Please log out and log in again." },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const pages = Math.min(parseInt(url.searchParams.get("pages") ?? "3"), 10);

  let imported = 0;
  let skipped = 0;

  try {
    for (let page = 1; page <= pages; page++) {
      const res = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?per_page=50&page=${page}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        if (res.status === 401) {
          return NextResponse.json(
            { error: "Strava token expired. Please log out and log in again." },
            { status: 401 }
          );
        }
        break;
      }

      const activities: StravaActivity[] = await res.json();
      if (activities.length === 0) break;

      for (const act of activities) {
        const stravaId = String(act.id);
        const durationMinutes = Math.round(act.moving_time / 60);
        const distanceKm = act.distance > 0 ? act.distance / 1000 : null;
        const pace =
          distanceKm && distanceKm > 0 && act.moving_time > 0
            ? act.moving_time / 60 / distanceKm
            : null;

        try {
          await prisma.trainingSession.upsert({
            where: { stravaId },
            update: {
              // Update mutable fields in case Strava data changed
              heartRateAvg: act.average_heartrate ? Math.round(act.average_heartrate) : null,
              heartRateMax: act.max_heartrate ? Math.round(act.max_heartrate) : null,
              perceivedEffort: act.perceived_exertion
                ? Math.round(act.perceived_exertion)
                : 5,
            },
            create: {
              stravaId,
              userId: session.user.id,
              date: new Date(act.start_date),
              type: mapStravaType(act.sport_type ?? act.type),
              name: act.name,
              distance: distanceKm,
              duration: durationMinutes,
              pace,
              heartRateAvg: act.average_heartrate ? Math.round(act.average_heartrate) : null,
              heartRateMax: act.max_heartrate ? Math.round(act.max_heartrate) : null,
              elevationGain: act.total_elevation_gain ?? null,
              calories: act.kilojoules ? Math.round(act.kilojoules) : null,
              perceivedEffort: act.perceived_exertion
                ? Math.round(act.perceived_exertion)
                : 5,
              notes: null,
            },
          });
          imported++;
        } catch {
          skipped++;
        }
      }

      // Strava rate limit: 100 requests/15min — small delay between pages
      if (page < pages) await new Promise((r) => setTimeout(r, 200));
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      message: `Synced ${imported} activities from Strava`,
    });
  } catch (err) {
    console.error("[strava/sync]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

// Strava activity shape (only fields we use)
interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  moving_time: number; // seconds
  distance: number; // meters
  total_elevation_gain: number;
  average_heartrate?: number;
  max_heartrate?: number;
  kilojoules?: number;
  perceived_exertion?: number;
}
