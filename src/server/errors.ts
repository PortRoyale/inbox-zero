export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
  }
}

export const notFound = () => new HttpError(404, "Not found.");
export const forbidden = (msg = "You don't have permission to do that.") => new HttpError(403, msg);
export const tooMany = (retryAfter: number) => new HttpError(429, "Too many attempts. Wait a few minutes and try again.", retryAfter);
export const badRequest = (msg: string) => new HttpError(400, msg);
