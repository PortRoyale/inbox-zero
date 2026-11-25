// Runs once when the server starts. Loading configuration, keys and the database here makes a
// misconfigured production deployment fail at boot instead of on the first request.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { config } = await import("@/server/config");
  const { keys } = await import("@/server/crypto/keys");
  const { database } = await import("@/server/db");
  config();
  keys();
  database();
}
