import type { Plan } from "@/lib/plan/model";

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// The fingerprint covers the plan's content (not its revision history), as SHA-512 over canonical JSON.
// The server computes the same digest when it signs a revision, so both sides agree byte for byte.
export function planContent(plan: Plan) {
  const { revisions: _revisions, ...content } = plan;
  return content;
}

export async function fingerprintPlan(plan: Plan) {
  const bytes = new TextEncoder().encode(canonicalJson(planContent(plan)));
  const digest = await crypto.subtle.digest("SHA-512", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function nextRevisionLetter(revisions: { rev: string }[]) {
  const n = revisions.length;
  let s = "";
  let i = n;
  do {
    s = String.fromCharCode(65 + (i % 26)) + s;
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return s;
}
