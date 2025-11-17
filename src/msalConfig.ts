// Microsoft Entra (Azure AD) MSAL configuration
// Fill in your values provided by your Azure admin.
// - clientId: Application (client) ID of your app registration
// - authority: https://login.microsoftonline.com/<TENANT_ID>
// - redirectUri: should match the configured redirect URI in the app registration

export const msalConfig = {
  auth: {
    clientId: "f08300c9-554d-4992-be6a-c013670dfd3b", // <-- TODO: set Application (client) ID
    authority: "https://login.microsoftonline.com/172bf1ac-3cd2-49a3-afbb-5d8f741a1fa9", // <-- TODO: set your Tenant ID
    redirectUri: "http://localhost:5173",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

// Default login request scopes. For basic OIDC, these are sufficient.
export const loginRequest = { scopes: ["openid", "profile", "email"] };
