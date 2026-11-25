// A small, dependency-free validator. Each validator returns the parsed value or throws ValidationError.
export class ValidationError extends Error {
  constructor(
    public readonly path: string,
    message: string,
  ) {
    super(`${path || "body"}: ${message}`);
  }
}

export type V<T> = (value: unknown, path: string) => T;
export type Infer<T> = T extends V<infer U> ? U : never;

const fail = (path: string, msg: string): never => {
  throw new ValidationError(path, msg);
};

export const v = {
  string:
    (opts: { min?: number; max: number; trim?: boolean; pattern?: RegExp }): V<string> =>
    (value, path) => {
      if (typeof value !== "string") fail(path, "must be text");
      const s = opts.trim === false ? (value as string) : (value as string).trim();
      if (s.length < (opts.min ?? 0)) fail(path, opts.min === 1 ? "is required" : `must be at least ${opts.min} characters`);
      if (s.length > opts.max) fail(path, `must be at most ${opts.max} characters`);
      if (opts.pattern && !opts.pattern.test(s)) fail(path, "has an invalid format");
      // Reject control characters other than tab and newlines.
      if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(s)) fail(path, "contains invalid characters");
      return s;
    },
  email: (): V<string> => (value, path) => {
    const s = v.string({ min: 3, max: 254 })(value, path).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) fail(path, "must be a valid email address");
    return s;
  },
  enum:
    <const T extends string>(values: readonly T[]): V<T> =>
    (value, path) => {
      if (typeof value !== "string" || !values.includes(value as T)) fail(path, `must be one of ${values.join(", ")}`);
      return value as T;
    },
  int:
    (opts: { min: number; max: number }): V<number> =>
    (value, path) => {
      if (typeof value !== "number" || !Number.isInteger(value)) fail(path, "must be a whole number");
      if ((value as number) < opts.min || (value as number) > opts.max) fail(path, `must be between ${opts.min} and ${opts.max}`);
      return value as number;
    },
  bool: (): V<boolean> => (value, path) => {
    if (typeof value !== "boolean") fail(path, "must be true or false");
    return value as boolean;
  },
  timestamp: (): V<number> => (value, path) => {
    const n = typeof value === "string" ? Date.parse(value) : value;
    if (typeof n !== "number" || !Number.isFinite(n)) fail(path, "must be a date and time");
    if ((n as number) < Date.UTC(2020, 0, 1) || (n as number) > Date.UTC(2100, 0, 1)) fail(path, "is out of range");
    return Math.round(n as number);
  },
  uuid: (): V<string> => (value, path) => v.string({ min: 36, max: 36, pattern: /^[0-9a-f-]{36}$/ })(value, path),
  optional:
    <T>(inner: V<T>): V<T | undefined> =>
    (value, path) =>
      value === undefined || value === null ? undefined : inner(value, path),
  array:
    <T>(inner: V<T>, opts: { max: number }): V<T[]> =>
    (value, path) => {
      if (!Array.isArray(value)) fail(path, "must be a list");
      if ((value as unknown[]).length > opts.max) fail(path, `must have at most ${opts.max} items`);
      return (value as unknown[]).map((item, i) => inner(item, `${path}[${i}]`));
    },
  object:
    <S extends Record<string, V<unknown>>>(shape: S): V<{ [K in keyof S]: Infer<S[K]> }> =>
    (value, path) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "must be an object");
      const out: Record<string, unknown> = {};
      for (const [key, check] of Object.entries(shape)) out[key] = check((value as Record<string, unknown>)[key], path ? `${path}.${key}` : key);
      return out as { [K in keyof S]: Infer<S[K]> };
    },
  // Arbitrary JSON (for documents validated elsewhere), with a size cap on its serialised form.
  json:
    (opts: { maxBytes: number }): V<unknown> =>
    (value, path) => {
      if (value === undefined) fail(path, "is required");
      if (Buffer.byteLength(JSON.stringify(value)) > opts.maxBytes) fail(path, "is too large");
      return value;
    },
};
