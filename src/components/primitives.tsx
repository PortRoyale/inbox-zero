"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";

export function Fcf({ cells, keyCell, redline = false }: { cells: React.ReactNode[]; keyCell?: React.ReactNode; redline?: boolean }) {
  return (
    <span className={`fcf${redline ? " is-redline" : ""}`}>
      {keyCell !== undefined && <span className="fcf-key">{keyCell}</span>}
      {cells.map((c, i) => (
        <span key={i}>{c}</span>
      ))}
    </span>
  );
}

export function Balloon({ children }: { children: React.ReactNode }) {
  return <span className="balloon">{children}</span>;
}

export function SheetHead({
  id,
  title,
  sheet,
  reference,
  intro,
  aside,
}: {
  id?: string;
  title: string;
  sheet: string;
  reference: string;
  intro?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="sheet-head">
      <div>
        <Fcf keyCell={sheet} cells={[reference]} />
        <h2 id={id}>{title}</h2>
        {intro && <p className="lead">{intro}</p>}
      </div>
      {aside}
    </div>
  );
}

export function CopyButton({ getText, label = "Copy as text" }: { getText: () => string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const [fallback, setFallback] = useState("");
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state === "manual") areaRef.current?.select();
    if (state === "copied") {
      const t = setTimeout(() => setState("idle"), 2000);
      return () => clearTimeout(t);
    }
  }, [state]);

  const copy = () => {
    const text = getText();
    try {
      navigator.clipboard.writeText(text).then(
        () => setState("copied"),
        () => {
          setFallback(text);
          setState("manual");
        },
      );
    } catch {
      setFallback(text);
      setState("manual");
    }
  };

  return (
    <div className="copy">
      <button type="button" className="btn" onClick={copy}>
        {state === "copied" ? "Copied" : label}
      </button>
      {state === "manual" && (
        <label className="field copy-fallback">
          <span className="label">Copying was blocked. Select all and copy:</span>
          <textarea ref={areaRef} readOnly value={fallback} rows={8} />
        </label>
      )}
    </div>
  );
}

export function ConfirmButton({ label, confirmLabel, onConfirm }: { label: string; confirmLabel: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button type="button" className="btn btn-quiet" onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }
  return (
    <div className="row">
      <button
        type="button"
        className="btn btn-danger"
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" className="btn btn-quiet" onClick={() => setArmed(false)}>
        Cancel
      </button>
    </div>
  );
}

export function ContactLine() {
  return (
    <p className="contact-line">
      <span className="label">Email</span>{" "}
      <a className="code" href={`mailto:${site.contactEmail}`}>
        {site.contactEmail}
      </a>
    </p>
  );
}

export function RedPen() {
  return (
    <svg className="redpen" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <path
        pathLength={1}
        d="M 52 4 C 80 2, 99 9, 98 20 C 97 32, 72 38, 48 37 C 22 36, 2 31, 2 19 C 3 8, 26 3, 58 5 L 66 7"
      />
    </svg>
  );
}

export function RevisionCloud({ active, children, className = "" }: { active: boolean; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const measure = () => setSize({ w: el.offsetWidth + 14, h: el.offsetHeight + 14 });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [active]);

  return (
    <div ref={ref} className={`revcloud ${className}`}>
      {children}
      {active && size && (
        <svg className="cloud" viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
          <path d={cloudPath(size.w, size.h)} />
        </svg>
      )}
    </div>
  );
}

function cloudPath(w: number, h: number, step = 22) {
  const inset = 3;
  const corners = [
    [inset, inset],
    [w - inset, inset],
    [w - inset, h - inset],
    [inset, h - inset],
  ];
  let d = `M ${corners[0][0]} ${corners[0][1]}`;
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = corners[i];
    const [x2, y2] = corners[(i + 1) % 4];
    const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / step));
    const r = (Math.hypot(x2 - x1, y2 - y1) / n) * 0.62;
    for (let k = 1; k <= n; k++) {
      const x = x1 + ((x2 - x1) * k) / n;
      const y = y1 + ((y2 - y1) * k) / n;
      d += ` A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }
  return `${d} Z`;
}
