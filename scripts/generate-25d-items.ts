import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { ITEMS } from '../lib/game/data'
import { buildItem25dVisualSpec } from '../lib/game/item-25d-archetypes'
import { rasterizeItem25dRgba64 } from '../lib/game/item-25d-raster'
import { resolveItemImagePath } from '../lib/game/items'

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.allocUnsafe(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcInput = Buffer.concat([typeBuf, data])
  const crcBuf = Buffer.allocUnsafe(4)
  crcBuf.writeUInt32BE(crc32(crcInput), 0)
  return Buffer.concat([lenBuf, crcInput, crcBuf])
}

function encodeRgbaPng(width: number, height: number, rgba: Uint8Array): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  const stride = width * 4
  const raw = Buffer.allocUnsafe(height * (stride + 1))
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1)
    raw[rowStart] = 0 // filter type 0 (None)
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), rowStart + 1)
  }
  const compressed = zlib.deflateSync(raw, { level: 6 })

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function main() {
  const prefixArg = process.argv.find((a) => a.startsWith('--prefix='))?.slice('--prefix='.length) ?? ''
  const publicDir = path.resolve(process.cwd(), 'public')
  const seenPaths = new Set<string>()
  let count = 0

  for (const def of Object.values(ITEMS)) {
    const relPath = resolveItemImagePath(def)
    if (prefixArg && !relPath.includes(prefixArg)) continue
    if (seenPaths.has(relPath)) continue
    seenPaths.add(relPath)

    const diskPath = path.join(publicDir, relPath.replace(/^\//, ''))
    fs.mkdirSync(path.dirname(diskPath), { recursive: true })

    const spec = buildItem25dVisualSpec(def)
    const rgba = rasterizeItem25dRgba64(spec)
    const png = encodeRgbaPng(64, 64, rgba)
    fs.writeFileSync(diskPath, png)
    count++
  }

  console.log(`Generated ${count} 64x64 2.5D RGBA PNG item icons in ${path.join(publicDir, 'assets/items')}`)
}

main()
