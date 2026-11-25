import { describe, expect, it } from "vitest";
import {
  addOneMonthUtc,
  formatRemaining,
  incidentMilestones,
  nextDeadline,
  type IncidentKind,
  type IncidentTimes,
  type Milestone,
  type MilestoneId,
} from "@/lib/incidents";

const MIN = 60_000;
const H = 60 * MIN;
const D = 24 * H;
const AWARE = Date.UTC(2026, 9, 1, 8, 0); // 1 Oct 2026 08:00 UTC

const get = (ms: Milestone[], id: MilestoneId) => ms.find((m) => m.id === id) as Milestone;
const run = (kind: IncidentKind, t: Partial<IncidentTimes>, now: number) =>
  incidentMilestones(kind, { awareAt: AWARE, ...t }, now);

describe("incidentMilestones", () => {
  it("returns the milestones in a fixed order for both kinds", () => {
    for (const kind of ["vulnerability", "incident"] as const) {
      expect(run(kind, {}, AWARE).map((m) => m.id)).toEqual([
        "early-warning",
        "notification",
        "final-report",
        "users",
        "intermediate",
      ]);
    }
  });

  it("sets 24 and 72 hour deadlines for an exploited vulnerability", () => {
    const ms = run("vulnerability", {}, AWARE + H);
    expect(get(ms, "early-warning")).toMatchObject({ dueAt: AWARE + 24 * H, state: "due", remainingMs: 23 * H });
    expect(get(ms, "notification")).toMatchObject({ dueAt: AWARE + 72 * H, state: "due", remainingMs: 71 * H });
    expect(get(ms, "notification").label).toBe("Vulnerability notification");
    expect(get(ms, "early-warning").basis).toContain("14(2)(a)");
    expect(get(ms, "notification").basis).toContain("14(2)(b)");
    expect(get(ms, "final-report").basis).toContain("14(2)(c)");
  });

  it("sets 24 and 72 hour deadlines for a severe incident", () => {
    const ms = run("incident", {}, AWARE + H);
    expect(get(ms, "early-warning")).toMatchObject({ dueAt: AWARE + 24 * H, state: "due" });
    expect(get(ms, "early-warning").note).toContain("unlawful or malicious");
    expect(get(ms, "notification")).toMatchObject({ dueAt: AWARE + 72 * H, state: "due", label: "Incident notification" });
    expect(get(ms, "early-warning").basis).toContain("14(4)(a)");
    expect(get(ms, "notification").basis).toContain("14(4)(b)");
    expect(get(ms, "final-report").basis).toContain("14(4)(c)");
  });

  it("is still due exactly at the deadline and overdue one millisecond later", () => {
    expect(get(run("vulnerability", {}, AWARE + 24 * H), "early-warning")).toMatchObject({ state: "due", remainingMs: 0 });
    expect(get(run("vulnerability", {}, AWARE + 24 * H + 1), "early-warning")).toMatchObject({ state: "overdue", remainingMs: -1 });
  });

  it("computes overdue and remaining time", () => {
    const ms = run("incident", {}, AWARE + 25 * H + 10 * MIN);
    expect(get(ms, "early-warning")).toMatchObject({ state: "overdue", remainingMs: -(H + 10 * MIN) });
    expect(get(ms, "notification")).toMatchObject({ state: "due", remainingMs: 46 * H + 50 * MIN });
  });

  it("marks submitted steps done and notes a late submission", () => {
    const ms = run("vulnerability", { earlyWarningAt: AWARE + 26 * H, notificationAt: AWARE + 30 * H }, AWARE + 40 * H);
    const ew = get(ms, "early-warning");
    expect(ew).toMatchObject({ state: "done", doneAt: AWARE + 26 * H, remainingMs: null });
    expect(ew.note).toContain("2 h after the deadline");
    expect(get(ms, "notification").state).toBe("done");
    expect(get(ms, "notification").note).not.toContain("after the deadline");
  });

  it("keeps a vulnerability final report waiting until a fix is available", () => {
    const waiting = get(run("vulnerability", {}, AWARE + 5 * D), "final-report");
    expect(waiting).toMatchObject({ state: "waiting", dueAt: null, remainingMs: null });
    expect(waiting.note).toContain("14 days");

    const fix = AWARE + 3 * D;
    const due = get(run("vulnerability", { fixAvailableAt: fix }, fix + D), "final-report");
    expect(due).toMatchObject({ state: "due", dueAt: fix + 14 * D, remainingMs: 13 * D });

    const late = get(run("vulnerability", { fixAvailableAt: fix }, fix + 15 * D), "final-report");
    expect(late).toMatchObject({ state: "overdue", remainingMs: -D });

    const done = get(run("vulnerability", { fixAvailableAt: fix, finalReportAt: fix + 10 * D }, fix + 20 * D), "final-report");
    expect(done).toMatchObject({ state: "done", doneAt: fix + 10 * D });
  });

  it("keeps an incident final report waiting with a provisional date until the notification is sent", () => {
    const provisional = addOneMonthUtc(AWARE + 72 * H);
    const early = get(run("incident", {}, AWARE + H), "final-report");
    expect(early).toMatchObject({ state: "waiting", dueAt: provisional, remainingMs: null });
    expect(early.note).toContain("Provisional");
    expect(early.note).not.toContain("overdue");

    // Never overdue on its own, even well past the provisional date.
    const missed = get(run("incident", {}, provisional + 10 * D), "final-report");
    expect(missed).toMatchObject({ state: "waiting", dueAt: provisional });
    expect(missed.note).toContain("missed 72-hour deadline");
  });

  it("runs the incident final report from the actual notification time", () => {
    const sent = AWARE + 100 * H; // late notification
    const fr = get(run("incident", { notificationAt: sent }, sent + D), "final-report");
    expect(fr.dueAt).toBe(addOneMonthUtc(sent));
    expect(fr.state).toBe("due");
    expect(get(run("incident", { notificationAt: sent }, addOneMonthUtc(sent) + H), "final-report").state).toBe("overdue");
  });

  it("clamps the incident final report to the end of February", () => {
    const sent = Date.UTC(2027, 0, 31, 10, 0);
    const fr = get(incidentMilestones("incident", { awareAt: sent - 48 * H, notificationAt: sent }, sent), "final-report");
    expect(fr.dueAt).toBe(Date.UTC(2027, 1, 28, 10, 0));
  });

  it("treats informing users as due without a deadline and never overdue", () => {
    const users = get(run("vulnerability", {}, AWARE + 365 * D), "users");
    expect(users).toMatchObject({ state: "due", dueAt: null, remainingMs: null, basis: "CRA Art. 14(8)" });
    expect(users.note).not.toContain("Action needed");
  });

  it("flags users not yet informed once the notification is sent", () => {
    const users = get(run("incident", { notificationAt: AWARE + 50 * H }, AWARE + 60 * H), "users");
    expect(users.state).toBe("due");
    expect(users.note).toContain("Action needed");
  });

  it("marks users done when informed", () => {
    const users = get(run("incident", { notificationAt: AWARE + 50 * H, usersInformedAt: AWARE + 55 * H }, AWARE + 60 * H), "users");
    expect(users).toMatchObject({ state: "done", doneAt: AWARE + 55 * H });
  });

  it("models the intermediate report as optional on CSIRT request", () => {
    const im = get(run("vulnerability", {}, AWARE), "intermediate");
    expect(im).toMatchObject({ state: "optional", dueAt: null, doneAt: null, remainingMs: null, basis: "CRA Art. 14(6)" });
  });

  it("says when a closed case still has open obligations", () => {
    const ms = run("vulnerability", { earlyWarningAt: AWARE + H, closedAt: AWARE + 2 * H }, AWARE + 3 * H);
    expect(get(ms, "early-warning").note).not.toContain("marked closed");
    expect(get(ms, "notification").note).toContain("marked closed");
    expect(get(ms, "users").note).toContain("marked closed");
  });
});

