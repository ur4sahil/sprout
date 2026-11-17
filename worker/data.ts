import { json } from './auth';
import type { DataStore, RecordRow } from './store';

// The family's records (children, scores, answers, stickers, plans, check-in results).
// The server holds the one copy. The caller has already checked the session and the Origin.
// The Worker stores each record as the app sent it and never looks inside: the app checks
// every record against its schema when it reads it.

// The kinds of record kept here. Anything that belongs to one device stays on that device.
export const DATA_STORES: readonly string[] = ['children', 'skillStates', 'attempts', 'sessions', 'awards', 'plans', 'diagnostics', 'flags', 'diagnosticProgress', 'factStates', 'family'];

// Every listed parent shares this one family.
export const FAMILY = 'family';

export const PAGE_ROWS = 1000; // rows in one reply. The app asks again until there are no more
export const MAX_CHANGES = 250; // puts and removes in one request
export const MAX_KEY_LENGTH = 200;
export const MAX_VALUE_BYTES = 64 * 1024; // one record
export const MAX_BODY_BYTES = 2 * 1024 * 1024; // one request

const SAFE = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Strict-Transport-Security': 'max-age=31536000', 'X-Content-Type-Options': 'nosniff' };

const encodeCursor = (row: { store: string; key: string }): string => btoa(unescape(encodeURIComponent(JSON.stringify([row.store, row.key]))));

function decodeCursor(text: string): { store: string; key: string } | null {
  try {
    const found: unknown = JSON.parse(decodeURIComponent(escape(atob(text))));
    if (Array.isArray(found) && found.length === 2 && typeof found[0] === 'string' && typeof found[1] === 'string') return { store: found[0], key: found[1] };
  } catch {
    // Not a cursor this server made.
  }
  return null;
}

// GET /api/data. Every record, a page at a time: `?after=<cursor>` continues from the last page.
// The reply is put together from the stored text, so the Worker never parses a record.
export async function getData(store: DataStore, family: string, request: Request): Promise<Response> {
  const named = new URL(request.url).searchParams.get('after');
  const after = named === null ? null : decodeCursor(named);
  if (named !== null && after === null) return json(400, { error: 'bad_cursor' });
  const rows = await store.page(family, after, PAGE_ROWS);
  const last = rows[rows.length - 1];
  const next = rows.length === PAGE_ROWS && last ? encodeCursor(last) : null;
  const body = `{"rows":[${rows.map((row) => `{"store":${JSON.stringify(row.store)},"key":${JSON.stringify(row.key)},"value":${row.value}}`).join(',')}],"next":${JSON.stringify(next)}}`;
  return new Response(body, { status: 200, headers: SAFE });
}

const isKeyed = (item: unknown): item is { store: string; key: string } => {
  if (typeof item !== 'object' || item === null) return false;
  const { store, key } = item as { store?: unknown; key?: unknown };
  return typeof store === 'string' && DATA_STORES.includes(store) && typeof key === 'string' && key.length > 0 && key.length <= MAX_KEY_LENGTH;
};

// POST /api/data. `{ puts: [{ store, key, value }], removes: [{ store, key }] }`.
// Everything in one request is saved together, or nothing is.
export async function postData(store: DataStore, family: string, request: Request, now: Date): Promise<Response> {
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > MAX_BODY_BYTES) return json(413, { error: 'too_big' });
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json(413, { error: 'too_big' });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json(400, { error: 'bad_request' });
  }
  if (typeof body !== 'object' || body === null) return json(400, { error: 'bad_request' });
  const { puts = [], removes = [] } = body as { puts?: unknown; removes?: unknown };
  if (!Array.isArray(puts) || !Array.isArray(removes)) return json(400, { error: 'bad_request' });
  if (puts.length + removes.length === 0) return json(400, { error: 'nothing_to_save' });
  if (puts.length + removes.length > MAX_CHANGES) return json(413, { error: 'too_many' });

  const rows: RecordRow[] = [];
  for (const put of puts) {
    if (!isKeyed(put)) return json(400, { error: 'bad_record' });
    const value = (put as { value?: unknown }).value;
    // A record is always an object. Arrays, text and numbers are refused.
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return json(400, { error: 'bad_record' });
    const stored = JSON.stringify(value);
    if (stored.length > MAX_VALUE_BYTES) return json(413, { error: 'record_too_big' });
    rows.push({ store: put.store, key: put.key, value: stored });
  }
  const gone: { store: string; key: string }[] = [];
  for (const remove of removes) {
    if (!isKeyed(remove)) return json(400, { error: 'bad_record' });
    gone.push({ store: remove.store, key: remove.key });
  }
  await store.apply(family, rows, gone, now.toISOString());
  return json(200, { saved: rows.length, removed: gone.length });
}
