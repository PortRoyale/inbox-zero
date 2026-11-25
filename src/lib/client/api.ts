// Browser-side API client. Same-origin only; the session cookie is HttpOnly and sent automatically.
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
  }
}

function apiUrl(path: string) {
  const [p, q] = path.split("?");
  return `/api${p.endsWith("/") ? p : `${p}/`}${q ? `?${q}` : ""}`;
}

export async function api<T = Record<string, unknown>>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; field?: string };
    throw new ApiError(res.status, d.error ?? `Request failed (${res.status}).`, d.field);
  }
  return data as T;
}

/** Fetches a file response and hands it to the browser as a download. */
export async function apiDownload(method: "GET" | "POST", path: string) {
  const res = await fetch(apiUrl(path), { method, credentials: "same-origin" });
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, d.error ?? `Download failed (${res.status}).`);
  }
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "download.json";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function loginUrl(next: string) {
  return `/login/?next=${encodeURIComponent(next)}`;
}
