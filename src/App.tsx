import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { extractRolesFromClaims } from "./utils/tokenHelpers";

const App = () => {
  const {
    ready,
    account,
    idTokenClaims,
    login,
    logout,
    getAccessToken,
    fetchProfile,
  } = useAuth();
  const [accessToken, setAccessToken] = useState<string>("");
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<Record<string, unknown> | null>(null);
  // Removed dev-only force expiration mechanism; token lifecycle is now handled by SessionMonitor.

  const handleLogin = async () => {
    await login();
  };

  const handleGetToken = async () => {
    const token = await getAccessToken();
    setAccessToken(token ?? "");
  };

  const roles = extractRolesFromClaims(idTokenClaims);

  const handleCallApi = async () => {
    setApiLoading(true);
    setApiError(null);
    setApiData(null);
    const result = await fetchProfile();
    setApiLoading(false);
    setApiError(result.error);
    setApiData(result.data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-center">
          Microsoft Entra OIDC Demo
        </h1>

        {!ready && (
          <p className="text-sm text-gray-500">
            Initializing authentication...
          </p>
        )}
        {ready && !account && (
          <button
            onClick={handleLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition"
          >
            Login with Microsoft
          </button>
        )}
        {ready && account && (
          <div className="space-y-4" data-testid="auth-section">
            <div className="space-y-2">
              <div>
                <span className="font-semibold">Signed in as:</span>{" "}
                {account.username}
              </div>
              <div>
                <span className="font-semibold">Roles:</span>
                {roles.length > 0 ? (
                  <ul className="list-disc list-inside">
                    {roles.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="italic">none</span>
                )}
              </div>
            </div>

            <div>
              <span className="font-semibold">ID Token Claims:</span>
              <pre className="bg-gray-100 rounded p-3 overflow-auto text-xs">
                {JSON.stringify(idTokenClaims ?? {}, null, 2)}
              </pre>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleGetToken}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition"
              >
                Get Access Token
              </button>
              <button
                onClick={handleCallApi}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition"
              >
                Call API
              </button>
              <textarea
                className="w-full border rounded p-2 text-xs"
                rows={4}
                placeholder="Access token will appear here"
                value={accessToken}
                readOnly
              />
              <button
                onClick={logout}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded transition"
              >
                Logout
              </button>
            </div>
            <div className="space-y-2">
              <span className="font-semibold">/api/profile Response:</span>
              {apiLoading && <p className="text-xs">Loading...</p>}
              {apiError && (
                <p className="text-xs text-red-600">Error: {apiError}</p>
              )}
              {apiData && (
                <pre className="bg-gray-100 rounded p-3 overflow-auto text-xs max-h-64">
                  {JSON.stringify(apiData, null, 2)}
                </pre>
              )}
              {!apiLoading && !apiError && !apiData && (
                <p className="text-xs italic">
                  Click "Call API" to fetch profile.
                </p>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-center text-gray-500">
          Set CLIENT_ID, TENANT_ID and API_CLIENT_ID in{" "}
          <code>src/msalConfig.ts</code>.
        </p>
      </div>
    </div>
  );
};

export default App;
