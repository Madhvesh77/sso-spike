import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { MsalProvider } from "@azure/msal-react";
import { msalClient } from "./auth/msalClient";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <MsalProvider instance={msalClient}>
    <App />
  </MsalProvider>
);
