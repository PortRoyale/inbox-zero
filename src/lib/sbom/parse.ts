import { get, getArr, getStr, isObject, UNSAFE_KEYS, uniqueStrings, type JsonObject } from "./json";
import { parsePurl, purlDisplayName } from "./purl";

export class SbomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SbomError";
  }
}

export type SbomComponent = {
  name: string;
  version: string;
  purl?: string;
  supplier?: string;
  licenses: string[];
  hashes: number;
  type?: string;
};

export type ParsedSbom = {
  format: "CycloneDX" | "SPDX";
  specVersion: string;
  created?: string;
  tool?: string;
  // Person or organisation that wrote the SBOM, when stated.
  author?: string;
  subject?: string;
  components: SbomComponent[];
  // Dependency relationships recorded (CycloneDX dependsOn entries, SPDX dependency and containment
  // relationships). The NTIA minimum elements ask for these, not just a flat component list.
  dependencyLinks: number;
};

export type ParseOptions = { maxComponents?: number };

// 5 MB, measured as string length.
export const SBOM_MAX_LENGTH = 5 * 1024 * 1024;
export const DEFAULT_MAX_COMPONENTS = 20000;

const UNSUPPORTED = "Unsupported SBOM: expected CycloneDX or SPDX JSON.";

export function parseSbom(text: string, opts: ParseOptions = {}): ParsedSbom {
  if (typeof text !== "string") throw new SbomError("That file could not be read as text.");
  if (text.length > SBOM_MAX_LENGTH) throw new SbomError("That file is too large. The limit is 5 MB.");
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (!body.trim()) throw new SbomError("That file is empty.");

  const max = opts.maxComponents ?? DEFAULT_MAX_COMPONENTS;
  if (!Number.isInteger(max) || max < 0) throw new RangeError("maxComponents must be a whole number of zero or more.");

  const doc = parseJson(body);
  if (!isObject(doc)) throw new SbomError(UNSUPPORTED);

  if (isCycloneDx(doc)) return parseCycloneDx(doc, max);
  if (isSpdx3(doc)) throw new SbomError("SPDX 3 is not supported yet. Export SPDX 2.3 JSON instead.");
  if (typeof get(doc, "spdxVersion") === "string") return parseSpdx(doc, max);
  throw new SbomError(UNSUPPORTED);
}

function parseJson(text: string): unknown {
  try {
    // The reviver drops prototype keys so they never reach our objects.
    return JSON.parse(text, (key: string, value: unknown) => (UNSAFE_KEYS.has(key) ? undefined : value));
  } catch (err) {
    if (err instanceof RangeError) throw new SbomError("That file is nested too deeply to read.");
    if (text.trimStart().startsWith("<")) {
      throw new SbomError("That file looks like XML. Upload the JSON version of your CycloneDX or SPDX SBOM.");
    }
    if (/^\s*SPDXVersion:/m.test(text)) throw new SbomError("That file looks like SPDX tag-value. Upload SPDX JSON instead.");
    throw new SbomError("That file is not valid JSON.");
  }
}

function isCycloneDx(doc: JsonObject): boolean {
  if (get(doc, "bomFormat") === "CycloneDX") return true;
  const schema = getStr(doc, "$schema");
  return !!schema && /cyclonedx\.org/i.test(schema) && typeof get(doc, "specVersion") === "string";
}

function isSpdx3(doc: JsonObject): boolean {
  const version = getStr(doc, "spdxVersion");
  if (version && /^SPDX-3/i.test(version)) return true;
  const context = get(doc, "@context");
  const contexts = Array.isArray(context) ? context : [context];
  return contexts.some((c) => typeof c === "string" && /spdx\.org\/rdf\/3/i.test(c));
}

// Collects components, merging duplicates by purl or name@version.
function componentSet(max: number) {
  const byKey = new Map<string, SbomComponent>();
  return {
    add(component: SbomComponent) {
      const key = component.purl ? `purl:${component.purl}` : `nv:${component.name}@${component.version}`;
      const existing = byKey.get(key);
      if (existing) {
        mergeInto(existing, component);
        return;
      }
      if (byKey.size >= max) {
        throw new SbomError(`That SBOM lists more than ${max.toLocaleString("en-US")} components, which is over the limit.`);
      }
      byKey.set(key, component);
    },
    list: () => [...byKey.values()],
  };
}

function mergeInto(target: SbomComponent, extra: SbomComponent): void {
  if (!target.name) target.name = extra.name;
  if (!target.version) target.version = extra.version;
  target.purl ??= extra.purl;
  target.supplier ??= extra.supplier;
  target.type ??= extra.type;
  target.licenses = uniqueStrings([...target.licenses, ...extra.licenses]);
  target.hashes = Math.max(target.hashes, extra.hashes);
}

