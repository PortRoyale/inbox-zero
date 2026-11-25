"use client";

import { useId, useRef, useState } from "react";
import { Balloon } from "@/components/primitives";

export type SheetTab = {
  id: string;
  label: string;
  content: React.ReactNode;
  state?: "done" | "open" | "blocked";
  badge?: React.ReactNode;
};

// One navigation pattern for every long page: a numbered sheet index beside one panel.
// "wizard" adds Back/Next for sequential tasks; without it the index works as tabs.
// All panels stay in the HTML (inactive ones hidden) so search engines still read them.
export function SheetTabs({
  items,
  label,
  wizard = false,
  side,
  value,
  onValueChange,
}: {
  items: SheetTab[];
  label: string;
  wizard?: boolean;
  side?: React.ReactNode;
  value?: number;
  onValueChange?: (i: number) => void;
}) {
  const [inner, setInner] = useState(0);
  const active = Math.min(value ?? inner, items.length - 1);
  const uid = useId();
  const topRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const go = (i: number, focus = false, scroll = false) => {
    const next = (i + items.length) % items.length;
    setInner(next);
    onValueChange?.(next);
    if (focus) btnRefs.current[next]?.focus();
    if (scroll) requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const keys: Record<string, number> = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: items.length - 1 };
    if (e.key in keys) {
      e.preventDefault();
      go(keys[e.key], true);
    }
  };

  return (
    <div className="plan-grid sheet-tabs" ref={topRef}>
      <div className="tab-side">
        <nav className="stepper sheet" aria-label={label}>
          <ol role="tablist" aria-orientation="vertical">
            {items.map((it, i) => (
              <li key={it.id} role="presentation">
                <button
                  ref={(el) => {
                    btnRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${uid}-tab-${it.id}`}
                  aria-selected={i === active}
                  aria-controls={`${uid}-panel-${it.id}`}
                  tabIndex={i === active ? 0 : -1}
                  className={`step-btn${it.state ? ` is-${it.state}` : ""}`}
                  onClick={() => go(i)}
                  onKeyDown={(e) => onKey(e, i)}
                >
                  <Balloon>{i + 1}</Balloon>
                  <span className="step-label">{it.label}</span>
                  {(it.badge !== undefined || it.state === "done") && (
                    <span className="step-state code">{it.state === "done" && it.badge === undefined ? "✓" : it.badge}</span>
                  )}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        {side}
      </div>
      <div className="sheet step-body">
        {items.map((it, i) => (
          <div key={it.id} role="tabpanel" id={`${uid}-panel-${it.id}`} aria-labelledby={`${uid}-tab-${it.id}`} hidden={i !== active} className="tab-panel">
            {it.content}
          </div>
        ))}
        {wizard && (
          <div className="step-nav">
            <button type="button" className="btn" onClick={() => go(active - 1, false, true)} disabled={active === 0}>
              ← Back
            </button>
            {active < items.length - 1 && (
              <button type="button" className="btn btn-primary" onClick={() => go(active + 1, false, true)}>
                Next: {items[active + 1].label} →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
