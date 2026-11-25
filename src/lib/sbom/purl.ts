// Minimal package URL (purl) handling. See https://github.com/package-url/purl-spec

export type Purl = { type: string; namespace?: string; name: string; version?: string };

const TYPE_RE = /^[a-z][a-z0-9.+-]*$/;

function decode(part: string): string {
  return decodeURIComponent(part);
}

// Returns null when the string is not a usable purl.
export function parsePurl(input: string): Purl | null {
  let rest = input.trim();
  if (!/^pkg:/i.test(rest)) return null;
  rest = rest.slice(4).replace(/^\/+/, "");

  const hash = rest.lastIndexOf("#");
  if (hash >= 0) rest = rest.slice(0, hash);
  const query = rest.lastIndexOf("?");
  if (query >= 0) rest = rest.slice(0, query);

  const slash = rest.indexOf("/");
  if (slash <= 0) return null;
  const type = rest.slice(0, slash).toLowerCase();
  if (!TYPE_RE.test(type)) return null;
  rest = rest.slice(slash + 1).replace(/\/+$/, "");

  // The version is only in the last path segment, so "@scope/name" stays intact.
  let rawVersion: string | undefined;
  const at = rest.lastIndexOf("@");
  if (at > rest.lastIndexOf("/")) {
    rawVersion = rest.slice(at + 1);
    rest = rest.slice(0, at);
  }

  const segments = rest.split("/").filter(Boolean);
  const rawName = segments.pop();
  if (!rawName) return null;

  try {
    const name = decode(rawName);
    const namespace = segments.length ? segments.map(decode).join("/") : undefined;
    const version = rawVersion ? decode(rawVersion) : undefined;
    if (!name) return null;
    return { type, namespace, name, version: version || undefined };
  } catch {
    return null;
  }
}

// Human readable package name, e.g. "@babel/core" or "org.apache:commons".
export function purlDisplayName(purl: Purl): string {
  if (!purl.namespace) return purl.name;
  return purl.type === "maven" ? `${purl.namespace}:${purl.name}` : `${purl.namespace}/${purl.name}`;
}

// Inserts a version before any qualifiers or subpath.
export function purlWithVersion(input: string, version: string): string {
  const text = input.trim();
  const hash = text.lastIndexOf("#");
  const end = hash >= 0 ? hash : text.length;
  const query = text.lastIndexOf("?", end);
  const cut = query >= 0 ? query : end;
  return `${text.slice(0, cut).replace(/\/+$/, "")}@${encodeURIComponent(version)}${text.slice(cut)}`;
}
