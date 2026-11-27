import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const CLASSES = [
  { id: 'novice', cls: 'Wayfarer', back: 'wayfarer_back_1795768984757.jpg', right: 'wayfarer_right_1795769068848.jpg', rightDir: 'left', edgeOnly: false },
  { id: 'swordsman', cls: 'Vanguard', back: 'vanguard_back_1795768985799.jpg', right: 'vanguard_right_1795769069192.jpg', rightDir: 'left', edgeOnly: true },
  { id: 'mage', cls: 'Arcanist', back: 'arcanist_back_v2_1795769065686.jpg', right: 'arcanist_right_1795769069640.jpg', rightDir: 'left', edgeOnly: false },
  { id: 'archer', cls: 'Windstalker', back: 'windstalker_back_1795768986491.jpg', right: 'windstalker_right_1795769069589.jpg', rightDir: 'left', edgeOnly: false },
  { id: 'cleric', cls: 'Luminary', back: 'luminary_back_1795768986000.jpg', right: 'luminary_right_1795769071007.jpg', rightDir: 'left', edgeOnly: true },
  { id: 'merchant', cls: 'Goldweaver', back: 'goldweaver_back_1795768987452.jpg', right: null, rightDir: null, edgeOnly: false },
  { id: 'thief', cls: 'Nightveil', back: 'nightveil_back_1795768988039.jpg', right: null, rightDir: null, edgeOnly: false },
  { id: 'kensei', cls: 'Shinkage', back: 'shinkage_back_1795768988581.jpg', right: null, rightDir: null, edgeOnly: true },
  { id: 'iron_fist', cls: 'Titanfist', back: 'titanfist_back_1795768989940.jpg', right: 'titanfist_right_1795769071632.jpg', rightDir: 'left', edgeOnly: false },
  { id: 'wicked_necromancer', cls: 'Grimcaller', back: 'grimcaller_back_v2_1795769066948.jpg', right: null, rightDir: null, edgeOnly: true },
  { id: 'the_king', cls: 'HighSovereign', back: 'high_sovereign_back_1795768991435.jpg', right: 'high_sovereign_right_1795769106877.jpg', rightDir: 'right', edgeOnly: true },
  { id: 'sinister', cls: 'Dreadfang', back: 'dreadfang_back_1795768991208.jpg', right: null, rightDir: null, edgeOnly: false },
  { id: 'templar', cls: 'AegisKnight', back: 'aegis_knight_back_1795769047007.jpg', right: null, rightDir: null, edgeOnly: true },
  { id: 'nekobaku', cls: 'Pawchemist', back: 'pawchemist_back_1795769047119.jpg', right: null, rightDir: null, edgeOnly: true },
  { id: 'mamushi', cls: 'Venomblade', back: 'venomblade_back_v2_1795769067245.jpg', right: null, rightDir: null, edgeOnly: false },
]

function sampleBgColor(data, w, h) {
  let rs = 0, gs = 0, bs = 0, cnt = 0
  const pts = [
    [6, 6], [w - 7, 6], [6, h - 7], [w - 7, h - 7],
    [20, 6], [w - 21, 6], [6, 20], [w - 7, 20],
  ]
  for (const [x, y] of pts) {
    const i = (y * w + x) * 4
    rs += data[i]; gs += data[i + 1]; bs += data[i + 2]; cnt++
  }
  return [rs / cnt, gs / cnt, bs / cnt]
}

function colorDist(r, g, b, bg) {
  const dr = r - bg[0], dg = g - bg[1], db = b - bg[2]
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

function chroma(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b)
}

