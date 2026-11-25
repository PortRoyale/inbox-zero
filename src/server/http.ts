import { config } from "@/server/config";
import { safeEqual } from "@/server/crypto/secrets";
import { HttpError } from "@/server/errors";
import { sessionUser, type Profile } from "@/server/services/accounts";
import { ValidationError, type V } from "@/server/validate";

// One request pipeline for every API call: method and path matching, origin (CSRF) checks,
// JSON-only bodies with a byte cap, session lookup, validation, and uniform error mapping.

export type Method = "GET" | "POST" | "PATCH" | "DELETE";
export type Access = "public" | "user" | "verified" | "superadmin" | "cron";

export type Ctx<B> = {
  req: Request;
  url: URL;
  params: Record<string, string>;
  body: B;
  user: Profile;
  sessionToken: string | undefined;
  ip: string | null;
  userAgent: string | null;
};

export type Route<B = unknown> = {
  method: Method;
  path: string;
  access: Access;
  body?: V<B>;
  maxBytes?: number;
  handle: (ctx: Ctx<NoInfer<B>>) => unknown;
};

// The body type is inferred from the validator (first argument) before the handler is checked,
// so handlers receive typed, already-validated input.
export function route<B = undefined>(spec: Omit<Route<B>, "handle">, handle: (ctx: Ctx<B>) => unknown): Route<unknown> {
  return { ...spec, handle } as Route<unknown>;
}

const PARAMS: Record<string, RegExp> = {
  orgId: /^[0-9a-f-]{36}$/,
  userId: /^[0-9a-f-]{36}$/,
  productId: /^[0-9a-f-]{36}$/,
  id: /^[0-9a-f-]{36}$/,
  inviteId: /^[0-9a-f]{24}$/,
  rev: /^[A-Z]{1,3}$/,
};

export function sessionCookieName() {
  return config().secureCookies ? "__Host-rl_session" : "rl_session";
}

export function readCookie(header: string | null, name: string) {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

export function sessionCookie(token: string, expiresAt: number) {
  const secure = config().secureCookies ? "; Secure" : "";
  return `${sessionCookieName()}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Expires=${new Date(expiresAt).toUTCString()}`;
}

export function clearSessionCookie() {
  const secure = config().secureCookies ? "; Secure" : "";
  return `${sessionCookieName()}=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`;
}

const BASE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "same-origin",
};

export function json(data: unknown, init: { status?: number; headers?: Record<string, string>; cookies?: string[] } = {}) {
  const headers = new Headers({ ...BASE_HEADERS, "Content-Type": "application/json; charset=utf-8", ...init.headers });
  for (const c of init.cookies ?? []) headers.append("Set-Cookie", c);
  return new Response(JSON.stringify(data), { status: init.status ?? 200, headers });
}

export function download(filename: string, contentType: string, body: string) {
  return new Response(body, {
    headers: {
      ...BASE_HEADERS,
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename.replace(/[^A-Za-z0-9._-]/g, "_")}"`,
    },
  });
}

export function clientIp(req: Request) {
  const hops = config().trustProxyHops;
  if (hops > 0) {
    const chain = (req.headers.get("x-forwarded-for") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const ip = chain[chain.length - hops];
    if (ip && ip.length <= 64) return ip;
  }
  return config().isProd ? null : "local";
}

function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (origin) return origin === config().appOrigin;
  // Browsers always send Origin on cross-site POSTs; Sec-Fetch-Site covers the rest.
  return req.headers.get("sec-fetch-site") === "same-origin";
}

async function readBody(req: Request, maxBytes: number) {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new HttpError(413, "That upload is too large.");
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "That upload is too large.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function match(pattern: string, path: string) {
  const a = pattern.split("/").filter(Boolean);
  const b = path.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(":")) {
      const name = a[i].slice(1);
      const value = decodeURIComponent(b[i]);
      if (!(PARAMS[name] ?? /^[A-Za-z0-9_-]{1,64}$/).test(value)) return null;
      params[name] = value;
    } else if (a[i] !== b[i]) return null;
  }
  return params;
}

export function createDispatcher(routes: Route[], prefix = "/api") {
  return async function dispatch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method.toUpperCase() as Method | "HEAD";
    const path = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : url.pathname;
    try {
      let found: { r: Route; params: Record<string, string> } | undefined;
      let pathMatched = false;
      for (const r of routes) {
        const params = match(r.path, path);
        if (!params) continue;
        pathMatched = true;
        if (r.method === method || (method === "HEAD" && r.method === "GET")) {
          found = { r, params };
          break;
        }
      }
      if (!found) throw new HttpError(pathMatched ? 405 : 404, pathMatched ? "Method not allowed." : "Not found.");
      const { r, params } = found;
      const mutating = method !== "GET" && method !== "HEAD";

      if (r.access === "cron") {
        const secret = config().cronSecret;
        const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!secret || !safeEqual(given, secret)) throw new HttpError(401, "Unauthorised.");
      } else if (mutating && !sameOrigin(req)) {
        throw new HttpError(403, "Cross-site request refused.");
      }

      let body: unknown = undefined;
      if (mutating && r.body) {
        const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
        if (type !== "application/json") throw new HttpError(415, "Send JSON.");
        const text = await readBody(req, r.maxBytes ?? 64 * 1024);
        let parsed: unknown;
        try {
          parsed = text ? JSON.parse(text) : {};
        } catch {
          throw new HttpError(400, "That request body isn't valid JSON.");
        }
        body = r.body(parsed, "");
      }

      const sessionToken = readCookie(req.headers.get("cookie"), sessionCookieName());
      const user = r.access === "public" || r.access === "cron" ? null : sessionUser(sessionToken);
      if ((r.access === "user" || r.access === "verified" || r.access === "superadmin") && !user) throw new HttpError(401, "Sign in to continue.");
      if ((r.access === "verified" || r.access === "superadmin") && !user!.emailVerified) throw new HttpError(403, "Confirm your email first.");
      if (r.access === "superadmin" && !config().superadmins.includes(user!.email.toLowerCase())) throw new HttpError(404, "Not found.");

      const result = await r.handle({
        req,
        url,
        params,
        body,
        user: user as Profile,
        sessionToken,
        ip: clientIp(req),
        userAgent: req.headers.get("user-agent"),
      });
      if (result instanceof Response) return result;
      return json(result ?? { ok: true });
    } catch (err) {
      if (err instanceof ValidationError) return json({ error: err.message, field: err.path }, { status: 400 });
      if (err instanceof HttpError) {
        return json({ error: err.message }, { status: err.status, headers: err.retryAfter ? { "Retry-After": String(err.retryAfter) } : {} });
      }
      console.error("[api] unhandled error", method, path, err);
      return json({ error: "Something went wrong on our side. Try again in a moment." }, { status: 500 });
    }
  };
}
