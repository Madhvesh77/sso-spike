import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthenticationResult, AccountInfo } from "@azure/msal-browser";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, loginRequest } from "../msalConfig";

// Instantiate MSAL once per app lifecycle
const msalInstance = new PublicClientApplication(msalConfig);
// Begin asynchronous initialization immediately. MSAL v3 requires initialize() before usage.
const initializationPromise = msalInstance.initialize();

// Types for hook return for better DX
type Claims = Record<string, unknown>;

interface UseAuthReturn {
  account: AccountInfo | null;
  idTokenClaims: Claims | null;
  login: () => Promise<AuthenticationResult | null>;
  logout: () => Promise<void>;
  getAccount: () => AccountInfo | null;
  getIdTokenClaims: () => Record<string, unknown> | null;
  getAccessToken: () => Promise<string | null>;
}

export function useAuth(): UseAuthReturn {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [idTokenClaims, setIdTokenClaims] = useState<Claims | null>(null);

  // Track initialization state to avoid repeated awaits.
  const initializedRef = useRef(false);

  // Ensure MSAL is initialized before any calls.
  const ensureInitialized = useCallback(async () => {
    if (!initializedRef.current) {
      await initializationPromise;
      initializedRef.current = true;
    }
  }, []);

  // Initialize account from cache on mount AFTER MSAL init
  useEffect(() => {
    (async () => {
      await ensureInitialized();
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
      }
    })();
  }, [ensureInitialized]);

  const login = useCallback(async (): Promise<AuthenticationResult | null> => {
    try {
      await ensureInitialized();
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

  return {
    account,
    idTokenClaims,
    login,
    logout,
    getAccount,
    getIdTokenClaims,
    getAccessToken,
  };
}
