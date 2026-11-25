export type Motif = "device" | "chip" | "document" | "shield" | "globe" | "gauge" | "network";

const W = 640;
const H = 360;
const GRID = 24;

// Generated, not hand-drawn: a seeded "PCB trace" field plus one engineering-drawing motif,
// so every page shares the same look while no two heroes are identical.
// Traces stay in the right half (minX) so they never run behind the headline or lead text.
export function DrawingBackdrop({ motif, seed = 7 }: { motif: Motif; seed?: number }) {
  const rand = mulberry32(seed);
  return (
    <svg className="backdrop" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">
      <g className="bd-traces">
        {traces(rand).map((t, i) => (
          <g key={i} style={{ ["--i" as string]: i }}>
            <path d={t.d} pathLength={1} />
            <rect x={t.start[0] - 3} y={t.start[1] - 3} width="6" height="6" />
            <circle cx={t.end[0]} cy={t.end[1]} r="3.2" />
          </g>
        ))}
      </g>
      <g className="bd-centre">
        <line x1="300" y1="180" x2="620" y2="180" />
        <line x1="460" y1="30" x2="460" y2="330" />
      </g>
      <g className="bd-motif">{MOTIFS[motif]}</g>
      <g className="bd-dim">
        <line x1="380" y1="318" x2="540" y2="318" markerStart="url(#bd-arrow)" markerEnd="url(#bd-arrow)" />
        <line x1="380" y1="300" x2="380" y2="326" />
        <line x1="540" y1="300" x2="540" y2="326" />
        <text x="460" y="312" textAnchor="middle">
          {DIMENSIONS[Math.floor(rand() * DIMENSIONS.length)]}
        </text>
      </g>
      <defs>
        <marker id="bd-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 2 L10 5 L0 8 Z" className="bd-arrowhead" />
        </marker>
      </defs>
    </svg>
  );
}

const DIMENSIONS = ["160 ±0.2", "Ø 48", "R 12", "4 × M3", "160 h7", "2 × 45°"];

function traces(rand: () => number) {
  const out: { d: string; start: [number, number]; end: [number, number] }[] = [];
  const dirs = [
    [1, 0],
    [1, 1],
    [0, 1],
    [1, -1],
    [0, -1],
  ];
  const minX = 312;
  for (let i = 0; i < 11; i++) {
    let x = minX + Math.round((rand() * (W - minX - 40)) / GRID) * GRID;
    let y = Math.round((rand() * (H - 80)) / GRID) * GRID + GRID;
    const start: [number, number] = [x, y];
    let d = `M${x} ${y}`;
    let dir = dirs[Math.floor(rand() * dirs.length)];
    const segs = 2 + Math.floor(rand() * 4);
    for (let s = 0; s < segs; s++) {
      const len = GRID * (1 + Math.floor(rand() * 4));
      x = Math.min(W - 8, Math.max(minX, x + dir[0] * len));
      y = Math.min(H - 8, Math.max(8, y + dir[1] * len));
      d += ` L${x} ${y}`;
      dir = dirs[Math.floor(rand() * dirs.length)];
    }
    out.push({ d, start, end: [x, y] });
  }
  return out;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MOTIFS: Record<Motif, React.ReactNode> = {
  device: (
    <>
      <rect x="380" y="120" width="160" height="120" />
      <rect x="396" y="136" width="92" height="56" />
      <circle cx="512" cy="152" r="10" />
      <circle cx="512" cy="182" r="6" />
      <line x1="396" y1="214" x2="524" y2="214" />
      <line x1="520" y1="120" x2="540" y2="84" />
      <rect x="560" y="120" width="28" height="120" />
      <line x1="540" y1="120" x2="560" y2="120" className="bd-proj" />
      <line x1="540" y1="240" x2="560" y2="240" className="bd-proj" />
    </>
  ),
  chip: (
    <>
      <rect x="400" y="120" width="120" height="120" />
      <rect x="430" y="150" width="60" height="60" className="bd-hidden" />
      <circle cx="414" cy="134" r="4" />
      {Array.from({ length: 7 }, (_, i) => 12 + i * 16).map((d) => (
        <g key={d}>
          <line x1={400 + d} y1="104" x2={400 + d} y2="120" />
          <line x1={400 + d} y1="240" x2={400 + d} y2="256" />
          <line x1="384" y1={120 + d} x2="400" y2={120 + d} />
          <line x1="520" y1={120 + d} x2="536" y2={120 + d} />
        </g>
      ))}
    </>
  ),
  document: (
    <>
      <rect x="392" y="70" width="136" height="190" />
      <path d="M496 70 L528 102 L496 102 Z" />
      {[118, 134, 150, 166, 182].map((y, i) => (
        <line key={y} x1="408" y1={y} x2={i % 2 ? 492 : 512} y2={y} />
      ))}
      <rect x="448" y="216" width="80" height="44" />
      <line x1="448" y1="230" x2="528" y2="230" />
      <line x1="488" y1="230" x2="488" y2="260" />
    </>
  ),
  shield: (
    <>
      <path d="M460 80 L530 106 L530 170 C530 216 498 246 460 262 C422 246 390 216 390 170 L390 106 Z" />
      <path d="M460 98 L514 118 L514 170 C514 206 490 230 460 244 C430 230 406 206 406 170 L406 118 Z" className="bd-hidden" />
      <path d="M432 172 L452 192 L492 148" />
    </>
  ),
  globe: (
    <>
      <circle cx="460" cy="180" r="96" />
      <ellipse cx="460" cy="180" rx="44" ry="96" />
      <ellipse cx="460" cy="180" rx="78" ry="96" className="bd-hidden" />
      <line x1="372" y1="140" x2="548" y2="140" />
      <line x1="372" y1="220" x2="548" y2="220" />
      <circle cx="496" cy="132" r="5" />
      <circle cx="430" cy="214" r="5" />
      <path d="M496 132 Q470 160 430 214" className="bd-hidden" />
    </>
  ),
  gauge: (
    <>
      <path d="M372 220 A88 88 0 0 1 548 220" />
      <path d="M396 220 A64 64 0 0 1 524 220" className="bd-hidden" />
      {Array.from({ length: 11 }, (_, i) => {
        const a = Math.PI - (i * Math.PI) / 10;
        return <line key={i} x1={460 + Math.cos(a) * 88} y1={220 - Math.sin(a) * 88} x2={460 + Math.cos(a) * (i % 5 ? 78 : 70)} y2={220 - Math.sin(a) * (i % 5 ? 78 : 70)} />;
      })}
      <line x1="460" y1="220" x2="512" y2="160" />
      <circle cx="460" cy="220" r="8" />
      <line x1="364" y1="220" x2="556" y2="220" />
    </>
  ),
  network: (
    <>
      {[
        [400, 120],
        [520, 110],
        [460, 180],
        [392, 250],
        [530, 246],
      ].map(([x, y], i) => (
        <rect key={i} x={x - 14} y={y - 10} width="28" height="20" />
      ))}
      <path d="M414 120 L506 110 M460 170 L408 128 M460 170 L516 120 M446 188 L404 240 M474 188 L520 236 M406 250 L516 246" />
    </>
  ),
};
