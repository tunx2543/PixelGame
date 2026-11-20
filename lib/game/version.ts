export interface ReleaseNote {
  version: string
  date: string
  title: string
  updates: string[]
  improvements: string[]
  bugFixes: string[]
  highlights: string[]
}

export const GAME_VERSION = '1.4.0'
export const GAME_BUILD_DATE = '2026-11-20'
export const GAME_RELEASE_TITLE = 'สัตว์ขี่ใหม่ 9 สายพันธุ์ • คืนคลังภาพอาวุธ & ระบบแพตช์โน้ตอัปเดต'
export const LOCAL_SEEN_VERSION_KEY = 'pixelquest_last_seen_version'

export const GAME_CHANGELOG: ReleaseNote[] = [
  {
    version: '1.4.0',
    date: '2026-11-20',
    title: 'สัตว์ขี่ใหม่ 9 สายพันธุ์ • คืนคลังภาพอาวุธ & ระบบแจ้งเตือนอัปเดต',
    updates: [
      'เพิ่มโมเดลสัตว์ขี่โปร่งใส 9 สายพันธุ์ (ม้า, สุนัข, แมว, เต่า, หมาป่าน้ำแข็ง, แพนด้า, โจโคโบะ, ช้าง, มังกรเมฆา) พร้อมท่า Idle, เดิน, วิ่ง และขึ้น-ลงสัตว์ขี่',
      'กู้คืนภาพอาวุธและไอเทมสวมใส่ครบชุดกว่า 181 ชิ้นให้แสดงผลครบในคลังและหน้าต่างอุปกรณ์',
      'เพิ่มหน้าต่าง Patch Notes แสดงอัปเดตใหม่ การปรับปรุง และรายการแก้ไขบั๊กอัตโนมัติเมื่อเข้าเกมเวอร์ชั่นใหม่',
    ],
    improvements: [
      'เพิ่มระบบตรวจสอบเวอร์ชั่นอัตโนมัติแบบเรียลไทม์ผ่าน /api/version และ Service Worker พร้อมปุ่มรีโหลดอัปเดตในคลิกเดียว',
      'เพิ่มป้ายเวอร์ชั่นบนหน้าเข้าเกม (Title Screen) และหมวดจัดการเวอร์ชั่นในหน้าต่างตั้งค่า (Settings)',
    ],
    bugFixes: [
      'แก้ไขปัญหาภาพอาวุธและไอเทมบางรายการไม่แสดงผลในช่องอุปกรณ์และคลังไอเทม',
      'แก้ไขการวางตำแหน่งผู้ขี่บนอานสัตว์ขี่ทั้ง 4 ทิศทางให้สมดุลและไม่ซ้อนทับพื้นหลัง',
    ],
    highlights: [
      'เพิ่มโมเดลสัตว์ขี่โปร่งใส 9 สายพันธุ์ พร้อมแอนิเมชันครบทุกทิศทาง',
      'กู้คืนภาพอาวุธและไอเทมสวมใส่ครบชุดกว่า 181 ชิ้น',
      'เพิ่มระบบแจ้งเตือนเวอร์ชั่นใหม่และ Patch Notes อัตโนมัติ',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-11-18',
    title: 'คลังโมเดล 2D & ปรับปรุงการจัดวางหน้าต่าง HUD',
    updates: [
      'เพิ่มหน้าคลังโมเดล 2D สำหรับพรีวิวอาชีพ มอนสเตอร์ และสัตว์ขี่ทุกทิศทาง',
      'เพิ่มโหมด Zen HUD (กด H) สำหรับซ่อน UI รอบจอชั่วคราว',
    ],
    improvements: [
      'รองรับการจัดวางหลายหน้าต่างแบบ Floating / Tabbed พร้อมจำตำแหน่งในเครื่อง',
      'ปรับปรุงการแสดงผล Quick Item Bar และ HUD ให้กระชับขึ้นบนหน้าจอมือถือ',
    ],
    bugFixes: [
      'แก้ไขหน้าต่างหลายบานซ้อนทับแถบสกิลบนหน้าจอความสูงน้อย',
    ],
    highlights: [
      'เพิ่มหน้าคลังโมเดล 2D สำหรับพรีวิวอาชีพ มอนสเตอร์ และสัตว์ขี่ทุกทิศทาง',
      'รองรับการจัดวางหลายหน้าต่างแบบ Floating / Tabbed และโหมด Zen HUD (กด H)',
      'ปรับปรุงการแสดงผล Quick Item Bar และ HUD สำหรับหน้าจอมือถือ',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-11-15',
    title: 'คลาวด์เซฟหลายสล็อต & ระบบออนไลน์เรียลไทม์',
    updates: [
      'รองรับการสร้างและซิงค์ตัวละครข้ามเครื่องสูงสุด 3 ตัวละครผ่านบัญชี Google',
      'เพิ่มระบบมอนสเตอร์แยกตามไบโอม ดันเจี้ยน หอคอยไต่ชั้น และสนามล่ามอนสเตอร์',
    ],
    improvements: [
      'รองรับการติดตั้งเป็นแอป PWA และการซิงค์สถานะผู้เล่นออนไลน์แบบเรียลไทม์',
    ],
    bugFixes: [
      'แก้ไขกรณีเซฟ Guest เดิมไม่ถูกนำเข้าสล็อตแรกหลังล็อคอินครั้งแรก',
    ],
    highlights: [
      'รองรับการสร้างและซิงค์ตัวละครข้ามเครื่องสูงสุด 3 ตัวละครผ่านบัญชี Google',
      'เพิ่มระบบมอนสเตอร์แยกตามไบโอม ดันเจี้ยน หอคอยไต่ชั้น และสนามล่ามอนสเตอร์',
      'รองรับการติดตั้งเป็นแอป PWA และการซิงค์สถานะผู้เล่นออนไลน์',
    ],
  },
]

export interface VersionPayload {
  version: string
  buildDate: string
  title: string
  latestNotes: string[]
  changelog: ReleaseNote[]
  serverTimeMs: number
}

function parseVersionParts(version: string): number[] | null {
  const cleaned = version.trim().replace(/^v/i, '').split(/[-+]/)[0]
  if (!cleaned) return null
  const segments = cleaned.split('.')
  if (segments.length === 0) return null
  const nums: number[] = []
  for (const seg of segments) {
    if (!/^\d+$/.test(seg)) return null
    nums.push(Number(seg))
  }
  return nums
}

export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const pa = parseVersionParts(a)
  const pb = parseVersionParts(b)
  if (!pa || !pb) {
    const na = a.trim().replace(/^v/i, '')
    const nb = b.trim().replace(/^v/i, '')
    if (na === nb) return 0
    return na > nb ? 1 : -1
  }
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const va = pa[i] ?? 0
    const vb = pb[i] ?? 0
    if (va > vb) return 1
    if (va < vb) return -1
  }
  return 0
}

export function hasRemoteUpdate(
  clientVersion: string,
  remoteVersion: string | null | undefined,
): boolean {
  if (!remoteVersion || typeof remoteVersion !== 'string') return false
  return compareSemver(remoteVersion, clientVersion) > 0
}

export function isVersionUnseen(
  seenVersion: string | null | undefined,
  currentVersion: string = GAME_VERSION,
): boolean {
  if (!seenVersion || !seenVersion.trim()) return true
  return compareSemver(currentVersion, seenVersion) > 0
}

export function getLatestReleaseNote(): ReleaseNote {
  return GAME_CHANGELOG[0]
}

export function getVersionPayload(): VersionPayload {
  const latest = getLatestReleaseNote()
  return {
    version: GAME_VERSION,
    buildDate: GAME_BUILD_DATE,
    title: GAME_RELEASE_TITLE,
    latestNotes: latest?.highlights ?? [],
    changelog: GAME_CHANGELOG,
    serverTimeMs: Date.now(),
  }
}
