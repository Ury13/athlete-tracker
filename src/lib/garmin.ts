import { OAuth } from "oauth";

export const GARMIN_REQUEST_TOKEN_URL =
  "https://connectapi.garmin.com/oauth-service/oauth/request_token";
export const GARMIN_AUTHORIZE_URL =
  "https://connect.garmin.com/oauthConfirm";
export const GARMIN_ACCESS_TOKEN_URL =
  "https://connectapi.garmin.com/oauth-service/oauth/access_token";
export const GARMIN_API_BASE =
  "https://healthapi.garmin.com/wellness-api/rest";

export function getOAuthClient() {
  return new OAuth(
    GARMIN_REQUEST_TOKEN_URL,
    GARMIN_ACCESS_TOKEN_URL,
    process.env.GARMIN_CLIENT_ID!,
    process.env.GARMIN_CLIENT_SECRET!,
    "1.0A",
    null,
    "HMAC-SHA1"
  );
}

// Promisified OAuth request token
export function getRequestToken(
  oauth: OAuth,
  callbackUrl: string
): Promise<{ token: string; tokenSecret: string }> {
  return new Promise((resolve, reject) => {
    oauth.getOAuthRequestToken(
      { oauth_callback: callbackUrl },
      (err, token, tokenSecret) => {
        if (err) reject(err);
        else resolve({ token, tokenSecret });
      }
    );
  });
}

// Promisified access token exchange
export function getAccessToken(
  oauth: OAuth,
  requestToken: string,
  requestTokenSecret: string,
  verifier: string
): Promise<{ token: string; tokenSecret: string }> {
  return new Promise((resolve, reject) => {
    oauth.getOAuthAccessToken(
      requestToken,
      requestTokenSecret,
      verifier,
      (err, token, tokenSecret) => {
        if (err) reject(err);
        else resolve({ token, tokenSecret });
      }
    );
  });
}

// Make authenticated GET request to Garmin Health API
export function garminGet(
  oauth: OAuth,
  accessToken: string,
  accessTokenSecret: string,
  url: string
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    oauth.get(url, accessToken, accessTokenSecret, (err, data) => {
      if (err) reject(err);
      else resolve(JSON.parse(data as string));
    });
  });
}
