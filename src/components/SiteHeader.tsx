import Link from "next/link";
import { Logo } from "@/components/Logo";

const nav = [
  { href: "/assessment/", label: "Readiness check" },
  { href: "/release-gate/", label: "Release gate" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-ink-soft md:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/assessment/"
          className="rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-strong"
        >
          Free assessment
        </Link>
      </div>
    </header>
  );
}
