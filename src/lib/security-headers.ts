// Security headers shared by next.config.ts (static marketing pages) and src/proxy.ts (app pages).

export const APP_PREFIXES = ["/app", "/login", "/signup", "/verify", "/reset", "/invite", "/admin"];

const common = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  "Origin-Agent-Cluster": "?1",
};

export function baseHeaders(https: boolean): Record<string, string> {
  return https ? { ...common, "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload" } : { ...common };
}

const shared = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
];

// Prerendered pages carry no per-request nonce. They show no user data and accept no HTML input,
// so inline scripts are limited to Next's own hydration payload and our JSON-LD.
export function staticCsp(dev: boolean, https: boolean) {
  return [
    ...shared,
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

// Signed-in pages: only scripts carrying this request's nonce (and what they load) may run.
export function nonceCsp(nonce: string, dev: boolean, https: boolean) {
  return [
    ...shared,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