describe("nextDeadline", () => {
  it("returns the earliest open deadline, overdue first", () => {
    const ms = run("vulnerability", {}, AWARE + 30 * H);
    expect(nextDeadline(ms)?.id).toBe("early-warning");
    expect(nextDeadline(ms)?.state).toBe("overdue");
  });

  it("skips done milestones", () => {
    const ms = run("vulnerability", { earlyWarningAt: AWARE + H }, AWARE + 2 * H);
    expect(nextDeadline(ms)?.id).toBe("notification");
  });

  it("moves on to the final report once earlier steps are done", () => {
    const fix = AWARE + H;
    const ms = run("vulnerability", { earlyWarningAt: AWARE + H, fixAvailableAt: fix }, AWARE + 2 * H);
    expect(nextDeadline(ms)?.id).toBe("notification");
    const later = run("vulnerability", { earlyWarningAt: AWARE + H, notificationAt: AWARE + 2 * H, fixAvailableAt: fix }, AWARE + 3 * H);
    expect(nextDeadline(later)?.id).toBe("final-report");
  });

  it("ignores waiting, optional and undated milestones", () => {
    const ms = run("incident", { earlyWarningAt: AWARE + H, notificationAt: AWARE + 2 * H, finalReportAt: AWARE + 3 * H }, AWARE + 4 * H);
    expect(get(ms, "users").state).toBe("due");
    expect(nextDeadline(ms)).toBeNull();
    expect(nextDeadline([])).toBeNull();
  });
});