function joinNames(values: (string | undefined)[]): string | undefined {
  const list = uniqueStrings(values);
  return list.length ? list.join(", ") : undefined;
}

function describe(name: string | undefined, version: string | undefined): string | undefined {
  if (!name) return undefined;
  return version ? `${name} ${version}` : name;
}

// CycloneDX

function parseCycloneDx(doc: JsonObject, max: number): ParsedSbom {
  const specVersion = getStr(doc, "specVersion");
  if (!specVersion) throw new SbomError("That CycloneDX file has no specVersion.");
  const match = /^1\.(\d+)$/.exec(specVersion);
  if (!match || Number(match[1]) < 2) {
    throw new SbomError(`Unsupported CycloneDX version ${specVersion}. Use CycloneDX 1.4 to 1.6 JSON.`);
  }

  const metadata = get(doc, "metadata");
  const root = get(metadata, "component");
  const rootRef = getStr(root, "bom-ref");
  const set = componentSet(max);

  // Iterative pre-order walk so deep nesting cannot overflow the stack.
  const stack: unknown[] = [...getArr(doc, "components"), ...getArr(root, "components")].reverse();
  while (stack.length) {
    const node = stack.pop();
    if (!isObject(node)) continue;
    const ref = getStr(node, "bom-ref");
    if (!(rootRef && ref === rootRef)) {
      const component = cdxComponent(node);
      if (component) set.add(component);
    }
    const children = getArr(node, "components");
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
  }

  let dependencyLinks = 0;
  for (const dep of getArr(doc, "dependencies")) dependencyLinks += getArr(dep, "dependsOn").filter((d) => typeof d === "string" && d).length;
  const result: ParsedSbom = { format: "CycloneDX", specVersion, components: set.list(), dependencyLinks };
  const created = getStr(metadata, "timestamp");
  const tool = cdxTools(metadata);
  const author = cdxAuthor(metadata);
  const subject = isObject(root) ? describe(cdxName(root), getStr(root, "version")) : undefined;
  if (created) result.created = created;
  if (tool) result.tool = tool;
  if (author) result.author = author;
  if (subject) result.subject = subject;
  return result;
}

