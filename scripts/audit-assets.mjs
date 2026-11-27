#!/usr/bin/env node
/**
 * Pixel Quest asset audit.
 * - Finds byte-identical image/model files by SHA-256.
 * - Finds same-name variants across asset/model folders.
 * - Ranks variants by the latest Git commit touching each file.
 * - Does not delete files or rewrite manifests automatically.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const ROOT = process.cwd()
const ROOTS = ['public/assets', 'public/models', 'models', 'assets']
const EXT = new Set(['.png','.jpg','.jpeg','.webp','.gif','.avif','.svg','.glb','.gltf','.fbx','.obj','.mtl','.blend','.vrm'])
const SKIP_STEMS = new Set(['0','1','2','3','4','5','6','7','8','9','sheet','sprite','thumbnail','preview','icon'])
const files = []
function walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(full)
    else if (ent.isFile() && EXT.has(path.extname(ent.name).toLowerCase())) files.push(full)
  }
}
for (const dir of ROOTS) walk(path.join(ROOT, dir))
const rel = p => path.relative(ROOT, p).split(path.sep).join('/')
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const hashGroups = new Map()
const nameGroups = new Map()
for (const file of files) {
  const digest = sha(file)
  if (!hashGroups.has(digest)) hashGroups.set(digest, [])
  hashGroups.get(digest).push(file)
  const ext = path.extname(file).toLowerCase()
  const stem = path.basename(file, path.extname(file)).toLowerCase().replace(/(?:[_-](?:copy|final|new|latest|v?\d+))+$/i, '')
  if (!SKIP_STEMS.has(stem)) {
    const key = stem + ext
    if (!nameGroups.has(key)) nameGroups.set(key, [])
    nameGroups.get(key).push(file)
  }
}
function gitTime(file) {
  try {
    return Number(execFileSync('git', ['log','-1','--format=%ct','--',rel(file)], { encoding:'utf8', stdio:['ignore','pipe','ignore'] }).trim()) || 0
  } catch { return 0 }
}
const identical = [...hashGroups.values()].filter(g => g.length > 1)
const variants = [...nameGroups.entries()].filter(([,g]) => g.length > 1 && new Set(g.map(sha)).size > 1)
const reports = variants.map(([key, group]) => {
  const ranked = group.map(file => ({ file, updated: gitTime(file) })).sort((a,b) => b.updated-a.updated || rel(b.file).localeCompare(rel(a.file)))
  return { key, latest: rel(ranked[0].file), candidates: ranked.map(x => ({ path: rel(x.file), lastCommit: x.updated ? new Date(x.updated*1000).toISOString() : 'unknown' })) }
})
console.log('PIXEL QUEST ASSET AUDIT')
console.log(`Scanned ${files.length} image/model files across: ${ROOTS.filter(d => fs.existsSync(path.join(ROOT,d))).join(', ')}`)
console.log(`Byte-identical groups: ${identical.length}`)
for (const group of identical) console.log('DUPLICATE:', group.map(rel).join('  ==  '))
console.log(`Same-name variant groups: ${reports.length}`)
for (const item of reports) {
  console.log(`\nLATEST [${item.key}]: ${item.latest}`)
  for (const c of item.candidates) console.log(`  - ${c.path} | updated: ${c.lastCommit}`)
}
if (!files.length) console.log('No image/model files found in configured roots.')
console.log('\nPolicy: latest is a recommendation based on Git history; no files or references were changed.')
