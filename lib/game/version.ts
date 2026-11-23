export interface ReleaseNote {
  version: string
  date: string
  title: string
  updates: string[]
  improvements: string[]
  bugFixes: string[]
  highlights: string[]
}

export const GAME_VERSION = '1.4.2'
export const GAME_BUILD_DATE = '2026-11-22'
export const GAME_RELEASE_TITLE = 'คูณ EXP & ดรอปทั้งเซิร์ฟเวอร์ • ระบบไอเทมโค้ด & Patch Notes เรียลไทม์'
export const LOCAL_SEEN_VERSION_KEY = 'pixelquest_last_seen_version'

export const GAME_CHANGELOG: ReleaseNote[] = [
  {
    version: '1.4.2',
    date: '2026-11-22',
    title: 'คูณ EXP & ดรอปทั้งเซิร์ฟเวอร์ • ระบบไอเทมโค้ด & Patch Notes เรียลไทม์',
    updates: [
      'เพิ่มระบบกิจกรรมคูณ EXP และคูณโอกาสดรอปไอเทมทั้งเซิร์ฟเวอร์ (Server EXP & Drop Multiplier) ซิงค์ให้ผู้เล่นทุกคนทุกแมพรวมถึงดันเจี้ยนและสนามล่า พร้อมไอคอนแสดงเวลาคงเหลือบน HUD',
      'เพิ่มเมนู "ไอเทมโค้ด" ในหน้าเมนูหลัก และเปิดใช้งาน API แลกไอเทมโค้ดฝั่งเซิร์ฟเวอร์อย่างสมบูรณ์ รองรับทั้งผู้เล่นบัญชี Google และ Guest พร้อมป้องกันการรับซ้ำและตรวจความจุกระเป๋า',
      'เพิ่มระบบเผยแพร่และอัปเดต Patch Notes แบบเรียลไทม์ผ่านเซิร์ฟเวอร์ พร้อมปุ่มทางลัดเปิดดู Patch Notes ได้ทันทีจากหน้าเมนูหลักในเกม',
    ],
    improvements: [
      'อัปเกรดเครื่องมือสร้างไอเทมโค้ดของ GM ให้ค้นหาไอเทมได้ครบทุกชิ้นในเกม (ไม่ถูกตัดรายการ) พร้อมกำหนดค่าตีบวก +0 ถึง +15 คัดลอกโค้ด และลบโค้ดได้',
      'ปรับหน้าต่าง Patch Notes ให้แสดงผลเหนือเมนูและหน้าต่างย่อยทุกชั้น พร้อมดึงบันทึกเวอร์ชั่นล่าสุดอัตโนมัติทุกครั้งที่เปิดอ่าน',
    ],
    bugFixes: [
      'แก้ไขบั๊กสิทธิ์ Firestore (REDEEM_CODE Audit Log) และปัญหาหน้าแลกโค้ดล็อคอินซ้ำที่ทำให้การกดแลกไอเทมโค้ดไม่ทำงาน',
      'แก้ไขให้ประกาศข่าวเซิร์ฟเวอร์และตัวคูณ EXP/Drop ซิงค์ถึงผู้เล่นทั่วไป (Guest) ผ่าน /api/world/events ได้ทันที',
    ],
    highlights: [
      'กิจกรรมคูณ EXP และคูณดรอปทั้งเซิร์ฟเวอร์ ซิงค์อัปเดตแบบเรียลไทม์พร้อมตัวนับบน HUD',
      'ระบบไอเทมโค้ด (Redeem Code) ใช้งานได้จริงจากทั้งหน้าเมนูหลักและร้านค้าโซล',
      'ระบบ Patch Notes เปิดอ่านได้จากเมนูหลักในเกม และอัปเดตประกาศแพตช์ใหม่ได้ทันที',
    ],
  },
  {
    version: '1.4.1',
    date: '2026-11-20',
    title: 'หลอด HP/MP ใต้ตัวละคร • ตรวจเช็คไอเทมทุกชิ้น & ตั้งค่ากราฟิกลดอาการหน่วง',
    updates: [
      'ย้ายหลอด HP และ MP ของตัวละครมาแสดงด้านล่างใต้เท้า/ใต้สัตว์ขี่ เพื่อให้มองเห็นง่ายและไม่บังชื่อหรือเอฟเฟกต์บนหัว',
      'เพิ่มหมวดตั้งค่า กราฟิก & ลดอาการหน่วง ในหน้าต่างตั้งค่า (เลือกพรีเซ็ต สูง / กลาง / ประหยัดสเปก, ล็อก FPS, สเกลความละเอียด, ลดอนุภาค และปิดเงา/แสงฟุ้ง)',
      'เพิ่มหน้าต่างกรอกชื่อตัวละครใหม่ในเกมเมื่อกดใช้ บัตรเปลี่ยนชื่อ (Name Change Ticket) จากทั้งกระเป๋าและหน้าตัวละคร',
    ],
    improvements: [
      'ตรวจสอบและแก้ไขไอเทมใช้งานได้ครบทั้ง 23 ชิ้น ให้กดใช้งานได้จริงทั้งในหน้าคลังเต็มจอ กระเป๋า หน้าต่างตัวละคร และทักษะชีวิต พร้อมข้อความแจ้งผลชัดเจน',
      'อาหารบัฟ (Food Buffs) ฟื้นฟู HP/MP ตามค่าบนไอเทมควบคู่กับบัฟสเตตัส และป้องกันการกดใช้ยาฟื้นฟูทิ้งเมื่อ HP/MP เต็มอยู่แล้ว',
      'เพิ่มปุ่มทางลัดบนการ์ดวัตถุดิบในกระเป๋า (ไปตีบวก / เลี้ยงคู่หู / ทำอาหาร / คราฟต์) เพื่อลดความสับสนในการใช้งาน',
    ],
    bugFixes: [
      'แก้ไขบั๊กไอเทมหลายชนิด เช่น บัตรเปลี่ยนชื่อ, คัมภีร์ขยายกระเป๋า/คลัง, การ์ด VIP, น้ำทิพย์สัตว์เลี้ยง และคัมภีร์คูณ EXP ที่เคยกดใช้ในหน้าคลังเต็มจอแล้วไม่ทำงานหรือไม่มีแจ้งเตือน',
      'แก้ไขตัวกรอง "บัตร/คัมภีร์" ในกระเป๋าให้แสดงคัมภีร์ขยายกระเป๋าและผลึก VIP ครบถ้วน',
    ],
    highlights: [
      'หลอด HP / MP แสดงใต้เท้าตัวละครชัดเจน ไม่บังศีรษะและสัตว์ขี่',
      'ไอเทมทุกชิ้นใช้งานได้จริง ครบทุกหน้าจอ พร้อมหน้าต่างเปลี่ยนชื่อและแจ้งเตือนผล',
      'ตั้งค่ากราฟิกลดอาการหน่วงได้ละเอียด (พรีเซ็ต / ล็อก FPS / สเกลความละเอียด / ปิดเงา)',
    ],
  },
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
  customVersions?: string[]
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

function cleanBulletList(raw: unknown, maxItems = 12): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => (typeof entry === 'string' ? entry.trim().slice(0, 280) : ''))
    .filter(Boolean)
    .slice(0, maxItems)
}

