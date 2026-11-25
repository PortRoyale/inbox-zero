import { dispatch } from "@/server/api";
import { testOutbox } from "@/server/platform";

// A tiny browser stand-in for API tests: keeps cookies and sends same-origin headers by default.
export class TestClient {
  cookies = new Map<string, string>();
  constructor(
    public origin = "http://localhost:3000",
    public ip = "203.0.113.7",
  ) {}

  async call<T = Record<string, unknown>>(
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<{ status: number; data: T; headers: Headers }> {
    const h = new Headers({ "x-forwarded-for": this.ip, ...headers });
    if (this.origin && method !== "GET" && !("origin" in headers)) h.set("origin", this.origin);
    if (body !== undefined && !h.has("content-type")) h.set("content-type", "application/json");
    if (this.cookies.size) h.set("cookie", [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "));
    const res = await dispatch(
      new Request(`http://localhost:3000/api${path}`, { method, headers: h, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body) }),
    );
    for (const c of res.headers.getSetCookie()) {
      const [pair, ...attrs] = c.split(";");
      const [k, v] = pair.split("=");
      if (attrs.some((a) => /max-age=0/i.test(a)) || !v) this.cookies.delete(k.trim());
      else this.cookies.set(k.trim(), v.trim());
    }
    const text = await res.text();
    return { status: res.status, data: (text && res.headers.get("content-type")?.includes("json") ? JSON.parse(text) : text) as T, headers: res.headers };
  }

  get<T = Record<string, unknown>>(path: string) {
    return this.call<T>("GET", path);
  }
  post<T = Record<string, unknown>>(path: string, body: unknown = {}) {
    return this.call<T>("POST", path, body);
  }
  patch<T = Record<string, unknown>>(path: string, body: unknown) {
    return this.call<T>("PATCH", path, body);
  }
  del<T = Record<string, unknown>>(path: string) {
    return this.call<T>("DELETE", path);
  }
}

export function lastLink(to: string, kind: "verify" | "reset" | "invite") {
  const mail = [...testOutbox()].reverse().find((m) => m.to === to && m.text.includes(`/${kind}/?token=`));
  const match = mail?.text.match(new RegExp(`/${kind}/\\?token=([A-Za-z0-9_-]+)`));
  if (!match) throw new Error(`No ${kind} link sent to ${to}`);
  return match[1];
}

let counter = 0;
export const PASSWORD = "Ample-Harbour-Lantern-9";

// Signs up, verifies and signs in a fresh user. Returns the client and the user's first team id.
export async function signedInUser(name = "Ana Test", company = "Acme Devices") {
  counter += 1;
  const email = `user${counter}-${Date.now()}@example.com`;
  const c = new TestClient(undefined, `198.51.100.${counter % 250}`);
  const s = await c.post("/auth/signup", { name, email, password: PASSWORD, company });
  if (s.status !== 202) throw new Error(`signup failed ${s.status} ${JSON.stringify(s.data)}`);
  const v = await c.post("/auth/verify", { token: lastLink(email, "verify") });
  if (v.status !== 200) throw new Error(`verify failed ${v.status}`);
  const me = await c.get<{ orgs: { id: string }[] }>("/me");
  return { c, email, orgId: me.data.orgs[0].id };
}
