/* Reads intrinsic image dimensions straight from file headers - no dependency.
 *
 * Width/height attributes are what let a browser reserve layout space before the
 * image arrives. Without them every image is a layout shift the moment it pops
 * in, which is most of them on a page this image-heavy.
 *
 *   size("assets/img/scenes/bowl.webp") -> { width: 882, height: 945 }
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BUILD_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(BUILD_DIR);
const cache = new Map();

function png(buf) {
  // IHDR is always the first chunk: width and height are big-endian uint32 at 16/20.
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function gif(buf) {
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

function jpeg(buf) {
  // Walk the segment list to the first SOFn marker, which carries the size.
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf &&
        marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

function webp(buf) {
  if (buf.toString('ascii', 12, 16) !== 'VP8 ') return webpLossless(buf);
  // Lossy "VP8 " chunk: 3-byte frame tag, then the start code 9D 01 2A,
  // then width and height as 14-bit fields little-endian.
  if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) {
    return webpLossless(buf);
  }
  return {
    width: buf.readUInt16LE(26) & 0x3fff,
    height: buf.readUInt16LE(28) & 0x3fff,
  };
}

function webpLossless(buf) {
  const tag = buf.toString('ascii', 12, 16);
  if (tag === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
  }
  if (tag === 'VP8X') {
    // 24-bit canvas dimensions, minus one, stored as 3 bytes each.
    const w = buf[24] | (buf[25] << 8) | (buf[26] << 16);
    const h = buf[27] | (buf[28] << 8) | (buf[29] << 16);
    return { width: w + 1, height: h + 1 };
  }
  return null;
}

export function size(relPath) {
  if (cache.has(relPath)) return cache.get(relPath);

  const path = join(ROOT, relPath);
  let out = null;
  if (existsSync(path)) {
    const buf = readFileSync(path);
    if (buf.length > 24) {
      const sig = buf.subarray(0, 4).toString('hex');
      try {
        if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') out = webp(buf);
        else if (sig === '89504e47') out = png(buf);
        else if (buf.toString('ascii', 0, 3) === 'GIF') out = gif(buf);
        else if (sig === 'ffd8ff') out = jpeg(buf);
      } catch {
        out = null;
      }
    }
  }
  cache.set(relPath, out);
  return out;
}

/** Add width/height to any <img> in `html` that is missing them. */
export function addDimensions(html) {
  return html.replace(/<img\b[^>]*>/g, (tag) => {
    if (/\bwidth=/.test(tag) && /\bheight=/.test(tag)) return tag;
    const src = /\bsrc="([^"]+)"/.exec(tag);
    if (!src) return tag;
    const dim = size(src[1]);
    if (!dim) return tag;
    if (/\bwidth=/.test(tag) || /\bheight=/.test(tag)) {
      // half-specified: fill in only what is missing so the pair stays valid
      return tag
        .replace(/(<img\b[^>]*?)\bwidth="\d+"/, `$1width="${dim.width}"`)
        .replace(/(<img\b[^>]*?)\bheight="\d+"/, `$1height="${dim.height}"`);
    }
    return tag.replace(/\s*\/?>$/, ` width="${dim.width}" height="${dim.height}">`);
  });
}
