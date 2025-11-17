# SSO Spike (Vite + React + TypeScript + Tailwind)

This is a minimal frontend spike for a future SSO integration. It does NOT implement real authentication yet; instead it provides placeholder UI and mock logic.

## Features

- Vite + React + TypeScript setup
- Tailwind CSS styling
- `Login with SSO` button (simulated login)
- Mock user info display (name, email, roles)
- Logout capability (clears mock user)

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

## useAuth Hook

A placeholder hook located at `src/hooks/useAuth.ts` with functions:

- `login()` – simulates async login and sets a mock user
- `logout()` – clears user
- `getUser()` – returns current user state

## Microsoft Entra OIDC Setup

Fill the placeholders in `src/msalConfig.ts`:

```
export const msalConfig = {
  auth: {
    clientId: "REPLACE_WITH_CLIENT_ID",       // Application (client) ID
    authority: "https://login.microsoftonline.com/REPLACE_WITH_TENANT_ID", // Tenant ID
    redirectUri: "http://localhost:5173"
  },
  cache: { cacheLocation: "sessionStorage", storeAuthStateInCookie: false }
};
```

## Getting Started

```bash
npm install
npm run dev
```

Then open the URL printed in the terminal (usually http://localhost:5173).

## How to test

1. Open http://localhost:5173
2. Click "Login with Microsoft"
3. Sign in with your Entra account
4. Check the rendered claims JSON and roles/groups list

## Next Steps (Not Implemented Yet)

- Integrate real SSO (e.g., Entra ID / OAuth / OIDC)
- Token storage & refresh logic
- Role-based conditional rendering

## Notes

- This spike uses `@azure/msal-browser` with `loginPopup` for easy local development.
- No backend code is included; everything runs in the browser.
