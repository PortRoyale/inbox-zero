export function LinkGrid({ title, links }: { title: string; links: { href: string; label: string; meta?: string }[] }) {
  return (
    <section className="stack-sm">
      <h2 className="grid-title">{title}</h2>
      <div className="link-grid">
        {links.map((l) => (
          <a key={l.href} href={l.href}>
            <span>{l.label}</span>
            {l.meta && <span>{l.meta}</span>}
          </a>
        ))}
      </div>
    </section>
  );
}
