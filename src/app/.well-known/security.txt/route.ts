import { config } from "@/server/config";
import { site } from "@/lib/site";

// RFC 9116 security.txt, generated so Expires never goes stale.
export const dynamic = "force-dynamic";

export function GET() {
  const app = config().appUrl;
  const expires = new Date(Date.now() + 180 * 86_400_000).toISOString().replace(/\.\d{3}Z$/, ".000Z");
  const body = [
    `Contact: mailto:${site.contactEmail}`,
    `Expires: ${expires}`,
    "Preferred-Languages: en",
    `Canonical: ${app}/.well-known/security.txt`,
    `Policy: ${app}/security/`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
