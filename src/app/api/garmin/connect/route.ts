import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  GARMIN_AUTHORIZE_URL,
  getOAuthClient,
  getRequestToken,
} from "@/lib/garmin";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oauth = getOAuthClient();
  const callbackUrl = process.env.AUTH_URL + "/api/garmin/callback";

  try {
    const { token: requestToken, tokenSecret: requestTokenSecret } =
      await getRequestToken(oauth, callbackUrl);

    const authorizeUrl = `${GARMIN_AUTHORIZE_URL}?oauth_token=${requestToken}`;
    const response = NextResponse.redirect(authorizeUrl);

    response.cookies.set("garmin_oauth_temp", `${requestToken}:${requestTokenSecret}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[garmin/connect]", err);
    return NextResponse.json(
      { error: "Failed to start Garmin OAuth flow" },
      { status: 500 }
    );
  }
}
