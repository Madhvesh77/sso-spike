import React, { useEffect, useRef } from "react";
import {
  silentAcquireToken,
  interactiveLogin,
  SilentTokenResult,
  msalInstance,
} from "./msalClient";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

// Extend window with a global redirect guard
declare global {
  interface Window {
    __isRedirectingToLogin?: boolean;
  }
}

interface SessionMonitorProps {
  monitoredScopes: string[];
  refreshBeforeExpirySeconds?: number; // default 60 seconds
  fallbackIntervalSeconds?: number; // retry interval after transient failure
}

/**
 * SessionMonitor schedules silent token refresh before expiry and triggers interactive redirect
 * if silent renewal indicates user interaction is required. It prevents duplicate redirects
 * via a window-level guard. No UI is rendered.
 */
export const SessionMonitor: React.FC<SessionMonitorProps> = ({
  monitoredScopes,
  refreshBeforeExpirySeconds = 60,
  fallbackIntervalSeconds = 60,
}) => {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const clearTimer = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const scheduleNext = (expiresOn?: Date) => {
      clearTimer();
      if (!mounted) return;
      if (!expiresOn) {
        // If expiry unknown, use fallback interval.
        timerRef.current = window.setTimeout(
          runCycle,
          fallbackIntervalSeconds * 1000
        );
        console.log(
          "[SessionMonitor] Unknown expiry; fallback retry scheduled"
        );
        return;
      }
      const now = Date.now();
      const target = expiresOn.getTime() - refreshBeforeExpirySeconds * 1000;
      const delay = Math.max(5_000, target - now); // minimum 5s
      console.log(
        `[SessionMonitor] Scheduling silent refresh in ${(delay / 1000).toFixed(
          0
        )}s (expires ${expiresOn.toISOString()})`
      );
      timerRef.current = window.setTimeout(runCycle, delay);
    };

    const runCycle = async () => {
      if (!mounted) return;
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        // Wait until an account is available; retry on fallback interval.
        console.log("[SessionMonitor] No account yet; deferring");
        scheduleNext(undefined);
        return;
      }
      console.log("[SessionMonitor] Running silent token cycle");
      try {
        const result: SilentTokenResult = await silentAcquireToken(
          monitoredScopes
        );
        console.log(
          "[SessionMonitor] Silent token OK; expiry:",
          result.expiresOn.toISOString()
        );
        scheduleNext(result.expiresOn);
      } catch (err: any) {
        if (err instanceof InteractionRequiredAuthError) {
          if (!window.__isRedirectingToLogin) {
            console.warn(
              "[SessionMonitor] Interaction required; initiating redirect"
            );
            window.__isRedirectingToLogin = true;
            await interactiveLogin(monitoredScopes);
          } else {
            console.log(
              "[SessionMonitor] Redirect already in progress; skipping"
            );
          }
          return; // stop scheduling; redirect happening
        }
        console.warn(
          "[SessionMonitor] Silent refresh failed; scheduling fallback",
          err
        );
        scheduleNext(undefined); // fallback interval
      }
    };

    // Initial cycle
    runCycle();

    return () => {
      mounted = false;
      clearTimer();
    };
  }, [monitoredScopes, refreshBeforeExpirySeconds, fallbackIntervalSeconds]);

  return null;
};
