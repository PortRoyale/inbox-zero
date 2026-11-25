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
              <a href={paths.plan}>Plan builder</a> · <a href={paths.assessment}>Readiness check</a> · <a href={paths.releaseGate}>Release gate</a> ·{" "}
              <a href={paths.pricing}>Pricing</a> · <a href={paths.guides}>Guides</a>
            </dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
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