function removeBackground(data, w, h, opts = {}) {
  const { edgeOnly = false, isGrimBack = false, isGoldBack = false } = opts
  const bg = sampleBgColor(data, w, h)
  const bgChroma = chroma(bg[0], bg[1], bg[2])
  const isDarkBg = (bg[0] + bg[1] + bg[2]) / 3 < 110
  const tol = isDarkBg ? 40 : 34
  const bgMask = new Uint8Array(w * h)
  const visited = new Uint8Array(w * h)

  const queue = new Int32Array(w * h)
  let qHead = 0, qTail = 0
  const pushEdge = (x, y) => {
    const idx = y * w + x
    if (visited[idx]) return
    const p = idx * 4
    if (colorDist(data[p], data[p + 1], data[p + 2], bg) < tol * 1.15) {
      visited[idx] = 1
      bgMask[idx] = 1
      queue[qTail++] = idx
    }
  }
  for (let x = 0; x < w; x++) { pushEdge(x, 0); pushEdge(x, h - 1) }
  for (let y = 0; y < h; y++) { pushEdge(0, y); pushEdge(w - 1, y) }

  while (qHead < qTail) {
    const idx = queue[qHead++]
    const x = idx % w
    const y = (idx - x) / w
    const nbs = [
      x > 0 ? idx - 1 : -1,
      x + 1 < w ? idx + 1 : -1,
      y > 0 ? idx - w : -1,
      y + 1 < h ? idx + w : -1,
    ]
    for (const ni of nbs) {
      if (ni < 0 || visited[ni]) continue
      const p = ni * 4
      const r = data[p], g = data[p + 1], b = data[p + 2]
      const d = colorDist(r, g, b, bg)
      const c = chroma(r, g, b)
      if (d < tol && c < Math.max(26, bgChroma + 18)) {
        visited[ni] = 1
        bgMask[ni] = 1
        queue[qTail++] = ni
      }
    }
  }

  // Interior enclosed holes (arms/bows/cart/cape loops)
  if (!edgeOnly) {
    const holeVisited = new Uint8Array(w * h)
    for (let y = 120; y < h - 50; y++) {
      for (let x = 40; x < w - 40; x++) {
        const start = y * w + x
        if (bgMask[start] || holeVisited[start]) continue
        const p0 = start * 4
        const d0 = colorDist(data[p0], data[p0 + 1], data[p0 + 2], bg)
        const c0 = chroma(data[p0], data[p0 + 1], data[p0 + 2])
        if (d0 >= 22 || c0 > bgChroma + 12) continue

        const comp = []
        const q = [start]
        holeVisited[start] = 1
        let touchesBorder = false
        let sumD = 0
        for (let k = 0; k < q.length; k++) {
          const idx = q[k]
          comp.push(idx)
          const cx = idx % w, cy = (idx - cx) / w
          if (cx <= 2 || cx >= w - 3 || cy <= 2 || cy >= h - 3) touchesBorder = true
          if (comp.length > 25000) break
          const p = idx * 4
          sumD += colorDist(data[p], data[p + 1], data[p + 2], bg)
          const nbs = [idx - 1, idx + 1, idx - w, idx + w]
          for (const ni of nbs) {
            if (ni < 0 || ni >= w * h || bgMask[ni] || holeVisited[ni]) continue
            const np = ni * 4
            if (colorDist(data[np], data[np + 1], data[np + 2], bg) < 26 && chroma(data[np], data[np + 1], data[np + 2]) < bgChroma + 16) {
              holeVisited[ni] = 1
              q.push(ni)
            }
          }
        }
        if (!touchesBorder && comp.length >= 24 && comp.length < 22000 && sumD / comp.length < 18) {
          for (const idx of comp) bgMask[idx] = 1
        }
      }
    }
  }

  if (isGoldBack) {
    for (let y = 780; y < 1120; y++) {
      for (let x = 80; x < 380; x++) {
        const idx = y * w + x
        if (bgMask[idx]) continue
        const p = idx * 4
        if (colorDist(data[p], data[p + 1], data[p + 2], bg) < 32 && chroma(data[p], data[p + 1], data[p + 2]) < 20) {
          bgMask[idx] = 1
        }
      }
    }
  }

  const alpha = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    alpha[i] = bgMask[i] ? 0 : 255
  }

  const alpha2 = new Uint8Array(alpha)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x
      if (alpha[idx] === 0) continue
      let bgCount = 0
      if (alpha[idx - 1] === 0) bgCount++
      if (alpha[idx + 1] === 0) bgCount++
      if (alpha[idx - w] === 0) bgCount++
      if (alpha[idx + w] === 0) bgCount++
      if (bgCount > 0) {
        const p = idx * 4
        const d = colorDist(data[p], data[p + 1], data[p + 2], bg)
        if (d < tol * 1.45) {
          const factor = Math.max(0.25, Math.min(1, (d - tol * 0.45) / tol))
          alpha2[idx] = Math.round(255 * factor)
        }
      }
    }
  }

  for (let i = 0; i < w * h; i++) {
    data[i * 4 + 3] = alpha2[i]
  }

  if (isGrimBack) {
    // Erase stray silhouette cat protruding top-left of neck/book: x in [215..385], y in [210..395]
    for (let y = 210; y <= 405; y++) {
      for (let x = 215; x <= 385; x++) {
        if (x > 332 && y < 292) continue
        if (x < 308 && y > 350) continue
        if (x > 346 && y > 356) continue
        const p = (y * w + x) * 4
        if (data[p + 3] === 0) continue
        const r = data[p], g = data[p + 1], b = data[p + 2]
        const lum = 0.299 * r + 0.587 * g + 0.114 * b
        const purpleTint = b - g
        if (lum < 138 || purpleTint > 14) {
          data[p + 3] = 0
        }
      }
    }
    // Also clean lavender pocket between right-hand arm and staff (x in [680..755], y in [540..900])
    for (let y = 520; y < 960; y++) {
      for (let x = 670; x < 765; x++) {
        const p = (y * w + x) * 4
        if (data[p + 3] === 0) continue
        const d = colorDist(data[p], data[p + 1], data[p + 2], bg)
        if (d < 24 && chroma(data[p], data[p + 1], data[p + 2]) < 16) {
          data[p + 3] = 0
        }
      }
    }
  }

  return data
}

