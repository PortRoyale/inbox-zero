"use client";

import { useEffect, useState } from "react";
import { craDates, revisions } from "@/lib/site";

const DAY = 86_400_000;
const DOMAIN_START = Date.UTC(2024, 10, 1);
const DOMAIN_END = Date.UTC(2028, 1, 1);

const milestones = [
  { date: craDates.enteredIntoForce, title: "Entered into force", tone: "ink" },
  { date: craDates.notifiedBodies, title: "Notified-body rules apply", tone: "ink" },
  { date: craDates.reportingObligations, title: "Reporting obligations apply", tone: "redline" },
  { date: craDates.fullApplication, title: "All obligations apply", tone: "ink" },
] as const;

const years = [2025, 2026, 2027, 2028];

export function useToday() {
  const [today, setToday] = useState(() => Date.parse(`${revisions[0].date}T00:00:00Z`));
  useEffect(() => {
    const now = new Date();
    setToday(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }, []);
  return today;
}

export function daysBetween(fromMs: number, toIso: string) {
  return Math.max(0, Math.round((Date.parse(`${toIso}T00:00:00Z`) - fromMs) / DAY));
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function formatDate(ms: number) {
  const d = new Date(ms);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const t = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export function Timeline() {
  const today = useToday();
  const remaining = daysBetween(today, craDates.fullApplication);
  return (
    <figure className="timeline" aria-label={`CRA timeline. ${remaining} days until all obligations apply on 11 December 2027.`}>
      <WideTimeline today={today} remaining={remaining} />
      <NarrowTimeline today={today} remaining={remaining} />
    </figure>
  );
}

function WideTimeline({ today, remaining }: { today: number; remaining: number }) {
  const x0 = 30;
  const x1 = 970;
  const axisY = 150;
  const x = (ms: number) => x0 + ((ms - DOMAIN_START) / (DOMAIN_END - DOMAIN_START)) * (x1 - x0);
  const labelY = [40, 40, 92, 40];
  const anchors = ["start", "start", "start", "end"] as const;
  const tx = x(today);
  const endX = x(t(craDates.fullApplication));

  return (
    <svg className="tl tl-wide" viewBox="0 0 1000 250" role="presentation">
      <defs>
        <pattern id="tl-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--paper)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink)" strokeWidth="1.2" />
        </pattern>
        <marker id="tl-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
          <path d="M0 1.5 L10 5 L0 8.5 Z" fill="var(--ink)" />
        </marker>
      </defs>

      <rect x={x(t(craDates.enteredIntoForce))} y={axisY - 9} width={tx - x(t(craDates.enteredIntoForce))} height={9} fill="url(#tl-hatch)" stroke="var(--ink)" strokeWidth="1" />
      <line className="plot" pathLength={1} x1={x0} y1={axisY} x2={x1} y2={axisY} stroke="var(--ink)" strokeWidth="2" />

      {years.map((y) => {
        const yx = x(Date.UTC(y, 0, 1));
        return (
          <g key={y}>
            <line x1={yx} y1={axisY} x2={yx} y2={axisY + 8} stroke="var(--ink)" strokeWidth="1" />
            <text x={yx} y={axisY + 24} textAnchor="middle" className="tl-year">
              {y}
            </text>
          </g>
        );
      })}

      {milestones.map((m, i) => {
        const mx = x(t(m.date));
        const color = m.tone === "redline" ? "var(--redline)" : "var(--ink)";
        const ly = labelY[i];
        const lx = anchors[i] === "end" ? mx - 8 : mx + 8;
        return (
          <g key={m.date}>
            <line x1={mx} y1={ly - 12} x2={mx} y2={axisY - 12} stroke={color} strokeWidth="1" />
            <path d={`M${mx - 7} ${axisY - 13} L${mx + 7} ${axisY - 13} L${mx} ${axisY - 1} Z`} fill={color} />
            <text x={lx} y={ly} textAnchor={anchors[i]} className="tl-date" fill={color}>
              {formatDate(t(m.date))}
            </text>
            <text x={lx} y={ly + 18} textAnchor={anchors[i]} className="tl-note" fill={color}>
              {m.title}
            </text>
          </g>
        );
      })}

      <line x1={tx} y1={axisY - 30} x2={tx} y2={226} stroke="var(--nonphoto)" strokeWidth="1.5" strokeDasharray="6 3 1.5 3" />
      <line x1={endX} y1={axisY + 32} x2={endX} y2={226} stroke="var(--ink)" strokeWidth="1" />
      <line x1={tx + 1} y1={212} x2={endX - 1} y2={212} stroke="var(--ink)" strokeWidth="1" markerStart="url(#tl-arrow)" markerEnd="url(#tl-arrow)" />
      <rect x={(tx + endX) / 2 - 62} y={196} width={124} height={30} fill="var(--paper)" />
      <text x={(tx + endX) / 2} y={217} textAnchor="middle" className="tl-dim">
        {remaining} DAYS
      </text>
      <text x={tx - 8} y={242} textAnchor="end" className="tl-today">
        TODAY {formatDate(today)}
      </text>
    </svg>
  );
}

function NarrowTimeline({ today, remaining }: { today: number; remaining: number }) {
  const y0 = 24;
  const y1 = 536;
  const axisX = 92;
  const y = (ms: number) => y0 + ((ms - DOMAIN_START) / (DOMAIN_END - DOMAIN_START)) * (y1 - y0);
  const ty = y(today);
  const endY = y(t(craDates.fullApplication));
  const labelOffset = [0, -26, -4, 0];

  return (
    <svg className="tl tl-narrow" viewBox="0 0 360 560" role="presentation">
      <defs>
        <pattern id="tln-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--paper)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink)" strokeWidth="1.2" />
        </pattern>
        <marker id="tln-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
          <path d="M0 1.5 L10 5 L0 8.5 Z" fill="var(--ink)" />
        </marker>
      </defs>

      <rect x={axisX} y={y(t(craDates.enteredIntoForce))} width={9} height={ty - y(t(craDates.enteredIntoForce))} fill="url(#tln-hatch)" stroke="var(--ink)" strokeWidth="1" />
      <line className="plot" pathLength={1} x1={axisX} y1={y0} x2={axisX} y2={y1} stroke="var(--ink)" strokeWidth="2" />

      {years.map((yr) => {
        const yy = y(Date.UTC(yr, 0, 1));
        return (
          <g key={yr}>
            <line x1={axisX - 8} y1={yy} x2={axisX} y2={yy} stroke="var(--ink)" strokeWidth="1" />
            <text x={axisX - 12} y={yy + 5} textAnchor="end" className="tl-year">
              {yr}
            </text>
          </g>
        );
      })}

      {milestones.map((m, i) => {
        const my = y(t(m.date));
        const color = m.tone === "redline" ? "var(--redline)" : "var(--ink)";
        const ly = my + labelOffset[i];
        return (
          <g key={m.date}>
            <path d={`M${axisX + 13} ${my - 7} L${axisX + 13} ${my + 7} L${axisX + 1} ${my} Z`} fill={color} />
            <polyline points={`${axisX + 13},${my} ${axisX + 26},${ly}`} fill="none" stroke={color} strokeWidth="1" />
            <text x={axisX + 32} y={ly - 2} className="tl-date" fill={color}>
              {formatDate(t(m.date))}
            </text>
            <text x={axisX + 32} y={ly + 15} className="tl-note" fill={color}>
              {m.title}
            </text>
          </g>
        );
      })}

      <line x1={axisX - 70} y1={ty} x2={axisX + 26} y2={ty} stroke="var(--nonphoto)" strokeWidth="1.5" strokeDasharray="6 3 1.5 3" />
      <text x={axisX + 32} y={ty + 20} className="tl-today">
        TODAY {formatDate(today)}
      </text>
      <line x1={axisX - 2} y1={endY} x2={axisX - 70} y2={endY} stroke="var(--ink)" strokeWidth="1" />
      <line x1={axisX - 58} y1={ty + 1} x2={axisX - 58} y2={endY - 1} stroke="var(--ink)" strokeWidth="1" markerStart="url(#tln-arrow)" markerEnd="url(#tln-arrow)" />
      <rect x={axisX - 70} y={(ty + endY) / 2 - 46} width={24} height={92} fill="var(--paper)" />
      <text
        x={axisX - 52}
        y={(ty + endY) / 2}
        textAnchor="middle"
        className="tl-dim"
        transform={`rotate(-90 ${axisX - 52} ${(ty + endY) / 2})`}
      >
        {remaining} DAYS
      </text>
    </svg>
  );
}
