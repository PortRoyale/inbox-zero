"use client";

import { useState } from "react";

// Isometric exploded view of a generic connected device. Each layer is a numbered part
// mapped to the CRA requirement it touches, like a parts list on an assembly drawing.
const COS = 0.866;
const SIN = 0.5;
const CX = 196;

type Layer = {
  part: string;
  requirement: string;
  ref: string;
  w: number;
  d: number;
  h: number;
  detail?: "screen" | "board" | "battery" | "port";
};

const LAYERS: Layer[] = [
  { part: "Enclosure", requirement: "Debug ports closed", ref: "Annex I Pt I(2)(j)", w: 200, d: 136, h: 10 },
  { part: "Display and buttons", requirement: "No default passwords", ref: "Annex I Pt I(2)(b)", w: 150, d: 96, h: 5, detail: "screen" },
  { part: "Board, chip and radio", requirement: "Secure boot, EN 18031", ref: "Annex I Pt I(2)(f)", w: 186, d: 126, h: 5, detail: "board" },
  { part: "Battery", requirement: "Keeps working under attack", ref: "Annex I Pt I(2)(h)", w: 112, d: 72, h: 14, detail: "battery" },
  { part: "Base and service port", requirement: "Signed updates only", ref: "Annex I Pt I(2)(c)", w: 200, d: 136, h: 16, detail: "port" },
];

const GAP = 64;
const TOP = 70;

export function ExplodedView() {
  const [hot, setHot] = useState<number | null>(null);
  return (
    <figure className="xv" aria-label="Exploded view of a connected device with each part mapped to a CRA requirement">
      <svg viewBox="0 0 400 420" className="xv-svg" role="presentation">
        <line x1={CX} y1="28" x2={CX} y2="404" className="xv-centre" />
        <g className="xv-cloud">
          <path d="M300 22 a13 13 0 0 1 24 -6 a11 11 0 0 1 19 9 a9 9 0 0 1 -2 18 h-41 a11 11 0 0 1 0 -21 Z" />
          <text x="296" y="16" textAnchor="end">CLOUD API</text>
          <path d="M306 44 Q 292 90 268 150" className="xv-link" />
        </g>
        {LAYERS.map((l, i) => {
          const cy = TOP + i * GAP;
          const from = (LAYERS.length / 2 - i - 0.5) * (GAP - 14);
          return (
            <g
              key={l.part}
              className={`xv-layer${hot === i ? " is-hot" : ""}`}
              style={{ ["--from" as string]: `${from}px`, ["--delay" as string]: `${0.25 + i * 0.06}s` }}
              onMouseEnter={() => setHot(i)}
              onMouseLeave={() => setHot(null)}
            >
              <Slab cy={cy} {...l} />
              <Balloon n={i + 1} x={l.w / 2} cy={cy} />
            </g>
          );
        })}
      </svg>
      <ol className="xv-legend">
        {LAYERS.map((l, i) => (
          <li key={l.part} className={hot === i ? "is-hot" : undefined} onMouseEnter={() => setHot(i)} onMouseLeave={() => setHot(null)}>
            <span className="balloon">{i + 1}</span>
            <span>
              <strong>{l.requirement}</strong>
              <span className="xv-part">
                {l.part} · <span className="code">{l.ref}</span>
              </span>
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

function iso(cy: number, u: number, v: number, dy = 0): [number, number] {
  return [CX + (u - v) * COS * 0.62, cy + (u + v) * SIN * 0.62 + dy];
}

const pts = (p: [number, number][]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

function Slab({ cy, w, d, h, detail }: Layer & { cy: number }) {
  const A = iso(cy, -w / 2, -d / 2);
  const B = iso(cy, w / 2, -d / 2);
  const C = iso(cy, w / 2, d / 2);
  const D = iso(cy, -w / 2, d / 2);
  const down = (p: [number, number]): [number, number] => [p[0], p[1] + h];
  return (
    <g className="xv-slab">
      <polygon points={pts([D, C, down(C), down(D)])} className="xv-side-l" />
      <polygon points={pts([C, B, down(B), down(C)])} className="xv-side-r" />
      <polygon points={pts([A, B, C, D])} className="xv-top" />
      {detail === "screen" && <polygon points={pts([iso(cy, -w / 2 + 14, -d / 2 + 12), iso(cy, w / 2 - 34, -d / 2 + 12), iso(cy, w / 2 - 34, d / 2 - 12), iso(cy, -w / 2 + 14, d / 2 - 12)])} className="xv-screen" />}
      {detail === "board" && (
        <>
          <polygon points={pts([iso(cy, -20, -20, -6), iso(cy, 20, -20, -6), iso(cy, 20, 20, -6), iso(cy, -20, 20, -6)])} className="xv-chip" />
          <line x1={iso(cy, -20, 20, -6)[0]} y1={iso(cy, -20, 20, -6)[1]} x2={iso(cy, -20, 20)[0]} y2={iso(cy, -20, 20)[1]} className="xv-edge" />
          <line x1={iso(cy, 20, 20, -6)[0]} y1={iso(cy, 20, 20, -6)[1]} x2={iso(cy, 20, 20)[0]} y2={iso(cy, 20, 20)[1]} className="xv-edge" />
          <polyline points={pts([iso(cy, 20, 0), iso(cy, 60, 0), iso(cy, 60, 40), iso(cy, 80, 40)])} className="xv-trace" />
          <polyline points={pts([iso(cy, -20, 0), iso(cy, -64, 0), iso(cy, -64, -36)])} className="xv-trace" />
          <line x1={iso(cy, 80, -50)[0]} y1={iso(cy, 80, -50)[1]} x2={iso(cy, 80, -50)[0]} y2={iso(cy, 80, -50)[1] - 34} className="xv-antenna" />
        </>
      )}
      {detail === "battery" && <line x1={iso(cy, -w / 2 + 12, 0)[0]} y1={iso(cy, -w / 2 + 12, 0)[1]} x2={iso(cy, w / 2 - 12, 0)[0]} y2={iso(cy, w / 2 - 12, 0)[1]} className="xv-edge" />}
      {detail === "port" && (
        <polygon
          points={pts([
            [D[0] + (C[0] - D[0]) * 0.42, D[1] + (C[1] - D[1]) * 0.42 + 4],
            [D[0] + (C[0] - D[0]) * 0.58, D[1] + (C[1] - D[1]) * 0.58 + 4],
            [D[0] + (C[0] - D[0]) * 0.58, D[1] + (C[1] - D[1]) * 0.58 + h - 4],
            [D[0] + (C[0] - D[0]) * 0.42, D[1] + (C[1] - D[1]) * 0.42 + h - 4],
          ])}
          className="xv-port"
        />
      )}
    </g>
  );
}

function Balloon({ n, x, cy }: { n: number; x: number; cy: number }) {
  const [bx, by] = iso(cy, x, 0);
  const lx = 352;
  return (
    <g className="xv-callout">
      <polyline points={pts([[bx, by], [bx + 16, by - 10], [lx - 13, by - 10]])} className="xv-leader" />
      <circle cx={bx} cy={by} r="2.4" className="xv-dot" />
      <circle cx={lx} cy={by - 10} r="12" className="xv-balloon" />
      <text x={lx} y={by - 6} textAnchor="middle" className="xv-num">
        {n}
      </text>
    </g>
  );
}
