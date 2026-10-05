import { google } from "googleapis";
import type { Props } from "./upstream-utils";

// Builds a Google OAuth2 client that can renew its own access token.
// The access token captured during authorization only lives for one hour, so
// the client is also given the refresh token and the app credentials and lets
// google-auth-library refresh on demand. Without this, every tool call fails
// an hour after the user last authorized by hand.
export function createGoogleAuth(props: Props) {
  const auth = new google.auth.OAuth2({ clientId: props.clientId, clientSecret: props.clientSecret, forceRefreshOnFailure: true });
  auth.setCredentials({ access_token: props.accessToken, refresh_token: props.refreshToken, expiry_date: props.expiryDate });
  return auth;
}
