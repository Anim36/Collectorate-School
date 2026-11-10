/**
 * Prints the colour of a few pixels of a PNG.
 *
 * The sticky navbar is drawn over a photograph, so the check is whether the
 * band is the navy scrim, whether the glass pill sits on top of it and
 * whether the open page carries its underline.
 *
 * Usage: node scripts/qa/probe-pixels.mjs <file> <x,y> <x,y> ...
 */

import fs from "node:fs";
import zlib from "node:zlib";

const file = process.argv[2] ?? "figma-tmp/nav-final-band.png";
const points = process.argv.slice(3).map((pair) => {
  const [x, y] = pair.split(",").map(Number);
  return { x, y };
});

const buffer = fs.readFileSync(file);

let offset = 8;
let ihdr = null;
const idat = [];

while (offset < buffer.length) {
  const length = buffer.readUInt32BE(offset);
  const type = buffer.toString("ascii", offset + 4, offset + 8);
  const data = buffer.subarray(offset + 8, offset + 8 + length);

  if (type === "IHDR") {
    ihdr = {
      width: data.readUInt32BE(0),
      height: data.readUInt32BE(4),
      depth: data[8],
      colorType: data[9],
      interlace: data[12],
    };
  }

  if (type === "IDAT") idat.push(data);
  if (type === "IEND") break;

  offset += 12 + length;
}

const { width, height, depth, colorType } = ihdr;

if (depth !== 8 || (colorType !== 6 && colorType !== 2) || ihdr.interlace !== 0) {
  console.log("UNSUPPORTED PNG", JSON.stringify(ihdr));
  process.exit(1);
}

const channels = colorType === 6 ? 4 : 3;
const stride = width * channels;
const raw = zlib.inflateSync(Buffer.concat(idat));
const pixels = Buffer.alloc(height * stride);

let pos = 0;

for (let y = 0; y < height; y += 1) {
  const filter = raw[pos];
  pos += 1;
  const row = raw.subarray(pos, pos + stride);
  pos += stride;

  const out = pixels.subarray(y * stride, (y + 1) * stride);
  const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;

  for (let x = 0; x < stride; x += 1) {
    const value = row[x];
    const a = x >= channels ? out[x - channels] : 0;
    const b = prev ? prev[x] : 0;
    const c = prev && x >= channels ? prev[x - channels] : 0;

    let result;

    switch (filter) {
      case 0:
        result = value;
        break;
      case 1:
        result = value + a;
        break;
      case 2:
        result = value + b;
        break;
      case 3:
        result = value + ((a + b) >> 1);
        break;
      case 4: {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        result = value + pred;
        break;
      }
      default:
        result = value;
    }

    out[x] = result & 0xff;
  }
}

/* The mean colour of a small square, so a single pixel cannot mislead. */

const sample = (cx, cy, radius = 3) => {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;

  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const i = y * stride + x * channels;
      r += pixels[i];
      g += pixels[i + 1];
      b += pixels[i + 2];
      n += 1;
    }
  }

  return {
    x: cx,
    y: cy,
    rgb: [Math.round(r / n), Math.round(g / n), Math.round(b / n)],
  };
};

console.log(`${file} (${width}x${height})`);

for (const point of points) {
  const s = sample(point.x, point.y);
  console.log(
    `  (${String(s.x).padStart(4)},${String(s.y).padStart(3)})  rgb(${s.rgb.join(", ")})  #${s.rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`,
  );
}
