import { paths } from "@/lib/paths";
import { regulation, revisions, site } from "@/lib/site";

export function SiteFooter() {
  const current = revisions[revisions.length - 1];
  return (
    <footer className="site-foot">
      <div className="wrap">
        <dl className="tblock foot-block">
          <div className="foot-title">
            <dt>Title</dt>
            <dd>
              {site.name}: {site.tagline}
            </dd>
          </div>
          <div>
            <dt>Instrument</dt>
            <dd>{regulation}</dd>
          </div>
          <div>
            <dt>Rev · date</dt>
            <dd>
              {current.rev} · {current.date}
            </dd>
          </div>
          <div>
            <dt>Tools</dt>
            <dd>
              <ul className="foot-links">
                {[
                  [paths.plan, "Plan builder"],
                  [paths.assessment, "Readiness check"],
                  [paths.releaseGate, "Release gate"],
                  [paths.sbomCheck, "SBOM check"],
                  [paths.incidentClock, "Incident clock"],
                  [paths.brief, "Sector briefs"],
                  [paths.guides, "Guides"],
                  [paths.tools, "All tools"],
                ].map(([href, label]) => (
                  <li key={label}>
                    <a href={href}>{label}</a>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt>Company</dt>
            <dd>
              <ul className="foot-links foot-links-one">
                {[
                  [paths.pricing, "Pricing"],
                  [paths.security, "Trust centre"],
                  [paths.terms, "Terms"],
                  [paths.privacy, "Privacy"],
                  [`mailto:${site.contactEmail}`, site.contactEmail],
                ].map(([href, label]) => (
                  <li key={label}>
                    <a href={href}>{label}</a>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div className="foot-note">
            <dt>Note</dt>
            <dd>
              {site.name} provides guidance and tooling, not legal advice. Confirm how the Cyber Resilience Act applies to
              your products with qualified counsel.
            </dd>
          </div>
        </dl>
      </div>
    </footer>
  );
}
