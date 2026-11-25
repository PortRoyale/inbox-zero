export function Crumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="crumbs">
      {items.map((it, i) => (
        <span key={it.path}>
          {i > 0 && <span aria-hidden="true"> / </span>}
          {i < items.length - 1 ? <a href={it.path}>{it.name}</a> : <span aria-current="page">{it.name}</span>}
        </span>
      ))}
    </nav>
  );
}
