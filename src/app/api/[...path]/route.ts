import { dispatch } from "@/server/api";

// Every API call goes through one dispatcher (src/server/http.ts) so security checks cannot be skipped.
export const dynamic = "force-dynamic";

export const GET = dispatch;
export const HEAD = dispatch;
export const POST = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;
