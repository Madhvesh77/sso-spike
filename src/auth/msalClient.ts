import {
  PublicClientApplication,
  InteractionRequiredAuthError,
  AccountInfo,
  AuthenticationResult,
} from "@azure/msal-browser";
import { msalConfig } from "../msalConfig";

// Central MSAL client instance (export both msalClient and msalInstance for clarity)
export const msalClient = new PublicClientApplication(msalConfig);
export const msalInstance = msalClient;
const initPromise = msalClient.initialize();

// Structured result for silentAcquireToken per requirements
export interface SilentTokenResult {
  accessToken: string;
  expiresOn: Date;
  account: AccountInfo;
}

// Perform a silent acquisition, returning structured result; rethrows InteractionRequiredAuthError unchanged
export async function silentAcquireToken(
  scopes: string[]
): Promise<SilentTokenResult> {
  await initPromise;
  const account =
    msalClient.getActiveAccount() || msalClient.getAllAccounts()[0];
  if (!account) {
    // Without an account MSAL will itself throw InteractionRequiredAuthError when attempting silent acquire
  }
  try {
    const result: AuthenticationResult = await msalClient.acquireTokenSilent({
      scopes,
      account,
    });
    if (!result.accessToken || !result.expiresOn) {
      throw new Error(
        "Silent acquisition returned missing accessToken or expiresOn"
      );
    }
    return {
      accessToken: result.accessToken,
      expiresOn: result.expiresOn,
      account: result.account!,
    };
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      throw err; // Rethrow for caller detection
    }
    throw err;
  }
}

// Trigger interactive login via redirect (prompt select_account for clarity)
export async function interactiveLogin(scopes?: string[]): Promise<void> {
  await initPromise;
  await msalClient.loginRedirect({
    scopes: scopes && scopes.length ? scopes : ["openid", "profile", "email"],
    prompt: "select_account",
  });
}

// Convenience wrapper: attempt silent first, fallback to redirect and rethrow
export async function getAccessToken(scopes: string[]): Promise<string> {
  try {
    const { accessToken } = await silentAcquireToken(scopes);
    return accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      await interactiveLogin(scopes);
    }
    throw err;
  }
}
