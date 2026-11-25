import Link from "next/link";
import { Logo } from "@/components/Logo";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="no-print border-t border-line bg-paper">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-ink-soft sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-md">{site.tagline}.</p>
          <p className="max-w-md text-xs text-muted">
            {site.name} provides guidance and tooling, not legal advice. Confirm how the Cyber Resilience Act applies to
            your products with qualified counsel.
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-ink">Tools</p>
          <Link href="/assessment/" className="block hover:text-ink">CRA readiness check</Link>
          <Link href="/release-gate/" className="block hover:text-ink">Release security gate</Link>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-ink">Company</p>
          <Link href="/#pricing" className="block hover:text-ink">Pricing</Link>
          <a href={`mailto:${site.contactEmail}`} className="block hover:text-ink">Contact</a>
        </div>
      </div>
    </footer>
  );
}
