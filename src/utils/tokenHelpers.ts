// Utility to safely extract roles or groups from ID token claims
// Claims structure varies by tenant configuration and app roles setup.
// This function returns a string array and avoids throwing on unexpected shapes.

export function extractRolesFromClaims(claims: unknown): string[] {
  if (!claims || typeof claims !== "object") return [];
  const c = claims as Record<string, unknown>;

  const rolesClaim = c["roles"];
  const groupsClaim = c["groups"];

  const roles: string[] = Array.isArray(rolesClaim)
    ? rolesClaim.filter((v): v is string => typeof v === "string")
    : [];

  const groups: string[] = Array.isArray(groupsClaim)
    ? groupsClaim.filter((v): v is string => typeof v === "string")
    : [];

  // Prefer roles if present, otherwise groups; if both present, merge unique
  const combined = roles.length > 0 ? roles : groups;
  const unique = Array.from(new Set(combined));
  return unique;
}
