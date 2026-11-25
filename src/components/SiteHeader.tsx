import { paths, type View } from "@/lib/paths";
import { site } from "@/lib/site";

const nav = [
  { href: paths.plan, label: "Plan builder", view: "plan" },
  { href: paths.assessment, label: "Readiness check", view: "assessment" },
  { href: paths.tools, label: "Tools", view: "tools" },
  { href: paths.brief, label: "Sectors", view: "brief" },
  { href: paths.pricing, label: "Pricing", view: "pricing" },
  { href: paths.security, label: "Security", view: "security" },
] as const;

export function SiteHeader({ current }: { current?: View }) {
  // On phones "Sign in" moves into the scrolling nav row so the top row keeps one call to action.
  const links = (narrow: boolean) => (
    <nav aria-label="Main">
      {nav.map((item) => (
        <a key={item.href} href={item.href} aria-current={item.view && item.view === current ? "page" : undefined}>
          {item.label}
        </a>
      ))}
      {narrow && (
        <a className="masthead-signin-narrow" href={paths.login}>
          Sign in
        </a>
      )}
    </nav>
  );
  return (
    <header className="masthead">
      <div className="wrap">
        <a className="wordmark" href={paths.home} aria-label={`${site.name} home`}>
          <span aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" className="logo-mark">
              <path d="M10 2.6 A7.4 7.4 0 0 1 17.4 10" className="mark-q1" fill="none" strokeWidth="2.6" />
              <path d="M17.4 10 A7.4 7.4 0 0 1 10 17.4" className="mark-q2" fill="none" strokeWidth="2.6" />
              <path d="M10 17.4 A7.4 7.4 0 0 1 2.6 10" className="mark-q3" fill="none" strokeWidth="2.6" />
              <path d="M2.6 10 A7.4 7.4 0 0 1 10 2.6" className="mark-q4" fill="none" strokeWidth="2.6" />
              <path d="M10 0v20M0 10h20" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </span>
          <span>{site.name.toUpperCase()}</span>
        </a>
        <div className="masthead-nav-wide">{links(false)}</div>
        <div className="masthead-actions">
          <a className="masthead-signin" href={paths.login}>
            Sign in
          </a>
          <a className="btn btn-primary masthead-cta" href={paths.plan}>
            Build my plan
          </a>
        </div>
      </div>
      <div className="masthead-nav-narrow">
        <div className="wrap">{links(true)}</div>
      </div>
    </header>
  );
}