export function sanitizeReleaseNote(raw: unknown): ReleaseNote | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const versionRaw = typeof obj.version === 'string' ? obj.version.trim().replace(/^v/i, '') : ''
  if (!/^\d+\.\d+\.\d+$/.test(versionRaw)) return null

  const title = typeof obj.title === 'string' ? obj.title.trim().slice(0, 140) : ''
  if (!title) return null

  const dateRaw = typeof obj.date === 'string' ? obj.date.trim() : ''
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : new Date().toISOString().slice(0, 10)
  const updates = cleanBulletList(obj.updates)
  const improvements = cleanBulletList(obj.improvements)
  const bugFixes = cleanBulletList(obj.bugFixes)
  const rawHighlights = cleanBulletList(obj.highlights, 6)
  const highlights =
    rawHighlights.length > 0
      ? rawHighlights
      : [...updates, ...improvements, ...bugFixes].slice(0, 3)

  if (updates.length === 0 && improvements.length === 0 && bugFixes.length === 0 && highlights.length === 0) {
    return null
  }

  return {
    version: versionRaw,
    date,
    title,
    updates,
    improvements,
    bugFixes,
    highlights,
  }
}

export function mergeReleaseNotes(
  customNotes: ReleaseNote[],
  baseNotes: ReleaseNote[] = GAME_CHANGELOG,
): ReleaseNote[] {
  const byVersion = new Map<string, ReleaseNote>()
  for (const entry of baseNotes) {
    byVersion.set(entry.version, entry)
  }
  for (const custom of customNotes) {
    const clean = sanitizeReleaseNote(custom)
    if (clean) {
      byVersion.set(clean.version, clean)
    }
  }
  return [...byVersion.values()].sort((a, b) => compareSemver(b.version, a.version))
}

export function buildVersionPayload(
  customNotes: ReleaseNote[] = [],
  nowMs = Date.now(),
): VersionPayload {
  const merged = mergeReleaseNotes(customNotes, GAME_CHANGELOG)
  const latest = merged[0] ?? GAME_CHANGELOG[0]
  return {
    version: latest?.version ?? GAME_VERSION,
    buildDate: latest?.date ?? GAME_BUILD_DATE,
    title: latest?.title ?? GAME_RELEASE_TITLE,
    latestNotes: latest?.highlights ?? [],
    changelog: merged,
    customVersions: customNotes.map((entry) => entry.version),
    serverTimeMs: nowMs,
  }
}

export function getLatestReleaseNote(): ReleaseNote {
  return GAME_CHANGELOG[0]
}

export function getVersionPayload(): VersionPayload {
  return buildVersionPayload([], Date.now())
}
