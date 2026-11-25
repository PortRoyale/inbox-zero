import type { NextConfig } from "next";
import { APP_PREFIXES, baseHeaders, staticCsp } from "./src/lib/security-headers";

const dev = process.env.NODE_ENV === "development";
const https = (process.env.APP_URL ?? "").startsWith("https://");
const appSources = APP_PREFIXES.map((p) => p.slice(1)).join("|");

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  trailingSlash: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  async headers() {
    const base = Object.entries(baseHeaders(https)).map(([key, value]) => ({ key, value }));
    return [
      {
        // Marketing pages and assets. Signed-in pages get a nonce CSP from src/proxy.ts instead.
        source: `/((?!api/|(?:${appSources})/).*)`,
        headers: [...base, { key: "Content-Security-Policy", value: staticCsp(dev, https) }],
      },
      { source: "/api/:path*", headers: base },
    ];
  },
};

export default nextConfig;
