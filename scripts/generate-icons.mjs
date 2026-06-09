/*
 * Generates the PWA PNG icons with zero dependencies (Node's built-in zlib).
 *
 * Draws a simple "synapse" mark — a central node with two amber satellites
 * connected by axons — on the brand teal background. Run with:
 *
 *   node scripts/generate-icons.mjs
 *
 * Produces public/icons/icon-192.png, icon-512.png, icon-maskable-512.png.
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "icons");

// ── tiny PNG encoder (RGB, 8-bit, no alpha) ──────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width, height, rgb) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 = truecolour RGB
  // 10,11,12 = compression/filter/interlace = 0

  // raw scanlines: filter byte (0) + RGB row
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── drawing helpers ──────────────────────────────────────────────────────
function makeCanvas(size, [r, g, b]) {
  const buf = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    buf[i * 3] = r;
    buf[i * 3 + 1] = g;
    buf[i * 3 + 2] = b;
  }
  return buf;
}

function setPx(buf, size, x, y, [r, g, b]) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 3;
  buf[i] = r;
  buf[i + 1] = g;
  buf[i + 2] = b;
}

function disc(buf, size, cx, cy, rad, color) {
  const r2 = rad * rad;
  for (let y = Math.floor(cy - rad); y <= cy + rad; y++) {
    for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPx(buf, size, x, y, color);
    }
  }
}

function segment(buf, size, x0, y0, x1, y1, half, color) {
  const minX = Math.floor(Math.min(x0, x1) - half);
  const maxX = Math.ceil(Math.max(x0, x1) + half);
  const minY = Math.floor(Math.min(y0, y1) - half);
  const maxY = Math.ceil(Math.max(y0, y1) + half);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy || 1;
  const h2 = half * half;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      let t = ((x - x0) * dx + (y - y0) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = x0 + t * dx;
      const py = y0 + t * dy;
      const ddx = x - px;
      const ddy = y - py;
      if (ddx * ddx + ddy * ddy <= h2) setPx(buf, size, x, y, color);
    }
  }
}

// brand colours
const TEAL = [13, 148, 136];
const TEAL_DEEP = [15, 118, 110];
const WHITE = [246, 250, 249];
const AMBER = [245, 158, 11];

function drawMark(size, { padScale = 1 } = {}) {
  const buf = makeCanvas(size, TEAL_DEEP);
  const c = size / 2;
  const s = (size / 512) * padScale; // unit scale

  // satellite nodes + axons (amber)
  const satellites = [
    [c - 150 * s, c - 120 * s],
    [c + 150 * s, c - 40 * s],
    [c + 20 * s, c + 160 * s],
  ];
  for (const [sx, sy] of satellites) {
    segment(buf, size, c, c, sx, sy, 16 * s, AMBER);
  }
  for (const [sx, sy] of satellites) {
    disc(buf, size, sx, sy, 34 * s, TEAL);
    disc(buf, size, sx, sy, 30 * s, AMBER);
  }

  // central node (white core with teal ring)
  disc(buf, size, c, c, 92 * s, WHITE);
  disc(buf, size, c, c, 60 * s, TEAL);
  disc(buf, size, c, c, 34 * s, WHITE);

  return encodePNG(size, size, buf);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "icon-192.png"), drawMark(192));
writeFileSync(join(OUT_DIR, "icon-512.png"), drawMark(512));
// maskable: shrink the mark into the safe zone (~80%).
writeFileSync(join(OUT_DIR, "icon-maskable-512.png"), drawMark(512, { padScale: 0.78 }));

console.log("Icons written to public/icons/");
