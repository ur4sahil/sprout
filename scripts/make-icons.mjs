// Draws the Sprout app icons with no dependencies and writes them to public/icons.
// Run: node scripts/make-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const GREEN = [0x2e, 0x9e, 0x6b];
const WHITE = [0xff, 0xff, 0xff];

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, tail]);
}

function png(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// All shapes are in a unit square, x right and y down.
function inLeaf(x, y, cx, cy, angle, long, short) {
  const dx = x - cx;
  const dy = y - cy;
  const u = dx * Math.cos(angle) + dy * Math.sin(angle);
  const v = -dx * Math.sin(angle) + dy * Math.cos(angle);
  return (u * u) / (long * long) + (v * v) / (short * short) <= 1;
}

function inStem(x, y) {
  const x0 = 0.5;
  const y0 = 0.5;
  const y1 = 0.8;
  const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
  return Math.hypot(x - x0, y - (y0 + t * (y1 - y0))) <= 0.04;
}

function inSprout(x, y) {
  return (
    inStem(x, y) ||
    inLeaf(x, y, 0.34, 0.4, Math.PI * 0.2, 0.19, 0.105) ||
    inLeaf(x, y, 0.66, 0.34, -Math.PI * 0.22, 0.2, 0.11)
  );
}

function inRoundedSquare(x, y, radius) {
  const qx = Math.abs(x - 0.5) - (0.5 - radius);
  const qy = Math.abs(y - 0.5) - (0.5 - radius);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) <= radius;
}

// scale shrinks the sprout toward the centre (for the maskable safe zone).
function draw(size, { radius, scale }) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = 4;
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let background = 0;
      let sprout = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const x = (px + (sx + 0.5) / samples) / size;
          const y = (py + (sy + 0.5) / samples) / size;
          if (!inRoundedSquare(x, y, radius)) continue;
          background += 1;
          if (inSprout(0.5 + (x - 0.5) / scale, 0.5 + (y - 0.5) / scale)) sprout += 1;
        }
      }
      const total = samples * samples;
      const i = (py * size + px) * 4;
      const mix = background === 0 ? 0 : sprout / background;
      for (let c = 0; c < 3; c += 1) rgba[i + c] = Math.round(GREEN[c] + (WHITE[c] - GREEN[c]) * mix);
      rgba[i + 3] = Math.round((background / total) * 255);
    }
  }
  return png(size, rgba);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', draw(192, { radius: 0.22, scale: 1 }));
writeFileSync('public/icons/icon-512.png', draw(512, { radius: 0.22, scale: 1 }));
// Maskable and Apple icons fill the square. The device rounds the corners.
writeFileSync('public/icons/icon-maskable-512.png', draw(512, { radius: 0, scale: 0.78 }));
writeFileSync('public/icons/apple-touch-icon.png', draw(180, { radius: 0, scale: 0.92 }));
console.log('Wrote 4 icons to public/icons');
