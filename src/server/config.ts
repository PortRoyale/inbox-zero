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
  trustProxyHops: number;
  billing: BillingConfig;
};

export type BillingConfig =
  | { provider: "none" }
  | {
      provider: "finix";
      apiUrl: string;
      username: string;
      password: string;
      merchantId: string;
      webhookKey: string;
      webhookBearer: string | null;
      currency: string;
      // Annual prepayment in minor units (cents).
      prices: { starter: number; team: number };
      termsUrl: string;
    }
  | {
      provider: "stripe";
      apiUrl: string;
      secretKey: string;
      webhookSecret: string;
      prices: { starter: string; team: string };
      automaticTax: boolean;
    };

function billingConfig(env: NodeJS.ProcessEnv, appUrl: string): BillingConfig {
  const provider = (env.BILLING_PROVIDER ?? "none").trim().toLowerCase();
  const need = (name: string) => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`${name} is required when BILLING_PROVIDER=${provider}`);
    return value;
  };
  if (provider === "finix") {
    return {
      provider,
      apiUrl: (env.FINIX_API_URL ?? "https://finix.sandbox-payments-api.com").replace(/\/+$/, ""),
      username: need("FINIX_USERNAME"),
      password: need("FINIX_PASSWORD"),
      merchantId: need("FINIX_MERCHANT_ID"),
      webhookKey: need("FINIX_WEBHOOK_SIGNING_KEY"),
      webhookBearer: env.FINIX_WEBHOOK_BEARER?.trim() || null,
      currency: (env.FINIX_CURRENCY ?? "USD").trim().toUpperCase(),
      prices: { starter: Number(env.FINIX_PRICE_STARTER_YEAR ?? 178800), team: Number(env.FINIX_PRICE_TEAM_YEAR ?? 598800) },
      termsUrl: env.TERMS_URL?.trim() || `${appUrl}/terms/`,
    };
  }
  if (provider === "stripe") {
    return {
      provider,
      apiUrl: (env.STRIPE_API_URL ?? "https://api.stripe.com").replace(/\/+$/, ""),
      secretKey: need("STRIPE_SECRET_KEY"),
      webhookSecret: need("STRIPE_WEBHOOK_SECRET"),
      prices: { starter: need("STRIPE_PRICE_STARTER"), team: need("STRIPE_PRICE_TEAM") },
      automaticTax: env.STRIPE_AUTOMATIC_TAX === "1",
    };
  }
  if (provider !== "none") throw new Error("BILLING_PROVIDER must be finix, stripe or none");
  return { provider: "none" };
}

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
    // Runtime data location; excluded from build-time file tracing.
    dataDir: path.resolve(/*turbopackIgnore: true*/ env.DATA_DIR ?? ".data"),
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
    // Number of reverse proxies in front of the app (Caddy in the supplied deployment). Used to pick
    // the client address from X-Forwarded-For; 0 ignores the header entirely.
    trustProxyHops: Math.min(5, Math.max(0, Number(env.TRUST_PROXY_HOPS ?? (isProd ? 1 : 0)) || 0)),
    billing: billingConfig(env, appUrl),
  };
  return cached;
}

export function resetConfigForTests() {
  cached = undefined;
}