describe("formatRemaining", () => {
  it("formats hours and minutes under a day", () => {
    expect(formatRemaining(23 * H + 59 * MIN + 30_000)).toBe("23 h 59 min");
    expect(formatRemaining(3 * H)).toBe("3 h");
    expect(formatRemaining(45 * MIN)).toBe("45 min");
  });

  it("formats days and hours from one day up", () => {
    expect(formatRemaining(2 * D + 4 * H + 59 * MIN)).toBe("2 d 4 h");
    expect(formatRemaining(D)).toBe("1 d");
  });

  it("formats overdue time", () => {
    expect(formatRemaining(-(3 * H + 10 * MIN))).toBe("Overdue by 3 h 10 min");
    expect(formatRemaining(-(2 * D + H))).toBe("Overdue by 2 d 1 h");
    expect(formatRemaining(-1_000)).toBe("Overdue by less than 1 min");
  });

  it("handles less than a minute", () => {
    expect(formatRemaining(0)).toBe("Less than 1 min");
    expect(formatRemaining(59_000)).toBe("Less than 1 min");
  });
});

describe("addOneMonthUtc", () => {
  it("clamps 31 January to 28 February in a non-leap year", () => {
    expect(addOneMonthUtc(Date.UTC(2027, 0, 31, 9, 15))).toBe(Date.UTC(2027, 1, 28, 9, 15));
  });

  it("clamps 31 January to 29 February in 2028", () => {
    expect(addOneMonthUtc(Date.UTC(2028, 0, 31, 23, 59, 59, 999))).toBe(Date.UTC(2028, 1, 29, 23, 59, 59, 999));
  });

  it("keeps the day when it exists and rolls over the year", () => {
    expect(addOneMonthUtc(Date.UTC(2026, 2, 15, 12))).toBe(Date.UTC(2026, 3, 15, 12));
    expect(addOneMonthUtc(Date.UTC(2026, 2, 31))).toBe(Date.UTC(2026, 3, 30));
    expect(addOneMonthUtc(Date.UTC(2026, 11, 31, 6))).toBe(Date.UTC(2027, 0, 31, 6));
  });
});
