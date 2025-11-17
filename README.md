# Entra ID SSO Spike (Vite + React + TypeScript + Tailwind)

This spike demonstrates a minimal Microsoft Entra ID (Azure AD) single-page application using React, MSAL, and proactive token lifecycle management.

## Features

**Features**

- Vite + React + TypeScript
- Tailwind CSS styling
- Microsoft Entra ID (OIDC) authentication via `@azure/msal-browser` & `@azure/msal-react`
- Login / Logout, ID token claim inspection
- Access token acquisition for a protected API scope
- Axios client with automatic bearer injection & 401 handling (silent retry then interactive redirect)
- `SessionMonitor` component for proactive silent token refresh prior to expiry
- Role/group extraction from token claims

## Folder Structure

```
/src
  /components
    UserInfo.tsx
  /hooks
    useAuth.ts
  /utils
    types.ts
  App.tsx
  main.tsx
  index.css (Tailwind entry)
index.html
vite.config.ts
tailwind.config.cjs
postcss.config.cjs
package.json
```

## Authentication Flow

`src/hooks/useAuth.ts` exposes `login`, `logout`, `getAccessToken`, and `fetchProfile`. Tokens are acquired silently when possible. Interaction-required errors trigger a redirect (full-page) for a seamless production flow.

## Microsoft Entra OIDC Setup

Edit `src/msalConfig.ts` and set the following placeholders:

```
export const msalConfig = {
  auth: {
    clientId: "REPLACE_WITH_CLIENT_ID", // SPA app registration (Application ID)
    authority: "https://login.microsoftonline.com/REPLACE_WITH_TENANT_ID", // Tenant (Directory) ID
    redirectUri: "http://localhost:5173"
  },
  cache: { cacheLocation: "sessionStorage", storeAuthStateInCookie: false }
};

export const apiClientId = "REPLACE_WITH_API_CLIENT_ID"; // Backend API App Registration client ID
export const apiScope = `api://${apiClientId}/access_as_user`;

Replace the placeholders with your registered application values. The app requests the `apiScope` plus standard OpenID scopes (`openid profile email`).
```

The frontend will request an access token for `apiScope` when calling `/api/profile`.

## Getting Started

```bash
npm install
npm run dev
```

Then open the URL printed in the terminal (usually http://localhost:5173).

## Running Locally

1. Set CLIENT_ID, TENANT_ID, and API_CLIENT_ID in `src/msalConfig.ts`.
2. Run the backend locally with a protected `GET /api/profile` endpoint that validates Entra access tokens.
3. Start the frontend:

```bash
npm run dev
```

4. Open http://localhost:5173
5. Click "Login with Microsoft" and sign in.
6. (Optional) Click "Get Access Token" to view the raw access token.
7. Click "Call API" to invoke `GET /api/profile` with `Authorization: Bearer <token>`.
8. View profile response & claims.

## Session Monitoring

`SessionMonitor` (`src/auth/SessionMonitor.tsx`) silently refreshes tokens shortly before they expire (default 60s lead time). If silent acquisition reports interaction is required, it initiates a guarded redirect login. This replaces earlier dev-only manual expiry simulation.

## Next Steps (Ideas)

- Role-based route guards / component-level authorization
- Error boundary & retry UX polish
- Progressive enhancement for offline/network failure states

## Notes

- Uses redirect flow for interaction-required scenarios to avoid multiple popups.
- Silent token acquisition is attempted proactively; interactive login only on required conditions.
- Roles/groups are derived from `roles` or `groups` claims if present; otherwise UI shows `none`.
- Tokens are stored in `sessionStorage` per `msalConfig`.

---

This codebase is a learning scaffold; validate security & scopes before production deployment.
