import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthenticationResult, AccountInfo } from "@azure/msal-browser";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { loginRequest, apiScope } from "../msalConfig";
import { msalInstance } from "../auth/msalClient";

// Types for hook return for better DX
type Claims = Record<string, unknown>;

interface ProfileResult {
  data: Record<string, unknown> | null;
  error: string | null;
}

interface UseAuthReturn {
  ready: boolean;
  account: AccountInfo | null;
  idTokenClaims: Claims | null;
  login: () => Promise<AuthenticationResult | null>;
  logout: () => Promise<void>;
  getAccount: () => AccountInfo | null;
  getIdTokenClaims: () => Record<string, unknown> | null;
  getAccessToken: () => Promise<string | null>;
  fetchProfile: () => Promise<ProfileResult>;
}

export function useAuth(): UseAuthReturn {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [idTokenClaims, setIdTokenClaims] = useState<Claims | null>(null);
  const [ready, setReady] = useState(false);

  // Track initialization state to avoid repeated awaits.
  const initializedRef = useRef(false);
  // Ensure we only call handleRedirectPromise once
  const handledRedirectRef = useRef(false);

  // Ensure MSAL is initialized before any calls.
  const ssoAttemptedRef = useRef(false);

  const ensureInitialized = useCallback(async () => {
    if (!initializedRef.current) {
      await msalInstance.initialize();

      if (!handledRedirectRef.current) {
        try {
          console.log("🔄 Handling redirect promise...");
          const redirectResponse = await msalInstance.handleRedirectPromise();
          handledRedirectRef.current = true;
          console.log("🔄 Redirect response:", redirectResponse);
          if (redirectResponse) {
            console.log("✅ Successful redirect response received");
            const acct =
              redirectResponse.account ||
              msalInstance.getAllAccounts()[0] ||
              null;
            if (acct) {
              console.log("✅ Setting account from redirect:", acct.username);
              setAccount(acct);
            }
            if (redirectResponse.idTokenClaims) {
              setIdTokenClaims(redirectResponse.idTokenClaims as Claims);
            }
            // Reset redirect guard on successful redirect processing
            window.__isRedirectingToLogin = false;
          } else {
            console.log("ℹ️ No redirect response (normal page load)");
          }
        } catch (err) {
          console.warn("❌ handleRedirectPromise failed:", err);
          handledRedirectRef.current = true;
          window.__isRedirectingToLogin = false;
        }
      }

      // SSO logic moved to account initialization phase to avoid race conditions

      initializedRef.current = true;
      setReady(true);
    }
  }, []);

  // Initialize account from cache on mount AFTER MSAL init and processing redirect
  useEffect(() => {
    (async () => {
      await ensureInitialized();

      // If redirect provided account/claims above, those are already set.
      // Otherwise, read cached accounts and try silent token acquisition.
      if (!account) {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          const active = accounts[0];
          setAccount(active);
          try {
            const res = await msalInstance.acquireTokenSilent({
              ...loginRequest,
              account: active,
            });
            setIdTokenClaims((res.idTokenClaims as Claims) ?? null);
          } catch {
            // Leave claims null until explicit login or token request succeeds.
          }
        } else {
          // No cached accounts - check if this is SSO launch that needs to be handled
          const params = new URLSearchParams(window.location.search);
          const loginHint = params.get("login_hint") || params.get("username");

          console.log("🔍 SSO Debug - URL params:", window.location.search);
          console.log("🔍 SSO Debug - loginHint:", loginHint);
          console.log("🔍 SSO Debug - ssoAttempted:", ssoAttemptedRef.current);
          console.log(
            "🔍 SSO Debug - isRedirecting:",
            window.__isRedirectingToLogin
          );

          if (
            loginHint &&
            !ssoAttemptedRef.current &&
            !window.__isRedirectingToLogin
          ) {
            ssoAttemptedRef.current = true;
            window.__isRedirectingToLogin = true;
            console.log(
              "🚀 My Apps SSO launch detected - triggering loginRedirect with loginHint:",
              loginHint
            );
            try {
              await msalInstance.loginRedirect({
                ...loginRequest,
                loginHint,
                prompt: "none",
              });
            } catch (redirErr) {
              console.error("❌ SSO redirect failed:", redirErr);
              window.__isRedirectingToLogin = false;
              ssoAttemptedRef.current = false; // Reset to allow retry
            }
          } else {
            console.log("❌ SSO conditions not met:", {
              hasLoginHint: !!loginHint,
              ssoAttempted: ssoAttemptedRef.current,
              isRedirecting: window.__isRedirectingToLogin,
            });
          }
        }
      }
    })();
    // We intentionally do not include `account` in deps to avoid re-running on every account set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensureInitialized]);

  const login = useCallback(async (): Promise<AuthenticationResult | null> => {
    try {
      await ensureInitialized();

      // Interactive login only when user requests it (popup fallback is fine for dev)
      const result = await msalInstance.loginPopup(loginRequest);
      setAccount(result.account ?? null);
      setIdTokenClaims((result.idTokenClaims as Claims) ?? null);
      return result;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Login failed", err);
      return null;
    }
  }, [ensureInitialized]);

  const logout = useCallback(async (): Promise<void> => {
    await ensureInitialized();
    const acc =
      account ??
      msalInstance.getActiveAccount() ??
      msalInstance.getAllAccounts()[0] ??
      null;
    try {
      await msalInstance.logoutPopup(acc ? { account: acc } : {});
    } finally {
      setAccount(null);
      setIdTokenClaims(null);
    }
  }, [account, ensureInitialized]);

  const getAccount = useCallback((): AccountInfo | null => {
    return (
      account ??
      msalInstance.getActiveAccount() ??
      msalInstance.getAllAccounts()[0] ??
      null
    );
  }, [account]);

  const getIdTokenClaims = useCallback((): Record<string, unknown> | null => {
    return idTokenClaims;
  }, [idTokenClaims]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    await ensureInitialized();
    const acc = getAccount();
    if (!acc) return null;
    try {
      const res = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: acc,
      });
      return res.accessToken || null;
    } catch (silentErr) {
      try {
        const res = await msalInstance.acquireTokenPopup({ ...loginRequest });
        return res.accessToken || null;
      } catch (popupErr) {
        // eslint-disable-next-line no-console
        console.error("Token acquisition failed", { silentErr, popupErr });
        return null;
      }
    }
  }, [getAccount, ensureInitialized]);

  // Acquire an API access token for the configured apiScope and call backend profile endpoint.
  const fetchProfile = useCallback(async (): Promise<ProfileResult> => {
    await ensureInitialized();
    const acc = getAccount();
    if (!acc) {
      return { data: null, error: "Not signed in" };
    }

    let token: string | null = null;
    try {
      const silent = await msalInstance.acquireTokenSilent({
        scopes: [apiScope],
        account: acc,
      });
      token = silent.accessToken;
    } catch (silentErr: any) {
      // Fallback for interaction required
      if (
        silentErr instanceof InteractionRequiredAuthError ||
        (silentErr.errorCode &&
          String(silentErr.errorCode).includes("interaction"))
      ) {
        try {
          const popup = await msalInstance.acquireTokenPopup({
            scopes: [apiScope],
          });
          token = popup.accessToken;
        } catch (popupErr) {
          // eslint-disable-next-line no-console
          console.error("Popup token acquisition failed", popupErr);
          return { data: null, error: "Token acquisition (popup) failed" };
        }
      } else {
        // eslint-disable-next-line no-console
        console.error("Silent token acquisition failed", silentErr);
        return { data: null, error: "Silent token acquisition failed" };
      }
    }

    if (!token) {
      return { data: null, error: "No access token obtained" };
    }

    // Determine backend base URL (supports local override via VITE_API_BASE_URL)
    // @ts-ignore Vite replaces import.meta.env at build time; any-cast for runtime fallback.
    const BACKEND_BASE_URL =
      (import.meta as any).env?.VITE_API_BASE_URL ||
      "https://sso-spike-backend.onrender.com";
    try {
      const resp = await fetch(`${BACKEND_BASE_URL}/api/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!resp.ok) {
        return { data: null, error: `API error ${resp.status}` };
      }
      const json = (await resp.json()) as Record<string, unknown>;
      return { data: json, error: null };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("API call failed", err);
      return { data: null, error: "Network/API error" };
    }
  }, [ensureInitialized, getAccount]);

  return {
    ready,
    account,
    idTokenClaims,
    login,
    logout,
    getAccount,
    getIdTokenClaims,
    getAccessToken,
    fetchProfile,
  };
}
