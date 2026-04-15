import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GARMIN_API_BASE, garminGet, getOAuthClient } from "@/lib/garmin";

interface GarminDaily {
  calendarDate: string;
  steps?: number;
  bodyBatteryHighestValue?: number;
  bodyBatteryLowestValue?: number;
  averageStressLevel?: number;
}

interface GarminSleep {
  calendarDate: string;
  durationInSeconds?: number;
  deepSleepDurationInSeconds?: number;
  remSleepInSeconds?: number;
  overallSleepScore?: number;
}

interface GarminHrv {
  calendarDate: string;
  lastNight?: number;
}

interface GarminDailiesResponse {
  dailies?: GarminDaily[];
}

interface GarminSleepsResponse {
  sleeps?: GarminSleep[];
}

interface GarminHrvResponse {
  hrv?: GarminHrv[];
}

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

  if (!account) {
    return NextResponse.json({ error: "not_connected" }, { status: 400 });
  }

  const accessToken = account.access_token!;
  const accessTokenSecret = account.refresh_token!;
  const oauth = getOAuthClient();

  const now = Math.floor(Date.now() / 1000);
  const weekAgo = now - 7 * 86400;

  try {
    const [dailiesRaw, sleepsRaw, hrvRaw] = await Promise.all([
      garminGet(
        oauth,
        accessToken,
        accessTokenSecret,
        `${GARMIN_API_BASE}/dailies?uploadStartTimeInSeconds=${weekAgo}&uploadEndTimeInSeconds=${now}`
      ),
      garminGet(
        oauth,
        accessToken,
        accessTokenSecret,
        `${GARMIN_API_BASE}/sleeps?uploadStartTimeInSeconds=${weekAgo}&uploadEndTimeInSeconds=${now}`
      ),
      garminGet(
        oauth,
        accessToken,
        accessTokenSecret,
        `${GARMIN_API_BASE}/hrv?uploadStartTimeInSeconds=${weekAgo}&uploadEndTimeInSeconds=${now}`
      ),
    ]);

    const dailies = dailiesRaw as GarminDailiesResponse;
    const sleeps = sleepsRaw as GarminSleepsResponse;
    const hrv = hrvRaw as GarminHrvResponse;

    let count = 0;

    for (const daily of dailies.dailies ?? []) {
      const date = new Date(daily.calendarDate + "T00:00:00.000Z");

      const sleep = sleeps.sleeps?.find(
        (s) => s.calendarDate === daily.calendarDate
      );
      const hrvEntry = hrv.hrv?.find(
        (h) => h.calendarDate === daily.calendarDate
      );

      await prisma.bodyMetric.upsert({
        where: { userId_date: { userId: session.user.id, date } },
        update: {
          steps: daily.steps ?? null,
          bodyBattery: daily.bodyBatteryHighestValue ?? null,
          bodyBatteryLow: daily.bodyBatteryLowestValue ?? null,
          stressAvg: daily.averageStressLevel ?? null,
          ...(sleep && {
            sleepHours: sleep.durationInSeconds
              ? sleep.durationInSeconds / 3600
              : undefined,
            deepSleepMin: sleep.deepSleepDurationInSeconds
              ? Math.round(sleep.deepSleepDurationInSeconds / 60)
              : undefined,
            remSleepMin: sleep.remSleepInSeconds
              ? Math.round(sleep.remSleepInSeconds / 60)
              : undefined,
            sleepScore: sleep.overallSleepScore ?? undefined,
          }),
          ...(hrvEntry && { hrv: hrvEntry.lastNight ?? undefined }),
        },
        create: {
          userId: session.user.id,
          date,
          steps: daily.steps ?? null,
          bodyBattery: daily.bodyBatteryHighestValue ?? null,
          bodyBatteryLow: daily.bodyBatteryLowestValue ?? null,
          stressAvg: daily.averageStressLevel ?? null,
          sleepHours: sleep?.durationInSeconds
            ? sleep.durationInSeconds / 3600
            : null,
          deepSleepMin: sleep?.deepSleepDurationInSeconds
            ? Math.round(sleep.deepSleepDurationInSeconds / 60)
            : null,
          remSleepMin: sleep?.remSleepInSeconds
            ? Math.round(sleep.remSleepInSeconds / 60)
            : null,
          sleepScore: sleep?.overallSleepScore ?? null,
          hrv: hrvEntry?.lastNight ?? null,
        },
      });

      count++;
    }

    return NextResponse.json({
      success: true,
      daysImported: count,
      message: `Synced ${count} days from Garmin`,
    });
  } catch (err) {
    console.error("[garmin/sync]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
