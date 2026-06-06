// Generates Luggist's PWA icons (a white suitcase on a teal field) as PNGs.
// Run with: node scripts/gen-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(N, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0);
  ihdr.writeUInt32BE(N, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = N * 4;
  const raw = Buffer.alloc((stride + 1) * N);
  for (let y = 0; y < N; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function makeIcon(N) {
  const buf = Buffer.alloc(N * N * 4);
  const teal = [13, 148, 136, 255];
  const white = [255, 255, 255, 255];
  const set = (x, y, c) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= N || y >= N) return;
    const i = (y * N + x) * 4;
    buf[i] = c[0];
    buf[i + 1] = c[1];
    buf[i + 2] = c[2];
    buf[i + 3] = c[3];
  };
  // Full-bleed teal background (good for maskable icons).
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) set(x, y, teal);

  // Rounded-rectangle fill helper (fractions of N).
  const rr = (fx0, fy0, fx1, fy1, fr, col) => {
    const x0 = fx0 * N,
      y0 = fy0 * N,
      x1 = fx1 * N,
      y1 = fy1 * N,
      r = fr * N;
    for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
      for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
        const dx = x < x0 + r ? x0 + r - x : x > x1 - 1 - r ? x - (x1 - 1 - r) : 0;
        const dy = y < y0 + r ? y0 + r - y : y > y1 - 1 - r ? y - (y1 - 1 - r) : 0;
        if (dx * dx + dy * dy <= r * r) set(x, y, col);
      }
    }
  };

  // Handle (∩): white block with a teal cut-out that stops at the body top.
  rr(0.42, 0.3, 0.58, 0.41, 0.03, white);
  rr(0.455, 0.34, 0.545, 0.4, 0.02, teal);
  // Suitcase body.
  rr(0.3, 0.4, 0.7, 0.74, 0.05, white);
  // Clasp line across the body.
  const ly = Math.round(N * 0.565);
  const lh = Math.max(2, Math.round(N * 0.014));
  for (let y = ly; y < ly + lh; y++)
    for (let x = Math.round(N * 0.3); x < Math.round(N * 0.7); x++) set(x, y, teal);

  return encodePNG(N, buf);
}

mkdirSync(join(root, "public", "icons"), { recursive: true });

const outputs = [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["public/icons/maskable-512.png", 512],
  ["app/icon.png", 256],
  ["app/apple-icon.png", 180],
];

for (const [rel, size] of outputs) {
  writeFileSync(join(root, rel), makeIcon(size));
  console.log(`wrote ${rel} (${size}px)`);
}
