// One error type for every "expected" failure, so routes can turn it into a
// clean JSON response and anything else into a generic 500.

export class ZoneError extends Error {
  constructor(status, message, { code = "error", fields } = {}) {
    super(message);
    this.name = "ZoneError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const unauthorized = (message = "Please sign in again.") =>
  new ZoneError(401, message, { code: "unauthorized" });

export const forbidden = (message = "You don't have permission to do that.") =>
  new ZoneError(403, message, { code: "forbidden" });

export const notFound = (what = "Post") =>
  new ZoneError(404, `${what} not found.`, { code: "not_found" });

export const badRequest = (message, fields) =>
  new ZoneError(400, message, { code: "invalid", fields });
