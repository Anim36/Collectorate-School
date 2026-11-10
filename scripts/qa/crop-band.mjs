/**
 * Crops the top band of a page screenshot, so the navbar can be looked at
 * on its own.
 *
 * Usage: node scripts/qa/crop-band.mjs <inFile> <outFile> [height] [width]
 */

import fs from "node:fs";
import zlib from "node:zlib";

const inFile = process.argv[2] ?? "figma-tmp/nav-check-1440.png";
const outFile = process.argv[3] ?? "figma-tmp/nav-band.png";
const height = Number(process.argv[4] ?? 120);
const width = Number(process.argv[5] ?? 1440);

const buffer = fs.readFileSync(inFile);

/* The PNG header, the IHDR chunk and the start of the IDAT stream. */

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

if (!ihdr) {
  console.log("NO IHDR");
  process.exit(1);
}

const { width: srcWidth, height: srcHeight, depth, colorType } = ihdr;

if (depth !== 8 || (colorType !== 6 && colorType !== 2) || ihdr.interlace !== 0) {
  console.log("UNSUPPORTED PNG", JSON.stringify(ihdr));
  process.exit(1);
}

const channels = colorType === 6 ? 4 : 3;
const stride = srcWidth * channels;

/* Undo the PNG filtering, row by row. */

const raw = zlib.inflateSync(Buffer.concat(idat));
const pixels = Buffer.alloc(srcHeight * stride);

let pos = 0;

for (let y = 0; y < srcHeight; y += 1) {
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

/* Cut the band out and write it back as a PNG. */

const cropWidth = Math.min(width, srcWidth);
const cropHeight = Math.min(height, srcHeight);

const cropRaw = Buffer.alloc(cropHeight * (cropWidth * channels + 1));

for (let y = 0; y < cropHeight; y += 1) {
  cropRaw[y * (cropWidth * channels + 1)] = 0;
  pixels.copy(
    cropRaw,
    y * (cropWidth * channels + 1) + 1,
    y * stride,
    y * stride + cropWidth * channels,
  );
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([length, body, crc]);
}

const table = [];
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  table[n] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const outHeader = Buffer.alloc(13);
outHeader.writeUInt32BE(cropWidth, 0);
outHeader.writeUInt32BE(cropHeight, 4);
outHeader[8] = depth;
outHeader[9] = colorType;

fs.writeFileSync(
  outFile,
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", outHeader),
    chunk("IDAT", zlib.deflateSync(cropRaw)),
    chunk("IEND", Buffer.alloc(0)),
  ]),
);

console.log(`saved ${outFile} (${cropWidth}x${cropHeight})`);
