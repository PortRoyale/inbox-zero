"use client";

import { useEffect, useRef, useState } from "react";

const ROWS = "ABCDEF";

// CAD-style crosshair with a coordinate readout, for fine pointers only.
export function HeroCrosshair() {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const host = ref.current?.parentElement;
    if (!host) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || calm) return;
    const move = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      setPos({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height });
    };
    const leave = () => setPos(null);
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return () => {
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
    };
  }, []);

  const zone = pos ? `${ROWS[Math.min(ROWS.length - 1, Math.floor((pos.y / pos.h) * 4))]}${Math.min(8, Math.floor((pos.x / pos.w) * 8) + 1)}` : "";
  return (
    <div ref={ref} className="crosshair" aria-hidden="true">
      {pos && (
        <>
          <span className="ch-v" style={{ left: pos.x }} />
          <span className="ch-h" style={{ top: pos.y }} />
          <span className="ch-read code" style={{ left: pos.x + 12, top: pos.y + 12 }}>
            {zone} · X {(pos.x / 3.78).toFixed(1)} Y {(pos.y / 3.78).toFixed(1)} mm
          </span>
        </>
      )}
    </div>
  );
}
