import React, { useEffect, useState } from "react";
import { msalClient } from "./msalClient";
import type { AccountInfo } from "@azure/msal-browser";

interface AutoSignInHandlerProps {
  children: React.ReactNode;
}

// Processes redirect responses and sets active account if available.
export const AutoSignInHandler: React.FC<AutoSignInHandlerProps> = ({
  children,
}) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await msalClient.handleRedirectPromise();
        if (resp?.account) {
          msalClient.setActiveAccount(resp.account as AccountInfo);
        } else {
          const accounts = msalClient.getAllAccounts();
          if (accounts.length === 1) {
            msalClient.setActiveAccount(accounts[0]);
          }
        }
      } catch (err) {
        console.warn("Redirect processing failed", err);
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <div className="p-4 text-sm text-gray-600">
        Initializing authentication...
      </div>
    );
  }

  return <>{children}</>;
};
