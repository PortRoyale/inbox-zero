import Link from "next/link";

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-brand text-white hover:bg-brand-strong"
      : "border border-line bg-white text-ink hover:border-ink-soft";
  return (
    <Link href={href} className={`inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-semibold ${styles}`}>
      {children}
    </Link>
  );
}

export function SectionHeading({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: string }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <p className="text-sm font-semibold tracking-wide text-brand uppercase">{eyebrow}</p>}
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl">{title}</h2>
      {intro && <p className="mt-4 text-lg text-pretty text-ink-soft">{intro}</p>}
    </div>
  );
}
