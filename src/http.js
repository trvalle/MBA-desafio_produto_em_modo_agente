export class HttpError extends Error {
  constructor(status, error) { super(error); this.status = status; this.error = error; }
}
export function json(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(data));
}
export async function body(req) {
  let data = ''; for await (const chunk of req) {
    data += chunk; if (data.length > 16384) throw new HttpError(422, 'invalid_request');
  }
  try { const value = JSON.parse(data); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value; }
  catch { throw new HttpError(422, 'invalid_request'); }
}
