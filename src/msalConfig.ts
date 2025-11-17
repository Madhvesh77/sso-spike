// Microsoft Entra (Azure AD) MSAL configuration
// Fill in your values provided by your Azure admin.
// - clientId: Application (client) ID of your app registration
// - authority: https://login.microsoftonline.com/<TENANT_ID>
// - redirectUri: should match the configured redirect URI in the app registration

export const msalConfig = {
  auth: {
    clientId: "f08300c9-554d-4992-be6a-c013670dfd3b", // <-- Application (client) ID for the SPA
    authority:
      "https://login.microsoftonline.com/172bf1ac-3cd2-49a3-afbb-5d8f741a1fa9", // <-- Tenant ID (directory)
    redirectUri: "https://sso-spike.onrender.com", // <-- Must match an allowed redirect URI in the app registration
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

// Basic OIDC scopes used for sign‑in.
export const loginRequest = {
  scopes: ["openid", "profile", "email"],
  // Removed explicit prompt to allow silent SSO from My Apps portal.
};

// Backend API App Registration client ID (used to build the resource scope for access token requests)
// Replace the placeholder below with the API's Application (client) ID.
export const apiClientId = "e278ff4a-fb47-4e4e-bf78-cccb889a20c4";
export const apiScope = `api://${apiClientId}/access_as_user`;
