import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import manifest from '../app/manifest'

const ROOT = path.resolve(import.meta.dirname, '..')
const PUBLIC_DIR = path.join(ROOT, 'public')

function readPngDimensions(filePath: string): { width: number; height: number } {
  const buf = fs.readFileSync(filePath)
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${filePath} must be a valid PNG`)
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  }
}

test('PWA manifest satisfies installability and Pixel Quest spec', () => {
  const data = manifest()

  assert.equal(data.id, '/')
  assert.equal(data.start_url, '/')
  assert.equal(data.scope, '/')
  assert.equal(data.display, 'standalone')
  assert.ok(data.name && data.name.includes('Pixel Quest'))
  assert.ok(data.short_name && data.short_name.length <= 12, 'short_name must stay <= 12 chars')
  assert.equal(data.theme_color, '#0e0f1a')
  assert.equal(data.background_color, '#0e0f1a')

  const icons = data.icons ?? []
  assert.ok(icons.length >= 3)

  for (const icon of icons) {
    assert.notEqual(
      icon.purpose,
      'any maskable',
      'never combine any and maskable in a single icon entry',
    )
    const rel = icon.src.startsWith('/') ? icon.src.slice(1) : icon.src
    const filePath = path.join(PUBLIC_DIR, rel)
    assert.ok(fs.existsSync(filePath), `Missing manifest icon file: ${filePath}`)
  }

  const any192 = icons.find((i) => i.sizes === '192x192' && i.purpose === 'any')
  const any512 = icons.find((i) => i.sizes === '512x512' && i.purpose === 'any')
  const maskable512 = icons.find((i) => i.sizes === '512x512' && i.purpose === 'maskable')
  assert.ok(any192, 'manifest must provide a 192x192 purpose=any PNG')
  assert.ok(any512, 'manifest must provide a 512x512 purpose=any PNG')
  assert.ok(maskable512, 'manifest must provide a 512x512 purpose=maskable PNG')
})

test('All PWA icons and service worker exist with exact dimensions', () => {
  assert.deepEqual(readPngDimensions(path.join(PUBLIC_DIR, 'pwa-192x192.png')), {
    width: 192,
    height: 192,
  })
  assert.deepEqual(readPngDimensions(path.join(PUBLIC_DIR, 'pwa-512x512.png')), {
    width: 512,
    height: 512,
  })
  assert.deepEqual(readPngDimensions(path.join(PUBLIC_DIR, 'pwa-maskable-512x512.png')), {
    width: 512,
    height: 512,
  })
  assert.deepEqual(readPngDimensions(path.join(PUBLIC_DIR, 'apple-icon.png')), {
    width: 180,
    height: 180,
  })
  assert.deepEqual(readPngDimensions(path.join(PUBLIC_DIR, 'icon-light-32x32.png')), {
    width: 32,
    height: 32,
  })
  assert.deepEqual(readPngDimensions(path.join(PUBLIC_DIR, 'icon-dark-32x32.png')), {
    width: 32,
    height: 32,
  })

  const svg = fs.readFileSync(path.join(PUBLIC_DIR, 'icon.svg'), 'utf8')
  assert.ok(svg.includes('<svg') && !svg.includes('v0'), 'icon.svg must be Pixel Quest SVG')

  const sw = fs.readFileSync(path.join(PUBLIC_DIR, 'sw.js'), 'utf8')
  assert.ok(sw.includes("addEventListener('install'"))
  assert.ok(sw.includes("addEventListener('activate'"))
  assert.ok(sw.includes("addEventListener('fetch'"))
  assert.ok(sw.includes('/api/') && sw.includes('/auth/'))
})
