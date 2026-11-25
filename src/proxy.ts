import { NextResponse, type NextRequest } from "next/server";
import { baseHeaders, nonceCsp } from "@/lib/security-headers";

// Runs before signed-in pages render: issues a fresh CSP nonce per request (Next applies it to its
// own scripts automatically) and sets the security headers.
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(18))).toString("base64");
  const dev = process.env.NODE_ENV === "development";
  const https = (process.env.APP_URL ?? "").startsWith("https://");
  const csp = nonceCsp(nonce, dev, https);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store");
  for (const [k, v] of Object.entries(baseHeaders(https))) response.headers.set(k, v);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/:section(app|login|signup|verify|reset|invite|admin)/:path*",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
