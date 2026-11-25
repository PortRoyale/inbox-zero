// CRA Article 14 reporting clock. Pure functions; all times are epoch ms in UTC.

export type IncidentKind = "vulnerability" | "incident";

export type IncidentTimes = {
  awareAt: number;
  earlyWarningAt?: number | null;
  notificationAt?: number | null;
  fixAvailableAt?: number | null;
  finalReportAt?: number | null;
  usersInformedAt?: number | null;
  closedAt?: number | null;
};

export type MilestoneId = "early-warning" | "notification" | "final-report" | "users" | "intermediate";

export type Milestone = {
  id: MilestoneId;
  label: string;
  dueAt: number | null;
  doneAt: number | null;
  state: "done" | "due" | "overdue" | "waiting" | "optional";
  // dueAt minus now, only for "due" and "overdue" milestones with a dueAt.
  remainingMs: number | null;
  basis: string;
  note: string;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function has(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

// "2026-10-01 08:00 UTC"
export function formatUtc(ms: number): string {
  const iso = new Date(ms).toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

// Same day next month, clamped to the last day (31 Jan to 28 or 29 Feb). Time of day is kept.
export function addOneMonthUtc(ms: number): number {
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(d.getUTCDate(), lastDay);
  return Date.UTC(year, month, day, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
}

function duration(ms: number): string {
  const totalMin = Math.floor(ms / MINUTE);
  if (totalMin < 1) return "less than 1 min";
  const days = Math.floor(totalMin / (24 * 60));
  const hours = Math.floor((totalMin % (24 * 60)) / 60);
  const mins = totalMin % 60;
  if (days > 0) return hours > 0 ? `${days} d ${hours} h` : `${days} d`;
  if (hours > 0) return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`;
  return `${mins} min`;
}

// Rounds down to the minute. Negative input means overdue.
export function formatRemaining(ms: number): string {
  if (ms < 0) return `Overdue by ${duration(-ms)}`;
  const text = duration(ms);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function timing(dueAt: number | null, doneAt: number | null, now: number): Pick<Milestone, "state" | "remainingMs"> {
  if (doneAt !== null) return { state: "done", remainingMs: null };
  if (dueAt === null) return { state: "waiting", remainingMs: null };
  const remainingMs = dueAt - now;
  // Exactly at the deadline still counts as on time.
  return { state: remainingMs < 0 ? "overdue" : "due", remainingMs };
}

function doneNote(doneAt: number, dueAt: number | null): string {
  const late = dueAt !== null && doneAt > dueAt ? ` That was ${duration(doneAt - dueAt)} after the deadline.` : "";
  return `Done ${formatUtc(doneAt)}.${late}`;
}

const CLOSED_BUT_OPEN = " The case is marked closed, but this obligation is still open.";

function clocked(
  base: Pick<Milestone, "id" | "label" | "basis">,
  dueAt: number | null,
  doneAt: number | null | undefined,
  now: number,
  openNote: string,
  closedAt: number | null | undefined,
): Milestone {
  const done = has(doneAt) ? doneAt : null;
  const { state, remainingMs } = timing(dueAt, done, now);
  let note = done !== null ? doneNote(done, dueAt) : openNote;
  if (done === null && has(closedAt)) note += CLOSED_BUT_OPEN;
  return { ...base, dueAt, doneAt: done, state, remainingMs, note };
}

/**
 * Article 14 milestones in order: early warning, notification, final report, users, intermediate.
 *
 * Interpretation:
 * - Vulnerability final report: "waiting" with no dueAt until fixAvailableAt is set, then fix + 14 days.
 * - Incident final report: one calendar month after the actual notification time. Until the
 *   notification is sent it stays "waiting" with a provisional dueAt of one month after the
 *   72-hour notification deadline; the note says it is provisional.
 * - Users (Art 14(8)): no fixed deadline. "due" from awareness, never "overdue"; the note flags
 *   it once the notification has been sent and users are still not informed.
 * - Intermediate report (Art 14(6)): only on CSIRT request, so always "optional".
 * - closedAt never discharges an obligation; open ones say so in the note.
 */
export function incidentMilestones(kind: IncidentKind, t: IncidentTimes, now: number): Milestone[] {
  const vuln = kind === "vulnerability";
  const notifyBy = t.awareAt + 72 * HOUR;

  const earlyWarning = clocked(
    {
      id: "early-warning",
      label: "Early warning",
      basis: vuln ? "CRA Art. 14(1), 14(2)(a), 14(7)" : "CRA Art. 14(3), 14(4)(a), 14(7)",
    },
    t.awareAt + 24 * HOUR,
    t.earlyWarningAt,
    now,
    vuln
      ? "Without undue delay and within 24 hours of becoming aware. Where applicable, say which Member States the product is made available in. Submit through the ENISA Single Reporting Platform."
      : "Without undue delay and within 24 hours of becoming aware. Say whether you suspect unlawful or malicious acts and, where applicable, which Member States the product is made available in. Submit through the ENISA Single Reporting Platform.",
    t.closedAt,
  );

  const notification = clocked(
    {
      id: "notification",
      label: vuln ? "Vulnerability notification" : "Incident notification",
      basis: vuln ? "CRA Art. 14(2)(b), 14(7)" : "CRA Art. 14(4)(b), 14(7)",
    },
    notifyBy,
    t.notificationAt,
    now,
    vuln
      ? "Within 72 hours of becoming aware: general information about the product, the nature of the exploit and the vulnerability, measures taken, measures users can take and how sensitive the information is."
      : "Within 72 hours of becoming aware: the nature of the incident, an initial assessment, measures taken, measures users can take and how sensitive the information is.",
    t.closedAt,
  );

  let finalReport: Milestone;
  if (vuln) {
    const base = { id: "final-report", label: "Final report", basis: "CRA Art. 14(2)(c), 14(7)" } as const;
    finalReport = has(t.fixAvailableAt)
      ? clocked(
          base,
          t.fixAvailableAt + 14 * DAY,
          t.finalReportAt,
          now,
          `No later than 14 days after the corrective or mitigating measure became available (${formatUtc(t.fixAvailableAt)}). Include severity and impact, any malicious actor and details of the security update.`,
          t.closedAt,
        )
      : clocked(
          base,
          null,
          t.finalReportAt,
          now,
          "Due 14 days after a corrective or mitigating measure is available. Record when the fix is available to start this clock.",
          t.closedAt,
        );
  } else {
    const base = { id: "final-report", label: "Final report", basis: "CRA Art. 14(4)(c), 14(7)" } as const;
    if (has(t.notificationAt)) {
      finalReport = clocked(
        base,
        addOneMonthUtc(t.notificationAt),
        t.finalReportAt,
        now,
        `Within one month of the incident notification sent ${formatUtc(t.notificationAt)}. Include severity and impact, the likely threat or root cause, and applied and ongoing mitigation.`,
        t.closedAt,
      );
    } else {
      const provisional = addOneMonthUtc(notifyBy);
      const why =
        now > notifyBy
          ? "Waiting for the incident notification, which is overdue. Provisional date: one month after the missed 72-hour deadline."
          : "Waiting for the incident notification. Provisional date: one month after the 72-hour notification deadline.";
      finalReport = clocked(
        base,
        null,
        t.finalReportAt,
        now,
        `${why} The legal clock starts when you submit the notification.`,
        t.closedAt,
      );
      // Show the provisional date without making it a live deadline.
      finalReport = { ...finalReport, dueAt: provisional };
    }
  }

  const usersDone = has(t.usersInformedAt) ? t.usersInformedAt : null;
  let usersNote: string;
  if (usersDone !== null) {
    usersNote = doneNote(usersDone, null);
  } else {
    usersNote = has(t.notificationAt)
      ? "Action needed: the CSIRT has been notified but users have not been informed yet. Inform impacted users, and where appropriate all users, without undue delay."
      : "Without undue delay after becoming aware, inform impacted users, and where appropriate all users, about the issue and the measures they can take. Where appropriate, use a structured, machine-readable format.";
    if (has(t.closedAt)) usersNote += CLOSED_BUT_OPEN;
  }
  const users: Milestone = {
    id: "users",
    label: "Inform users",
    dueAt: null,
    doneAt: usersDone,
    state: usersDone !== null ? "done" : "due",
    remainingMs: null,
    basis: "CRA Art. 14(8)",
    note: usersNote,
  };

  const intermediate: Milestone = {
    id: "intermediate",
    label: "Intermediate report",
    dueAt: null,
    doneAt: null,
    state: "optional",
    remainingMs: null,
    basis: "CRA Art. 14(6)",
    note: "Only if the coordinating CSIRT asks for a status update. The Regulation sets no fixed deadline; follow the CSIRT's request.",
  };

  return [earlyWarning, notification, finalReport, users, intermediate];
}

// Earliest milestone that is due or overdue, not done, and has a deadline.
export function nextDeadline(ms: Milestone[]): Milestone | null {
  let best: Milestone | null = null;
  for (const m of ms) {
    if (m.state !== "due" && m.state !== "overdue") continue;
    if (m.dueAt === null || m.doneAt !== null) continue;
    if (best === null || m.dueAt < (best.dueAt as number)) best = m;
  }
  return best;
}
