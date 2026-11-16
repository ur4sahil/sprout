// gzip in the browser, with the built-in compression streams.

async function through(bytes: Uint8Array, transform: { writable: WritableStream<BufferSource>; readable: ReadableStream<Uint8Array> }): Promise<Uint8Array> {
  const writer = transform.writable.getWriter();
  // A bad file fails on the reading side too. These are caught here so nothing is left unhandled.
  const written = writer
    .write(bytes as BufferSource)
    .then(() => writer.close())
    .catch(() => undefined);
  const reader = transform.readable.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await written;
  const out = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.byteLength;
  }
  return out;
}

export function gzip(text: string): Promise<Uint8Array> {
  return through(new TextEncoder().encode(text), new CompressionStream('gzip'));
}

// Throws when the bytes are not a gzip file.
export async function gunzip(bytes: Uint8Array): Promise<string> {
  return new TextDecoder('utf-8', { fatal: true }).decode(await through(bytes, new DecompressionStream('gzip')));
}