function measureFrontBounds(data, w, h) {
  let minX = w, maxX = -1, minY = h, maxY = -1
  let coreSumX = 0, coreCnt = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3]
      if (a > 24) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
        if (y >= 180 && y <= 880 && x >= 250 && x <= 646) {
          coreSumX += x
          coreCnt++
        }
      }
    }
  }
  const coreX = coreCnt > 0 ? Math.round(coreSumX / coreCnt) : Math.round((minX + maxX) / 2)
  let footY = maxY
  for (let y = h - 1; y >= 850; y--) {
    let solid = 0
    for (let x = Math.max(0, coreX - 165); x <= Math.min(w - 1, coreX + 165); x++) {
      if (data[(y * w + x) * 4 + 3] > 180) solid++
    }
    if (solid >= 16) {
      footY = y
      break
    }
  }
  return { minX, maxX, minY, maxY, footY, coreX }
}

function buildTurnedSprite(srcData, w, h, opts = {}) {
  const { facing = 'left', profileScale = 0.90 } = opts
  const bounds = measureFrontBounds(srcData, w, h)
  const dirSign = facing === 'left' ? -1 : 1
  const out = Buffer.alloc(srcData.length)

  const bodyH = Math.max(200, bounds.footY - bounds.minY)
  const neckY = Math.round(bounds.minY + bodyH * 0.345)

  for (let y = 0; y < h; y++) {
    const relY = Math.max(0, Math.min(1, (y - bounds.minY) / bodyH))
    const legBias = relY > 0.68 ? dirSign * ((relY - 0.68) / 0.32) * 8 : 0
    const waistLean = relY < 0.6 ? dirSign * (1 - relY / 0.6) * 4 : 0
    const rowScaleX = y < neckY ? 0.95 : profileScale
    for (let x = 0; x < w; x++) {
      const dx = x - bounds.coreX - legBias - waistLean
      const isNearSide = dx * dirSign > 0
      const localScale = isNearSide ? rowScaleX * 1.04 : rowScaleX * 0.84
      const sx = bounds.coreX + dx / localScale
      const x0 = Math.floor(sx), x1 = x0 + 1
      const fx = sx - x0
      if (x0 < 0 || x1 >= w) continue
      const p0 = (y * w + x0) * 4
      const p1 = (y * w + x1) * 4
      const a0 = srcData[p0 + 3], a1 = srcData[p1 + 3]
      const a = Math.round(a0 * (1 - fx) + a1 * fx)
      if (a < 4) continue
      const di = (y * w + x) * 4
      if (a0 + a1 > 0) {
        const w0 = a0 * (1 - fx), w1 = a1 * fx, ws = w0 + w1 || 1
        out[di] = Math.round((srcData[p0] * w0 + srcData[p1] * w1) / ws)
        out[di + 1] = Math.round((srcData[p0 + 1] * w0 + srcData[p1 + 1] * w1) / ws)
        out[di + 2] = Math.round((srcData[p0 + 2] * w0 + srcData[p1 + 2] * w1) / ws)
        if (!isNearSide && Math.abs(dx) > 35 && y > neckY) {
          out[di] = Math.max(0, Math.round(out[di] * 0.93))
          out[di + 1] = Math.max(0, Math.round(out[di + 1] * 0.93))
          out[di + 2] = Math.max(0, Math.round(out[di + 2] * 0.95))
        }
      }
      out[di + 3] = a
    }
  }

  const headShift = dirSign * 16
  const faceTop = Math.round(bounds.minY + bodyH * 0.08)
  const faceBot = neckY - 4
  const temp = Buffer.from(out)
  for (let y = faceTop; y <= faceBot; y++) {
    for (let x = bounds.coreX - 115; x <= bounds.coreX + 115; x++) {
      if (x < 0 || x >= w) continue
      const dx = x - bounds.coreX
      const falloff = Math.max(0, 1 - Math.abs(dx) / 115)
      const srcX = x - headShift * falloff * falloff
      const x0 = Math.floor(srcX), x1 = x0 + 1, fx = srcX - x0
      if (x0 < 0 || x1 >= w) continue
      const di = (y * w + x) * 4
      if (out[di + 3] < 20) continue
      const p0 = (y * w + x0) * 4, p1 = (y * w + x1) * 4
      if (temp[p0 + 3] > 20 && temp[p1 + 3] > 20) {
        out[di] = Math.round(temp[p0] * (1 - fx) + temp[p1] * fx)
        out[di + 1] = Math.round(temp[p0 + 1] * (1 - fx) + temp[p1 + 1] * fx)
        out[di + 2] = Math.round(temp[p0 + 2] * (1 - fx) + temp[p1 + 2] * fx)
      }
    }
  }

  return out
}

