/**
 * Generates the full PWA icon + iOS splash screen set as PNGs without any
 * native dependencies: pixels are drawn into an RGBA buffer and encoded with
 * zlib (built into Node). Design: near-black rounded tile with a neon
 * blue→pink radial orb and a white lightning bolt.
 *
 * Run: node scripts/generate-icons.mjs   (also runs automatically via `npm run build`)
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const iconsDir = join(root, 'public', 'icons')
const splashDir = join(root, 'public', 'splash')
mkdirSync(iconsDir, { recursive: true })
mkdirSync(splashDir, { recursive: true })

// ---------- minimal PNG encoder ----------
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})
function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function encodePng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------- drawing helpers ----------
const BG = [5, 5, 8]
const BLUE = [0, 212, 255]
const PINK = [255, 45, 149]

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

/** Signed test: is point inside the lightning-bolt polygon (unit space 0..1)? */
const BOLT = [
  [0.58, 0.1],
  [0.3, 0.54],
  [0.47, 0.54],
  [0.4, 0.9],
  [0.7, 0.44],
  [0.52, 0.44],
]
function inBolt(x, y) {
  let inside = false
  for (let i = 0, j = BOLT.length - 1; i < BOLT.length; j = i++) {
    const [xi, yi] = BOLT[i]
    const [xj, yj] = BOLT[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/**
 * Draw the app tile into an RGBA buffer.
 * `pad` — fraction of the size kept as safe margin (maskable icons need ~0.1+).
 * `rounded` — corner radius fraction (0 for full-bleed maskable / splash art).
 */
function drawTile(size, { pad = 0.08, rounded = 0.22 } = {}) {
  const buf = Buffer.alloc(size * size * 4)
  const r = rounded * size
  const cx = size / 2
  const cy = size / 2
  const orbR = size * (0.5 - pad)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      // rounded-rect alpha mask
      let alpha = 255
      if (rounded > 0) {
        const dx = Math.max(r - x, x - (size - 1 - r), 0)
        const dy = Math.max(r - y, y - (size - 1 - r), 0)
        const d = Math.hypot(dx, dy)
        if (d > r) alpha = Math.max(0, 255 - (d - r) * 3)
      }
      const dist = Math.hypot(x - cx, y - cy) / orbR
      // background with a faint vertical sheen
      let col = mix(BG, [14, 14, 24], y / size)
      if (dist < 1) {
        // neon orb: blue core → pink rim, dark center for contrast
        const g = mix(BLUE, PINK, Math.min(1, dist * 1.15))
        const strength = Math.pow(1 - dist, 1.6) * 0.9 + 0.18
        col = mix(col, g, Math.min(1, strength))
      }
      const u = (x - cx) / (orbR * 1.35) + 0.5
      const v = (y - cy) / (orbR * 1.35) + 0.5
      if (inBolt(u, v)) col = [245, 250, 255]
      buf[i] = col[0]
      buf[i + 1] = col[1]
      buf[i + 2] = col[2]
      buf[i + 3] = alpha
    }
  }
  return buf
}

function drawSplash(w, h) {
  const buf = Buffer.alloc(w * h * 4)
  const cx = w / 2
  const cy = h / 2
  const orbR = Math.min(w, h) * 0.28
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      let col = mix(BG, [12, 12, 20], y / h)
      const dist = Math.hypot(x - cx, y - cy) / orbR
      if (dist < 1) {
        const g = mix(BLUE, PINK, Math.min(1, dist * 1.15))
        const strength = Math.pow(1 - dist, 1.6) * 0.9 + 0.18
        col = mix(col, g, Math.min(1, strength))
      }
      const u = (x - cx) / (orbR * 1.35) + 0.5
      const v = (y - cy) / (orbR * 1.35) + 0.5
      if (inBolt(u, v)) col = [245, 250, 255]
      buf[i] = col[0]
      buf[i + 1] = col[1]
      buf[i + 2] = col[2]
      buf[i + 3] = 255
    }
  }
  return buf
}

function writeIfMissing(path, make) {
  if (existsSync(path)) return false
  writeFileSync(path, make())
  return true
}

let generated = 0
const icons = [
  ['icon-192.png', 192, { pad: 0.06, rounded: 0.22 }],
  ['icon-512.png', 512, { pad: 0.06, rounded: 0.22 }],
  ['icon-maskable-192.png', 192, { pad: 0.14, rounded: 0 }],
  ['icon-maskable-512.png', 512, { pad: 0.14, rounded: 0 }],
  ['apple-touch-icon.png', 180, { pad: 0.06, rounded: 0 }],
]
for (const [name, size, opts] of icons) {
  if (writeIfMissing(join(iconsDir, name), () => encodePng(size, size, drawTile(size, opts))))
    generated++
}

const splashes = [
  [1290, 2796],
  [1179, 2556],
  [1170, 2532],
  [1125, 2436],
  [828, 1792],
  [750, 1334],
]
for (const [w, h] of splashes) {
  if (writeIfMissing(join(splashDir, `splash-${w}x${h}.png`), () => encodePng(w, h, drawSplash(w, h))))
    generated++
}

console.log(generated ? `Generated ${generated} image(s).` : 'All icons/splash screens up to date.')
