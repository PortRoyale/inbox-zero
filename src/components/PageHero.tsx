import { DrawingBackdrop, type Motif } from "@/components/DrawingBackdrop";
import { HeroCrosshair } from "@/components/HeroCrosshair";
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
  backdrop = true,
  crosshair = false,
  extra,
  wideAside = false,
  tool,
  variant,
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
  backdrop?: boolean;
  crosshair?: boolean;
  extra?: React.ReactNode;
  wideAside?: boolean;
  tool?: "plan" | "readiness" | "gate" | "briefs";
  variant?: "blueprint";
}) {
  const H = level === 1 ? "h1" : "h2";
  return (
    <section className={`sheet page-hero${variant ? ` is-${variant}` : ""}`} data-tool={tool} aria-labelledby={id}>
      {crosshair && <HeroCrosshair />}
      <div className={`page-hero-grid${wideAside ? " is-wide-aside" : ""}`}>
        {backdrop && <DrawingBackdrop motif={motif} seed={seed} />}
        <div className="page-hero-body">
          {above}
          <Fcf keyCell={label} cells={cells} />
          <H id={id} className="page-title">
            {typeof title === "string" ? fixParens(title) : title}
          </H>
          {lead && <div className="lead">{lead}</div>}
          {actions && <div className="row">{actions}</div>}
          {extra}
        </div>
        {aside && <div className="page-hero-aside">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

function fixParens(text: string) {
  return text.split(/([()])/).map((part, i) =>
    part === "(" || part === ")" ? (
      <span key={i} className="paren">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