function flipHorizontal(data, w, h) {
  const out = Buffer.alloc(data.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (y * w + (w - 1 - x)) * 4
      const di = (y * w + x) * 4
      out[di] = data[si]
      out[di + 1] = data[si + 1]
      out[di + 2] = data[si + 2]
      out[di + 3] = data[si + 3]
    }
  }
  return out
}

async function run() {
  const outRoot = '/tmp/hd_build'
  fs.mkdirSync(outRoot, { recursive: true })
  const metaSummary = {}

  for (const c of CLASSES) {
    const dir = path.join(outRoot, c.id)
    fs.mkdirSync(dir, { recursive: true })

    const frontRaw = await sharp(`Characters/${c.cls}/concept.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const w = frontRaw.info.width, h = frontRaw.info.height
    const frontData = Buffer.from(frontRaw.data)
    for (let y = 1165; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4 + 3
        if (frontData[idx] < 48) frontData[idx] = 0
      }
    }
    await sharp(frontData, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(dir, 'front.png'))

    const backRaw = await sharp(`src/assets/images/${c.back}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const backData = removeBackground(Buffer.from(backRaw.data), w, h, {
      edgeOnly: c.edgeOnly,
      isGrimBack: c.id === 'wicked_necromancer',
      isGoldBack: c.id === 'merchant',
    })
    await sharp(backData, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(dir, 'back.png'))

    let leftData, rightData
    if (c.id === 'the_king' && c.right) {
      const rightRaw = await sharp(`src/assets/images/${c.right}`).ensureAlpha().raw().toBuffer()
      rightData = removeBackground(Buffer.from(rightRaw), w, h, { edgeOnly: true })
      leftData = flipHorizontal(rightData, w, h)
    } else if (c.right) {
      // Full-body side-turned asset facing LEFT -> leftData, mirrored -> rightData!
      const sideRaw = await sharp(`src/assets/images/${c.right}`).ensureAlpha().raw().toBuffer()
      leftData = removeBackground(Buffer.from(sideRaw), w, h, { edgeOnly: c.edgeOnly })
      rightData = flipHorizontal(leftData, w, h)
    } else {
      leftData = buildTurnedSprite(frontData, w, h, { facing: 'left', profileScale: 0.90 })
      rightData = flipHorizontal(leftData, w, h)
    }

    await sharp(leftData, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(dir, 'left.png'))
    await sharp(rightData, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(dir, 'right.png'))

    metaSummary[c.id] = {
      front: measureFrontBounds(frontData, w, h),
      back: measureFrontBounds(backData, w, h),
      left: measureFrontBounds(leftData, w, h),
      right: measureFrontBounds(rightData, w, h),
    }
    console.log(`Prepared ${c.id.padEnd(20)} front footY=${metaSummary[c.id].front.footY} back footY=${metaSummary[c.id].back.footY} left footY=${metaSummary[c.id].left.footY}`)
  }

  fs.writeFileSync(path.join(outRoot, 'bounds.json'), JSON.stringify(metaSummary, null, 2))
}

run().catch((e) => { console.error(e); process.exit(1) })
