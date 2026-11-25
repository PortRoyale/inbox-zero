"use client";

import { useEffect, useState } from "react";
import { TextField } from "@/components/plan/fields";
import { ApiError, api } from "@/lib/client/api";

// Sign-up, sign-in, email verification, password reset and invite acceptance.

function safeNext(next: string | null) {
  // Only same-site paths, never protocol-relative or absolute URLs.
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/app/";
}

function useQuery(name: string) {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => setValue(new URLSearchParams(window.location.search).get(name)), [name]);
  return value;
}

function Problem({ error }: { error: string }) {
  return error ? (
    <p className="form-error" role="alert">
      {error}
    </p>
  ) : null;
}

export function AuthCard({ title, lead, children, foot }: { title: string; lead?: React.ReactNode; children?: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <section className="sheet auth-card" aria-labelledby="auth-title">
      <div className="auth-head">
        <h1 id="auth-title">{title}</h1>
        {lead && <p className="muted">{lead}</p>}
      </div>
      {children}
      {foot && <div className="auth-foot">{foot}</div>}
    </section>
  );
}

export function LoginForm() {
  const next = useQuery("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("POST", "/auth/login", { email, password });
      window.location.assign(safeNext(next));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };
  return (
    <AuthCard
      title="Sign in"
      lead="Your team's plans, release records, SBOM watch and incident clock."
      foot={
        <ul className="auth-links">
          <li>
            <a href="/signup/">Create an account</a>
          </li>
          <li>
            <a href="/reset/">Forgot your password?</a>
          </li>
        </ul>
      }
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <TextField id="login-email" label="Work email" type="email" autoComplete="username" value={email} onChange={setEmail} required />
        <TextField id="login-password" label="Password" type="password" autoComplete="current-password" value={password} onChange={setPassword} required />
        <Problem error={error} />
        <button type="submit" className="btn btn-primary" disabled={busy || !email || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthCard>
  );
}

export function SignupForm() {
  const [form, setForm] = useState({ name: "", email: "", company: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("POST", "/auth/signup", form);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (sent) {
    return (
      <AuthCard title="Check your email" lead={<>We sent a confirmation link to <strong>{form.email}</strong>. It expires in 24 hours.</>}>
        <p className="muted">Nothing arrived? Check spam, or sign in to get a new link.</p>
        <a className="btn" href="/login/">
          Go to sign in
        </a>
      </AuthCard>
    );
  }
  return (
    <AuthCard
      title="Create your account"
      lead="Free to start. Your data is encrypted at rest with post-quantum key wrapping."
      foot={
        <ul className="auth-links">
          <li>
            <a href="/login/">Already have an account? Sign in</a>
          </li>
        </ul>
      }
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <TextField id="su-name" label="Your name" value={form.name} onChange={set("name")} required />
        <TextField id="su-company" label="Company" value={form.company} onChange={set("company")} required />
        <TextField id="su-email" label="Work email" type="email" autoComplete="email" value={form.email} onChange={set("email")} required />
        <TextField id="su-password" label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} required hint="At least 12 characters. A passphrase of four words works well." />
        <Problem error={error} />
        <button type="submit" className="btn btn-primary" disabled={busy || Object.values(form).some((v) => !v.trim())}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}

export function VerifyEmail() {
  const token = useQuery("token");
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [error, setError] = useState("");
  useEffect(() => {
    if (token === null) return;
    api("POST", "/auth/verify", { token })
      .then(() => {
        setState("done");
        setTimeout(() => window.location.assign("/app/"), 900);
      })
      .catch((err: ApiError) => {
        setState("error");
        setError(err.message);
      });
  }, [token]);
  return (
    <AuthCard title={state === "error" ? "Link not valid" : state === "done" ? "Email confirmed" : "Confirming your email…"}>
      {state === "done" && <p>Taking you to your workspace.</p>}
      {state === "error" && (
        <>
          <Problem error={error} />
          <a className="btn" href="/login/">
            Sign in to get a new link
          </a>
        </>
      )}
    </AuthCard>
  );
}

export function ResetPassword() {
  const token = useQuery("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("POST", "/auth/reset-request", { email });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("POST", "/auth/reset", { token, password });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (token) {
    return done ? (
      <AuthCard title="Password changed" lead="You have been signed out everywhere. Sign in with your new password.">
        <a className="btn btn-primary" href="/login/">
          Sign in
        </a>
      </AuthCard>
    ) : (
      <AuthCard title="Choose a new password">
        <form className="auth-form" onSubmit={reset} noValidate>
          <TextField id="rs-password" label="New password" type="password" autoComplete="new-password" value={password} onChange={setPassword} required hint="At least 12 characters." />
          <Problem error={error} />
          <button type="submit" className="btn btn-primary" disabled={busy || password.length < 12}>
            {busy ? "Saving…" : "Set new password"}
          </button>
        </form>
      </AuthCard>
    );
  }
  return done ? (
    <AuthCard title="Check your email" lead="If an account exists for that address, a reset link is on its way. It expires in one hour." />
  ) : (
    <AuthCard title="Reset your password" foot={<a href="/login/">Back to sign in</a>}>
      <form className="auth-form" onSubmit={request} noValidate>
        <TextField id="rr-email" label="Work email" type="email" value={email} onChange={setEmail} required />
        <Problem error={error} />
        <button type="submit" className="btn btn-primary" disabled={busy || !email}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </AuthCard>
  );
}

export function AcceptInvite() {
  const token = useQuery("token");
  const [invite, setInvite] = useState<{ orgName: string; role: string } | null | undefined>(undefined);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (token === null) return;
    api<{ invite: { orgName: string; role: string } | null }>("POST", "/invites/preview", { token })
      .then((r) => setInvite(r.invite))
      .catch(() => setInvite(null));
    api("GET", "/me")
      .then(() => setSignedIn(true))
      .catch(() => setSignedIn(false));
  }, [token]);
  const accept = async () => {
    setError("");
    try {
      await api("POST", "/invites/accept", { token });
      window.location.assign("/app/");
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const here = typeof window === "undefined" ? "/invite/" : `${window.location.pathname}${window.location.search}`;
  if (invite === undefined) return <AuthCard title="Checking your invite…" />;
  if (invite === null) return <AuthCard title="Invite not valid" lead="This invite is used, expired or revoked. Ask your teammate to send a new one." />;
  return (
    <AuthCard title={`Join ${invite.orgName}`} lead={<>You have been invited as <strong>{invite.role}</strong>.</>}>
      {signedIn ? (
        <>
          <Problem error={error} />
          <button type="button" className="btn btn-primary" onClick={accept}>
            Accept and open the workspace
          </button>
        </>
      ) : (
        <div className="row">
          <a className="btn btn-primary" href={`/signup/?next=${encodeURIComponent(here)}`}>
            Create an account
          </a>
          <a className="btn" href={`/login/?next=${encodeURIComponent(here)}`}>
            Sign in
          </a>
        </div>
      )}
      <p className="muted">Use the email address the invite was sent to.</p>
    </AuthCard>
  );
}
