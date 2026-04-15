import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOAuthClient, getAccessToken } from "@/lib/garmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const oauthToken = url.searchParams.get("oauth_token");
  const oauthVerifier = url.searchParams.get("oauth_verifier");

  if (!oauthToken || !oauthVerifier) {
    return NextResponse.json(
      { error: "Missing oauth_token or oauth_verifier" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const tempCookie = cookieStore.get("garmin_oauth_temp")?.value;
  if (!tempCookie) {
    return NextResponse.json(
      { error: "Missing OAuth temp cookie. Please try connecting again." },
      { status: 400 }
    );
  }

  const colonIdx = tempCookie.indexOf(":");
  const requestToken = tempCookie.slice(0, colonIdx);
  const requestTokenSecret = tempCookie.slice(colonIdx + 1);

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oauth = getOAuthClient();

  try {
    const { token: accessToken, tokenSecret: accessTokenSecret } =
      await getAccessToken(oauth, requestToken, requestTokenSecret, oauthVerifier);

    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "garmin",
          providerAccountId: session.user.id,
        },
      },
      update: {
        access_token: accessToken,
        refresh_token: accessTokenSecret,
      },
      create: {
        userId: session.user.id,
        type: "oauth",
        provider: "garmin",
        providerAccountId: session.user.id,
        access_token: accessToken,
        refresh_token: accessTokenSecret,
      },
    });

    const response = NextResponse.redirect(
      new URL("/settings?garmin=connected", req.url)
    );

    // Clear the temp cookie
    response.cookies.set("garmin_oauth_temp", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[garmin/callback]", err);
    return NextResponse.json(
      { error: "Failed to complete Garmin OAuth" },
      { status: 500 }
    );
  }
}
