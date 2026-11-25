import { DrawingBackdrop, type Motif } from "@/components/DrawingBackdrop";
import { Fcf } from "@/components/primitives";

export function PageHero({
  id,
  motif,
  seed,
  label,
  cells = [],
  title,
  lead,
  actions,
  aside,
  above,
  children,
  level = 1,
}: {
  id: string;
  motif: Motif;
  seed?: number;
  label: string;
  cells?: string[];
  title: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  above?: React.ReactNode;
  children?: React.ReactNode;
  level?: 1 | 2;
}) {
  const H = level === 1 ? "h1" : "h2";
  return (
    <section className="sheet page-hero" aria-labelledby={id}>
      <div className="page-hero-grid">
        <DrawingBackdrop motif={motif} seed={seed} />
        <div className="page-hero-body">
          {above}
          <Fcf keyCell={label} cells={cells} />
          <H id={id} className="page-title">
            {title}
          </H>
          {lead && <div className="lead">{lead}</div>}
          {actions && <div className="row">{actions}</div>}
        </div>
        {aside && <div className="page-hero-aside">{aside}</div>}
      </div>
      {children}
    </section>
  );
}