function cdxName(node: JsonObject): string | undefined {
  const name = getStr(node, "name");
  const group = getStr(node, "group");
  if (!name || !group || name.startsWith(group)) return name;
  const purl = getStr(node, "purl");
  const sep = purl && /^pkg:\/*maven\//i.test(purl) ? ":" : "/";
  return `${group}${sep}${name}`;
}

function cdxComponent(node: JsonObject): SbomComponent | null {
  const rawPurl = getStr(node, "purl");
  const parsed = rawPurl ? parsePurl(rawPurl) : null;
  const purl = parsed ? rawPurl : undefined;
  const name = cdxName(node) ?? (parsed ? purlDisplayName(parsed) : undefined);
  const version = getStr(node, "version") ?? parsed?.version;
  if (!name && !purl && !version) return null;

  const supplierEntity = get(node, "supplier");
  const supplier =
    getStr(supplierEntity, "name") ??
    getArr(supplierEntity, "url").find((u): u is string => typeof u === "string" && !!u.trim()) ??
    getStr(get(node, "manufacturer"), "name") ??
    getStr(node, "publisher");

  const licenses: (string | undefined)[] = [];
  for (const entry of getArr(node, "licenses")) {
    licenses.push(getStr(entry, "expression"));
    const license = get(entry, "license");
    licenses.push(getStr(license, "id") ?? getStr(license, "name"));
  }

  const component: SbomComponent = {
    name: name ?? "",
    version: version ?? "",
    licenses: uniqueStrings(licenses),
    hashes: getArr(node, "hashes").filter((h) => getStr(h, "content")).length,
  };
  if (purl) component.purl = purl;
  if (supplier) component.supplier = supplier.trim();
  const type = getStr(node, "type");
  if (type) component.type = type;
  return component;
}

function cdxTools(metadata: unknown): string | undefined {
  const tools = get(metadata, "tools");
  // 1.4 uses an array; 1.5 and later use { components, services }.
  const entries = Array.isArray(tools) ? tools : [...getArr(tools, "components"), ...getArr(tools, "services")];
  return joinNames(entries.map((t) => describe(getStr(t, "name"), getStr(t, "version"))));
}

function cdxAuthor(metadata: unknown): string | undefined {
  const authors = getArr(metadata, "authors").map((a) => getStr(a, "name") ?? getStr(a, "email"));
  const manufacturer = getStr(get(metadata, "manufacturer"), "name") ?? getStr(get(metadata, "manufacture"), "name");
  return joinNames([...authors, manufacturer]);
}

// SPDX 2.2 and 2.3

const SPDX_DOCUMENT_ID = "SPDXRef-DOCUMENT";

function parseSpdx(doc: JsonObject, max: number): ParsedSbom {
  const spdxVersion = getStr(doc, "spdxVersion") ?? "";
  const match = /^SPDX-(2\.[23])$/.exec(spdxVersion);
  if (!match) throw new SbomError(`Unsupported SPDX version ${spdxVersion || "(blank)"}. Use SPDX 2.2 or 2.3 JSON.`);

  const creationInfo = get(doc, "creationInfo");
  const creators = getArr(creationInfo, "creators").filter((c): c is string => typeof c === "string");
  const tools = creators.filter((c) => /^\s*Tool:/i.test(c)).map((c) => spdxEntity(c));
  const authors = creators.filter((c) => /^\s*(Organization|Person):/i.test(c)).map((c) => spdxEntity(c));

  // Root elements come from documentDescribes and DESCRIBES relationships.
  const rootIds = new Set<string>();
  for (const id of getArr(doc, "documentDescribes")) if (typeof id === "string") rootIds.add(id);
  for (const rel of getArr(doc, "relationships")) {
    const type = getStr(rel, "relationshipType");
    const from = getStr(rel, "spdxElementId");
    const to = getStr(rel, "relatedSpdxElement");
    if (type === "DESCRIBES" && from === SPDX_DOCUMENT_ID && to) rootIds.add(to);
    if (type === "DESCRIBED_BY" && to === SPDX_DOCUMENT_ID && from) rootIds.add(from);
  }

  const packages = getArr(doc, "packages").filter(isObject);
  const roots = packages.filter((p) => rootIds.has(getStr(p, "SPDXID") ?? ""));
  // If every package is marked as a root, keep all but the first as components.
  const skipped = roots.length > 0 && roots.length === packages.length && packages.length > 1 ? roots.slice(0, 1) : roots;
  const skip = new Set<JsonObject>(skipped);

  const set = componentSet(max);
  for (const pkg of packages) {
    if (skip.has(pkg)) continue;
    const component = spdxComponent(pkg);
    if (component) set.add(component);
  }

  const root = roots[0];
  const subject = root ? describe(getStr(root, "name"), getStr(root, "versionInfo")) : getStr(doc, "name");
  let dependencyLinks = 0;
  for (const rel of getArr(doc, "relationships")) {
    const type = getStr(rel, "relationshipType") ?? "";
    if (/^(DEPENDS_ON|DEPENDENCY_OF|CONTAINS|CONTAINED_BY|STATIC_LINK|DYNAMIC_LINK|[A-Z]+_DEPENDENCY_OF)$/.test(type)) dependencyLinks++;
  }
  const result: ParsedSbom = { format: "SPDX", specVersion: match[1], components: set.list(), dependencyLinks };
  const created = getStr(creationInfo, "created");
  const tool = joinNames(tools);
  const author = joinNames(authors);
  if (created) result.created = created;
  if (tool) result.tool = tool;
  if (author) result.author = author;
  if (subject) result.subject = subject;
  return result;
}

// Strips "Organization: " style prefixes, trailing "(email)" and NOASSERTION.
function spdxEntity(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value
    .replace(/^\s*(Organization|Person|Tool):\s*/i, "")
    .replace(/\s*\([^()]*@[^()]*\)\s*$/, "")
    .trim();
  if (!cleaned || cleaned === "NOASSERTION" || cleaned === "NONE") return undefined;
  return cleaned;
}

function spdxLicense(value: string | undefined): string | undefined {
  return value && value !== "NOASSERTION" ? value : undefined;
}

function spdxComponent(pkg: JsonObject): SbomComponent | null {
  let purl: string | undefined;
  for (const ref of getArr(pkg, "externalRefs")) {
    const locator = getStr(ref, "referenceLocator");
    if (getStr(ref, "referenceType")?.toLowerCase() === "purl" && locator && parsePurl(locator)) {
      purl = locator;
      break;
    }
  }
  const parsed = purl ? parsePurl(purl) : null;
  const name = getStr(pkg, "name") ?? (parsed ? purlDisplayName(parsed) : undefined);
  const rawVersion = getStr(pkg, "versionInfo");
  const version = rawVersion && rawVersion !== "NOASSERTION" ? rawVersion : parsed?.version;
  if (!name && !purl && !version) return null;

  const component: SbomComponent = {
    name: name ?? "",
    version: version ?? "",
    licenses: uniqueStrings([spdxLicense(getStr(pkg, "licenseConcluded")), spdxLicense(getStr(pkg, "licenseDeclared"))]),
    hashes: getArr(pkg, "checksums").filter((c) => getStr(c, "checksumValue")).length,
  };
  if (purl) component.purl = purl;
  const supplier = spdxEntity(getStr(pkg, "supplier")) ?? spdxEntity(getStr(pkg, "originator"));
  if (supplier) component.supplier = supplier;
  const purpose = getStr(pkg, "primaryPackagePurpose");
  if (purpose) component.type = purpose.toLowerCase();
  return component;
}
