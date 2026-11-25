import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { sessionCookieName } from "@/server/http";
import { sessionUser } from "@/server/services/accounts";

// Server-side gate for signed-in pages: renders per request (for the CSP nonce) and sends signed-out
// visitors to sign in before any client code loads.
export async function requireSessionPage(next: string) {
  await connection();
  const token = (await cookies()).get(sessionCookieName())?.value;
  const user = sessionUser(token);
  if (!user) redirect(`/login/?next=${encodeURIComponent(next)}`);
  return user;
}
