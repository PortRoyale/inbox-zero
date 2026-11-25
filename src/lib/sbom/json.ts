// Small helpers for reading untrusted JSON without touching prototypes.

export const UNSAFE_KEYS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);

export type JsonObject = Record<string, unknown>;

export function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Own property lookup that ignores prototype keys.
export function get(value: unknown, key: string): unknown {
  if (!isObject(value) || UNSAFE_KEYS.has(key) || !Object.hasOwn(value, key)) return undefined;
  return value[key];
}

// Trimmed non-empty string, or undefined.
export function str(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function getStr(value: unknown, key: string): string | undefined {
  return str(get(value, key));
}

export function getArr(value: unknown, key: string): unknown[] {
  const found = get(value, key);
  return Array.isArray(found) ? found : [];
}

export function uniqueStrings(values: Iterable<string | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (value === undefined || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}
