import { google } from "googleapis";
import type { Props } from "./upstream-utils";

// Builds a Google OAuth2 client that can renew its own access token.
// The access token captured during authorization only lives for one hour, so
// the client is also given the refresh token and the app credentials and lets
// google-auth-library refresh on demand. Without this, every tool call fails
// an hour after the user last authorized by hand.
export function createGoogleAuth(props: Props) {
  // Fail loudly with a readable message instead of letting google-auth-library
  // throw an empty-message error deep inside getRequestMetadataAsync.
  if (!props.accessToken && !props.refreshToken) throw new Error("Google credentials missing from this MCP session: no access token and no refresh token. Reconnect the connector to re-authorize.");
  if (!props.clientId || !props.clientSecret) throw new Error("GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET unavailable at runtime, so the access token cannot be refreshed.");
  const auth = new google.auth.OAuth2({ clientId: props.clientId, clientSecret: props.clientSecret, forceRefreshOnFailure: true });
  auth.setCredentials({ access_token: props.accessToken, refresh_token: props.refreshToken, expiry_date: props.expiryDate });
  return auth;
}
