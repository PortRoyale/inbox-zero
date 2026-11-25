import { paths, type View } from "@/lib/paths";
import { site } from "@/lib/site";

const nav = [
  { href: paths.assessment, label: "Readiness check", view: "assessment" },
  { href: paths.releaseGate, label: "Release gate", view: "release-gate" },
  { href: paths.pricing, label: "Pricing", view: null },
  { href: paths.notes, label: "Notes", view: null },
] as const;

export function SiteHeader({ current }: { current?: View }) {
  const links = (
    <nav aria-label="Main">
      {nav.map((item) => (
        <a key={item.href} href={item.href} aria-current={item.view && item.view === current ? "page" : undefined}>
          {item.label}
        </a>
      ))}
    </nav>
  );
  return (
    <header className="masthead">
      <div className="wrap">
        <a className="wordmark" href={paths.home} aria-label={`${site.name} home`}>
          <span aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <circle cx="9" cy="9" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M9 0v18M0 9h18" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
          <span>{site.name.toUpperCase()}</span>
        </a>
        <div className="masthead-nav-wide">{links}</div>
        <a className="btn btn-primary masthead-cta" href={paths.assessment}>
          Free check
        </a>
      </div>
      <div className="masthead-nav-narrow">
        <div className="wrap">{links}</div>
      </div>
    </header>
  );
}
