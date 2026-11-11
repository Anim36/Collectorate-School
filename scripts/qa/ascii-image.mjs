/**
 * Prints a part of a PNG as a block of text.
 *
 * The navbar band is checked by eye in the terminal, so this draws a region
 * of a screenshot with one character per block of pixels: the brighter the
 * block, the brighter the character.
 *
 * Usage: node scripts/qa/ascii-image.mjs <file> [x] [y] [w] [h] [step]
 */

import fs from "node:fs";
import zlib from "node:zlib";

const file = process.argv[2] ?? "figma-tmp/nav-after-band.png";
const x0 = Number(process.argv[3] ?? 0);
const y0 = Number(process.argv[4] ?? 0);
const width = Number(process.argv[5] ?? 400);
const height = Number(process.argv[6] ?? 100);
const step = Number(process.argv[7] ?? 4);

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

if (!ihdr || ihdr.depth !== 8 || ihdr.interlace !== 0) {
  console.log("UNSUPPORTED PNG", JSON.stringify(ihdr));
  process.exit(1);
}

const channels = ihdr.colorType === 6 ? 4 : 3;
const stride = ihdr.width * channels;
const raw = zlib.inflateSync(Buffer.concat(idat));
const pixels = Buffer.alloc(ihdr.height * stride);

let pos = 0;

for (let y = 0; y < ihdr.height; y += 1) {
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

const ramp = " .:-=+*#%@";

const read = (x, y) => {
  const i = y * stride + x * channels;
  return (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114);
};

console.log(`${file} (${ihdr.width}x${ihdr.height}) region ${x0},${y0} ${width}x${height} step ${step}`);

for (let y = y0; y < Math.min(y0 + height, ihdr.height); y += step) {
  let line = "";

  for (let x = x0; x < Math.min(x0 + width, ihdr.width); x += step) {
    let sum = 0;
    let n = 0;

    for (let dy = 0; dy < step; dy += 1) {
      for (let dx = 0; dx < step; dx += 1) {
        const px = x + dx;
        const py = y + dy;
        if (px >= ihdr.width || py >= ihdr.height) continue;
        sum += read(px, py);
        n += 1;
      }
    }

    const value = sum / n;
    const index = Math.min(ramp.length - 1, Math.floor((value / 255) * ramp.length));
    line += ramp[index];
  }

  console.log(line);
}
