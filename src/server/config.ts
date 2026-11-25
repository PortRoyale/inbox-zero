import path from "node:path";

// All configuration comes from environment variables. Production refuses to start without its secrets.
export type Config = {
  isProd: boolean;
  isTest: boolean;
  dataDir: string;
  appUrl: string;
  appOrigin: string;
  secureCookies: boolean;
  sessionDays: number;
  cronSecret: string | null;
  osvUrl: string;
  resendKey: string | null;
  postmarkToken: string | null;
  mailFrom: string;
  superadmins: string[];
  ipSalt: string;
};

let cached: Config | undefined;

export function config(): Config {
  if (cached) return cached;
  const env = process.env;
  const nodeEnv = env.NODE_ENV ?? "development";
  const isProd = nodeEnv === "production" && env.READYLINE_ALLOW_INSECURE !== "1";
  const appUrl = (env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  let origin: string;
  try {
    origin = new URL(appUrl).origin;
  } catch {
    throw new Error("APP_URL must be a full URL, for example https://app.example.com");
  }
  if (isProd && !appUrl.startsWith("https://")) throw new Error("APP_URL must use https in production");
  const cronSecret = env.CRON_SECRET?.trim() || null;
  if (cronSecret && cronSecret.length < 32) throw new Error("CRON_SECRET must be at least 32 characters");
  const ipSalt = env.IP_HASH_SALT?.trim() || "";
  if (isProd && ipSalt.length < 32) throw new Error("IP_HASH_SALT must be set (32+ characters) in production");
  cached = {
    isProd,
    isTest: nodeEnv === "test" || env.READYLINE_TEST === "1",
    dataDir: path.resolve(env.DATA_DIR ?? ".data"),
    appUrl,
    appOrigin: origin,
    secureCookies: appUrl.startsWith("https://"),
    sessionDays: Math.min(90, Math.max(1, Number(env.SESSION_DAYS ?? 30) || 30)),
    cronSecret,
    osvUrl: (env.OSV_API_URL ?? "https://api.osv.dev").replace(/\/+$/, ""),
    resendKey: env.RESEND_API_KEY?.trim() || null,
    postmarkToken: env.POSTMARK_SERVER_TOKEN?.trim() || null,
    mailFrom: env.MAIL_FROM ?? "Readyline <no-reply@example.com>",
    superadmins: (env.SUPERADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    ipSalt: ipSalt || "development-only-ip-salt",
  };
  return cached;
}

export function resetConfigForTests() {
  cached = undefined;
}
