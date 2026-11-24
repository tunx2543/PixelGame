export type FestivalEventKind = 'seasonal' | 'ingame'

export type FestivalEventId =
  | 'loy_krathong'
  | 'new_year'
  | 'lunar_new_year'
  | 'songkran'
  | 'halloween'
  | 'weekend_hunter'
  | 'guild_boss_rush'
  | 'harvest_blessing'

export type FestivalMissionMetric = 'kills' | 'bossAndTower' | 'gathers'

export interface FestivalMissionDef {
  id: string
  title: string
  description: string
  metric: FestivalMissionMetric
  target: number
  rewardTokens: number
  rewardGold: number
  rewardDiamonds: number
}

export type FestivalShopRewardKind = 'item' | 'cosmetic' | 'title' | 'currency'

export interface FestivalShopRewardDef {
  id: string
  name: string
  description: string
  kind: FestivalShopRewardKind
  costTokens: number
  limitPerCycle: number
  itemId?: string
  qty?: number
  cosmeticId?: string
  titleId?: string
  gold?: number
  diamonds?: number
}

export interface FestivalDailyGiftDef {
  gold: number
  diamonds: number
  tokens: number
}

export interface FestivalEventDef {
  id: FestivalEventId
  kind: FestivalEventKind
  name: string
  subtitle: string
  description: string
  scheduleLabel: string
  tokenName: string
  accentColor: string
  secondaryColor: string
  expBonusPct: number
  dropBonusPct: number
  goldBonusPct: number
  dailyGift: FestivalDailyGiftDef
  missions: FestivalMissionDef[]
  shopRewards: FestivalShopRewardDef[]
}

export interface FestivalOverrideState {
  active: boolean
  eventId: FestivalEventId
  cycleKey: string
  customTitle?: string
  expBonusPct?: number
  dropBonusPct?: number
  goldBonusPct?: number
  startedAtMs: number
  expiresAtMs: number | null
  triggeredByName: string
}

export interface FestivalCycleProgress {
  kills: number
  bossKills: number
  gathers: number
  towerClears: number
}

export interface FestivalPlayerState {
  tokens: Record<string, number>
  cycleProgress: Record<string, FestivalCycleProgress>
  claimedMissionKeys: string[]
  claimedDailyGiftKeys: string[]
  shopPurchases: Record<string, number>
}

export interface ResolvedActiveFestival {
  def: FestivalEventDef
  cycleKey: string
  source: 'override' | 'seasonal' | 'ingame'
  isGmOverride: boolean
  title: string
  startedAtMs: number
  endsAtMs: number | null
  expBonusPct: number
  dropBonusPct: number
  goldBonusPct: number
  triggeredByName?: string
}

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export interface BangkokDateParts {
  year: number
  month: number // 1-12
  day: number // 1-31
  dayOfWeek: number // 0 Sun .. 6 Sat
  hour: number
  minute: number
  isoDate: string
  isoWeekKey: string
}

export function getBangkokDateParts(nowMs = Date.now()): BangkokDateParts {
  const shifted = new Date(nowMs + BANGKOK_OFFSET_MS)
  const year = shifted.getUTCFullYear()
  const month = shifted.getUTCMonth() + 1
  const day = shifted.getUTCDate()
  const dayOfWeek = shifted.getUTCDay()
  const hour = shifted.getUTCHours()
  const minute = shifted.getUTCMinutes()
  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  // ISO week calculation on shifted UTC date
  const temp = new Date(Date.UTC(year, month - 1, day))
  const isoDay = temp.getUTCDay() || 7
  temp.setUTCDate(temp.getUTCDate() + 4 - isoDay)
  const weekYear = temp.getUTCFullYear()
  const yearStart = new Date(Date.UTC(weekYear, 0, 1))
  const weekNum = Math.ceil((((temp.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7)
  const isoWeekKey = `${weekYear}-W${String(weekNum).padStart(2, '0')}`

  return {
    year,
    month,
    day,
    dayOfWeek,
    hour,
    minute,
    isoDate,
    isoWeekKey,
  }
}

function bangkokMidnightUtcMs(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day, 0, 0, 0, 0) - BANGKOK_OFFSET_MS
}

function bangkokEndOfDayUtcMs(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day, 23, 59, 59, 999) - BANGKOK_OFFSET_MS
}

export const FESTIVAL_EVENTS: FestivalEventDef[] = [
  {
    id: 'loy_krathong',
    kind: 'seasonal',
    name: 'เทศกาลลอยกระทงแสงจันทร์',
    subtitle: 'Loy Krathong Light Festival',
    description:
      'คืนพระจันทร์เต็มดวงริมสายน้ำแห่ง Pixel Quest ออกล่ามอนสเตอร์และปราบบอสเพื่อสะสมกระทงแสงจันทร์ แลกรับกรอบชื่อและไอเทมพิเศษเฉพาะฤดูกาล',
    scheduleLabel: 'ทุกปี 10 – 30 พฤศจิกายน (เวลาไทย)',
    tokenName: 'กระทงแสงจันทร์',
    accentColor: '#fbbf24',
    secondaryColor: '#38bdf8',
    expBonusPct: 50,
    dropBonusPct: 50,
    goldBonusPct: 50,
    dailyGift: { gold: 800, diamonds: 6, tokens: 15 },
    missions: [
      {
        id: 'hunt_25',
        title: 'จุดประทีปไล่เงามืด (25 ตัว)',
        description: 'กำจัดมอนสเตอร์ชนิดใดก็ได้สะสมครบ 25 ตัวระหว่างเทศกาล',
        metric: 'kills',
        target: 25,
        rewardTokens: 18,
        rewardGold: 1200,
        rewardDiamonds: 3,
      },
      {
        id: 'hunt_80',
        title: 'พิทักษ์ลำน้ำแสงจันทร์ (80 ตัว)',
        description: 'กำจัดมอนสเตอร์สะสมครบ 80 ตัวระหว่างเทศกาล',
        metric: 'kills',
        target: 80,
        rewardTokens: 35,
        rewardGold: 3000,
        rewardDiamonds: 8,
      },
      {
        id: 'boss_2',
        title: 'ปราบบอสใต้แสงเพ็ญ (2 ครั้ง)',
        description: 'ปราบฟิลด์บอส บอสโลก หรือผ่านหอคอยท้าทายรวม 2 ครั้ง',
        metric: 'bossAndTower',
        target: 2,
        rewardTokens: 40,
        rewardGold: 2500,
        rewardDiamonds: 12,
      },
      {
        id: 'gather_5',
        title: 'เก็บดอกไม้ประดับกระทง (5 ครั้ง)',
        description: 'ตกปลา ขุดแร่ หรือเก็บสมุนไพรทักษะชีวิตครบ 5 ครั้ง',
        metric: 'gathers',
        target: 5,
        rewardTokens: 22,
        rewardGold: 1500,
        rewardDiamonds: 5,
      },
    ],
    shopRewards: [
      {
        id: 'lk_frame',
        name: 'กรอบชื่อจันทร์กระจ่างลอยกระทง',
        description: 'ปลดล็อกกรอบชื่อพิเศษเรืองแสงทองฟ้า (สวมใส่ได้ในหน้าแฟชั่น)',
        kind: 'cosmetic',
        cosmeticId: 'frame_loy_krathong',
        costTokens: 65,
        limitPerCycle: 1,
      },
      {
        id: 'lk_title',
        name: 'ฉายา: ผู้จุดประทีปจันทร์กระจ่าง',
        description: 'ปลดล็อกฉายาถาวร +45 HP, +16 ATK, +10 DEF, +2% CRIT',
        kind: 'title',
        titleId: 'loy_krathong_lantern',
        costTokens: 55,
        limitPerCycle: 1,
      },
      {
        id: 'lk_stones',
        name: 'ชุดหินตีบวกเทศกาล x8',
        description: 'หินตีบวก 8 ก้อน สำหรับเสริมพลังอาวุธและชุดเกราะ',
        kind: 'item',
        itemId: 'enhance_stone',
        qty: 8,
        costTokens: 25,
        limitPerCycle: 4,
      },
      {
        id: 'lk_scroll',
        name: 'ใบเพิ่มโอกาสตีบวกชั้นดี (+20%)',
        description: 'ใช้เพิ่มโอกาสตีบวกสำเร็จ +20% ที่ช่างตีเหล็ก',
        kind: 'item',
        itemId: 'enhance_chance_scroll_2',
        qty: 1,
        costTokens: 20,
        limitPerCycle: 3,
      },
      {
        id: 'lk_companion',
        name: 'กล่องสุ่มคู่หู Pixel Quest',
        description: 'เปิดลุ้นคู่หูผอบหรือผลึกวิวัฒนาการ x5',
        kind: 'item',
        itemId: 'companion_gacha_box',
        qty: 1,
        costTokens: 45,
        limitPerCycle: 2,
      },
      {
        id: 'lk_diamonds',
        name: 'ถุงเพชรประทีป (+15 เพชร · 3,500 G)',
        description: 'แลกกระทงแสงจันทร์เป็นเพชรและทองคำทันที',
        kind: 'currency',
        gold: 3500,
        diamonds: 15,
        costTokens: 30,
        limitPerCycle: 3,
      },
    ],
  },
  {
    id: 'new_year',
    kind: 'seasonal',
    name: 'เทศกาลเหมันต์ & ปีใหม่สากล',
    subtitle: 'Winter Starlight & New Year',
    description:
      'เฉลิมฉลองส่งท้ายปีเก่าต้อนรับปีใหม่ด้วยหิมะดาวพร่างพราว โบนัส EXP +75% และร้านค้าแลกปีกเหมันต์ระดับตำนาน',
    scheduleLabel: 'ทุกปี 20 ธันวาคม – 10 มกราคม (เวลาไทย)',
    tokenName: 'ดาวหิมะมงคล',
    accentColor: '#38bdf8',
    secondaryColor: '#f43f5e',
    expBonusPct: 75,
    dropBonusPct: 60,
    goldBonusPct: 60,
    dailyGift: { gold: 1000, diamonds: 8, tokens: 18 },
    missions: [
      {
        id: 'hunt_25',
        title: 'กวาดล้างมอนสเตอร์เหมันต์ (25 ตัว)',
        description: 'กำจัดมอนสเตอร์ชนิดใดก็ได้สะสมครบ 25 ตัว',
        metric: 'kills',
        target: 25,
        rewardTokens: 20,
        rewardGold: 1500,
        rewardDiamonds: 4,
      },
      {
        id: 'hunt_80',
        title: 'ตำนานผู้กล้าข้ามปี (80 ตัว)',
        description: 'กำจัดมอนสเตอร์สะสมครบ 80 ตัวระหว่างเทศกาล',
        metric: 'kills',
        target: 80,
        rewardTokens: 38,
        rewardGold: 3500,
        rewardDiamonds: 10,
      },
      {
        id: 'boss_2',
        title: 'พิชิตบอสแห่งเหมันต์ (2 ครั้ง)',
        description: 'ปราบบอสหรือผ่านหอคอยท้าทายรวม 2 ครั้ง',
        metric: 'bossAndTower',
        target: 2,
        rewardTokens: 42,
        rewardGold: 3000,
        rewardDiamonds: 12,
      },
      {
        id: 'gather_5',
        title: 'รวบรวมวัตถุดิบฉลองปีใหม่ (5 ครั้ง)',
        description: 'ตกปลา ขุดแร่ หรือเก็บสมุนไพรครบ 5 ครั้ง',
        metric: 'gathers',
        target: 5,
        rewardTokens: 22,
        rewardGold: 1800,
        rewardDiamonds: 5,
      },
    ],
    shopRewards: [
      {
        id: 'ny_wing',
        name: 'ปีกเหมันต์ดาวพร่างพราว',
        description: 'ปลดล็อกปีกหิมะคริสตัลสุดอลังการ (สวมใส่ในหน้าแฟชั่น)',
        kind: 'cosmetic',
        cosmeticId: 'wing_winter_star',
        costTokens: 80,
        limitPerCycle: 1,
      },
      {
        id: 'ny_title',
        name: 'ฉายา: ดาราแห่งเหมันตฤดู',
        description: 'ปลดล็อกฉายาถาวร +70 HP, +22 ATK, +16 DEF, +3% CRIT',
        kind: 'title',
        titleId: 'winter_celebrant',
        costTokens: 65,
        limitPerCycle: 1,
      },
      {
        id: 'ny_protect',
        name: 'ใบประกันความเสียหายตีบวก',
        description: 'ป้องกันระดับตีบวกลดลงเมื่อตีบวก +6 ขึ้นไปล้มเหลว',
        kind: 'item',
        itemId: 'enhance_protect_scroll_1',
        qty: 1,
        costTokens: 28,
        limitPerCycle: 3,
      },
      {
        id: 'ny_stones',
        name: 'ชุดหินตีบวกปีใหม่ x10',
        description: 'หินตีบวก 10 ก้อนสำหรับอัปเกรดอุปกรณ์',
        kind: 'item',
        itemId: 'enhance_stone',
        qty: 10,
        costTokens: 30,
        limitPerCycle: 4,
      },
      {
        id: 'ny_diamonds',
        name: 'หีบอวยพรปีใหม่ (+20 เพชร · 5,000 G)',
        description: 'รับเพชรและทองคำสำหรับเริ่มต้นปีอย่างมั่งคั่ง',
        kind: 'currency',
        gold: 5000,
        diamonds: 20,
        costTokens: 35,
        limitPerCycle: 3,
      },
    ],
  },
  {
    id: 'lunar_new_year',
    kind: 'seasonal',
    name: 'เทศกาลตรุษจีนมั่งคั่ง',
    subtitle: 'Golden Dragon Lunar New Year',
    description:
      'ซินเจียยู่อี่! สะสมอั่งเปามงคลจากมอนสเตอร์และบอส พร้อมโบนัสทอง +80% ตลอดช่วงเทศกาล',
    scheduleLabel: 'ทุกปี 22 มกราคม – 16 กุมภาพันธ์ (เวลาไทย)',
    tokenName: 'อั่งเปามงคล',
    accentColor: '#ef4444',
    secondaryColor: '#facc15',
    expBonusPct: 60,
    dropBonusPct: 45,
    goldBonusPct: 80,
    dailyGift: { gold: 1500, diamonds: 6, tokens: 16 },
    missions: [
      {
        id: 'hunt_25',
        title: 'ปราบอสูรรับอั่งเปา (25 ตัว)',
        description: 'กำจัดมอนสเตอร์สะสมครบ 25 ตัวระหว่างตรุษจีน',
        metric: 'kills',
        target: 25,
        rewardTokens: 18,
        rewardGold: 2000,
        rewardDiamonds: 3,
      },
      {
        id: 'hunt_80',
        title: 'ขบวนมังกรทองคำ (80 ตัว)',
        description: 'กำจัดมอนสเตอร์สะสมครบ 80 ตัวระหว่างเทศกาล',
        metric: 'kills',
        target: 80,
        rewardTokens: 36,
        rewardGold: 4500,
        rewardDiamonds: 8,
      },
      {
        id: 'boss_2',
        title: 'ท้าประลองจ้าวมังกร (2 ครั้ง)',
        description: 'ปราบบอสหรือผ่านหอคอยท้าทายรวม 2 ครั้ง',
        metric: 'bossAndTower',
        target: 2,
        rewardTokens: 40,
        rewardGold: 3500,
        rewardDiamonds: 12,
      },
      {
        id: 'gather_5',
        title: 'สะสมสมุนไพรอายุวัฒนะ (5 ครั้ง)',
        description: 'ตกปลา ขุดแร่ หรือเก็บสมุนไพรครบ 5 ครั้ง',
        metric: 'gathers',
        target: 5,
        rewardTokens: 20,
        rewardGold: 2000,
        rewardDiamonds: 5,
      },
    ],
    shopRewards: [
      {
        id: 'lny_wskin',
        name: 'สกินอาวุธเปลวประทีปมงคล',
        description: 'เปลี่ยนเอฟเฟกต์ฟันอาวุธเป็นประกายแดงทองมงคล',
        kind: 'cosmetic',
        cosmeticId: 'wskin_festival_crimson',
        costTokens: 65,
        limitPerCycle: 1,
      },
      {
        id: 'lny_title',
        name: 'ฉายา: วีรชนแห่งเทศกาลนิรันดร์',
        description: 'ปลดล็อกฉายาถาวร +90 HP, +28 ATK, +20 DEF, +3% CRIT',
        kind: 'title',
        titleId: 'grand_festival_hero',
        costTokens: 75,
        limitPerCycle: 1,
      },
      {
        id: 'lny_exp',
        name: 'คัมภีร์คูณค่าประสบการณ์ x2',
        description: 'คัมภีร์เพิ่ม EXP +35%, ATK/DEF +15% จำนวน 2 ม้วน',
        kind: 'item',
        itemId: 'double_exp_scroll',
        qty: 2,
        costTokens: 24,
        limitPerCycle: 3,
      },
      {
        id: 'lny_gold',
        name: 'อั่งเปาทองคำล้นฟ้า (+8,000 G · +12 เพชร)',
        description: 'แลกอั่งเปาเป็นทองคำก้อนโตและเพชรทันที',
        kind: 'currency',
        gold: 8000,
        diamonds: 12,
        costTokens: 28,
        limitPerCycle: 4,
      },
    ],
  },
  {
    id: 'songkran',
    kind: 'seasonal',
    name: 'เทศกาลมหาสงกรานต์สาดน้ำ',
    subtitle: 'Songkran Water Blessing Festival',
    description:
      'สวัสดีปีใหม่ไทย! สาดน้ำชุ่มฉ่ำทั่วแผ่นดิน Pixel Quest พร้อมโบนัส EXP/DROP/Gold +50% และปีกสายน้ำมหาสงกรานต์',
    scheduleLabel: 'ทุกปี 10 – 18 เมษายน (เวลาไทย)',
    tokenName: 'ขันน้ำเงินศักดิ์สิทธิ์',
    accentColor: '#06b6d4',
    secondaryColor: '#fde047',
    expBonusPct: 60,
    dropBonusPct: 50,
    goldBonusPct: 50,
    dailyGift: { gold: 900, diamonds: 7, tokens: 16 },
    missions: [
      {
        id: 'hunt_25',
        title: 'สาดน้ำชำระมอนสเตอร์ (25 ตัว)',
        description: 'กำจัดมอนสเตอร์สะสมครบ 25 ตัวช่วงสงกรานต์',
        metric: 'kills',
        target: 25,
        rewardTokens: 18,
        rewardGold: 1400,
        rewardDiamonds: 4,
      },
      {
        id: 'hunt_80',
        title: 'ขบวนแห่มหาสงกรานต์ (80 ตัว)',
        description: 'กำจัดมอนสเตอร์สะสมครบ 80 ตัวระหว่างเทศกาล',
        metric: 'kills',
        target: 80,
        rewardTokens: 36,
        rewardGold: 3200,
        rewardDiamonds: 9,
      },
      {
        id: 'boss_2',
        title: 'ประลองศึกวันไหล (2 ครั้ง)',
        description: 'ปราบบอสหรือผ่านหอคอยท้าทายรวม 2 ครั้ง',
        metric: 'bossAndTower',
        target: 2,
        rewardTokens: 40,
        rewardGold: 2800,
        rewardDiamonds: 12,
      },
      {
        id: 'gather_5',
        title: 'ตักน้ำศักดิ์สิทธิ์ (5 ครั้ง)',
        description: 'ตกปลา ขุดแร่ หรือเก็บสมุนไพรครบ 5 ครั้ง',
        metric: 'gathers',
        target: 5,
        rewardTokens: 22,
        rewardGold: 1600,
        rewardDiamonds: 5,
      },
    ],
    shopRewards: [
      {
        id: 'sk_wing',
        name: 'ปีกสายน้ำมหาสงกรานต์',
        description: 'ปลดล็อกปีกหยดน้ำสีฟ้าคริสตัลสุดเย็นฉ่ำ',
        kind: 'cosmetic',
        cosmeticId: 'wing_songkran',
        costTokens: 75,
        limitPerCycle: 1,
      },
      {
        id: 'sk_title',
        name: 'ฉายา: ผู้พิทักษ์สายน้ำสงกรานต์',
        description: 'ปลดล็อกฉายาถาวร +55 HP, +14 ATK, +14 DEF, +2% CRIT',
        kind: 'title',
        titleId: 'songkran_blessed',
        costTokens: 55,
        limitPerCycle: 1,
      },
      {
        id: 'sk_magnet',
        name: 'แม่เหล็กดูดของแสงดาว',
        description: 'ช่วยดูดไอเทมดรอประยะไกลอัตโนมัติในสนามรบ',
        kind: 'item',
        itemId: 'starlight_loot_magnet',
        qty: 1,
        costTokens: 32,
        limitPerCycle: 2,
      },
      {
        id: 'sk_elixir',
        name: 'น้ำยาอมฤตสวรรค์ x4',
        description: 'ฟื้นฟู HP 1,200 และ MP 400 ทันที 4 ขวด',
        kind: 'item',
        itemId: 'supreme_hp_elixir',
        qty: 4,
        costTokens: 20,
        limitPerCycle: 3,
      },
      {
        id: 'sk_diamonds',
        name: 'ชุดขันเงินรับพร (+16 เพชร · 4,000 G)',
        description: 'แลกขันน้ำเป็นเพชรและทองคำทันที',
        kind: 'currency',
        gold: 4000,
        diamonds: 16,
        costTokens: 30,
        limitPerCycle: 3,
      },
    ],
  },
  {
    id: 'halloween',
    kind: 'seasonal',
    name: 'เทศกาลรัตติกาลฮาโลวีน',
    subtitle: 'Crimson Moon Halloween',
    description:
      'ค่ำคืนพระจันทร์สีเลือด มอนสเตอร์ชุกชุมพร้อมอัตราดรอป +55% และตะเกียงฟักทองแลกของรางวัลลี้ลับ',
    scheduleLabel: 'ทุกปี 24 ตุลาคม – 3 พฤศจิกายน (เวลาไทย)',
    tokenName: 'ตะเกียงฟักทอง',
    accentColor: '#a855f7',
    secondaryColor: '#fb923c',
    expBonusPct: 65,
    dropBonusPct: 55,
    goldBonusPct: 35,
    dailyGift: { gold: 700, diamonds: 6, tokens: 15 },
    missions: [
      {
        id: 'hunt_25',
        title: 'ล่าภูตผีคืนเดือนเพ็ญ (25 ตัว)',
        description: 'กำจัดมอนสเตอร์สะสมครบ 25 ตัวระหว่างฮาโลวีน',
        metric: 'kills',
        target: 25,
        rewardTokens: 18,
        rewardGold: 1300,
        rewardDiamonds: 3,
      },
      {
        id: 'hunt_80',
        title: 'นักล่าแห่งรัตติกาล (80 ตัว)',
        description: 'กำจัดมอนสเตอร์สะสมครบ 80 ตัวระหว่างเทศกาล',
        metric: 'kills',
        target: 80,
        rewardTokens: 35,
        rewardGold: 3200,
        rewardDiamonds: 8,
      },
      {
        id: 'boss_2',
        title: 'ปราบจอมอสูรคืนปล่อยผี (2 ครั้ง)',
        description: 'ปราบบอสหรือผ่านหอคอยท้าทายรวม 2 ครั้ง',
        metric: 'bossAndTower',
        target: 2,
        rewardTokens: 40,
        rewardGold: 2600,
        rewardDiamonds: 12,
      },
      {
        id: 'gather_5',
        title: 'ปรุงยาคืนพระจันทร์เลือด (5 ครั้ง)',
        description: 'ตกปลา ขุดแร่ หรือเก็บสมุนไพรครบ 5 ครั้ง',
        metric: 'gathers',
        target: 5,
        rewardTokens: 20,
        rewardGold: 1500,
        rewardDiamonds: 5,
      },
    ],
    shopRewards: [
      {
        id: 'hw_wskin',
        name: 'สกินอาวุธเปลวประทีปมงคล',
        description: 'สกินเอฟเฟกต์อาวุธเปลวอัคนีสีแดงทอง',
        kind: 'cosmetic',
        cosmeticId: 'wskin_festival_crimson',
        costTokens: 60,
        limitPerCycle: 1,
      },
      {
        id: 'hw_scroll3',
        name: 'ใบเพิ่มโอกาสตีบวกชั้นเยี่ยม (+35%)',
        description: 'เพิ่มโอกาสตีบวกสำเร็จ +35% ระดับมหากาพย์',
        kind: 'item',
        itemId: 'enhance_chance_scroll_3',
        qty: 1,
        costTokens: 38,
        limitPerCycle: 2,
      },
      {
        id: 'hw_stones',
        name: 'ชุดหินตีบวกคืนหลอน x8',
        description: 'หินตีบวก 8 ก้อน สำหรับอัปเกรดอุปกรณ์',
        kind: 'item',
        itemId: 'enhance_stone',
        qty: 8,
        costTokens: 24,
        limitPerCycle: 4,
      },
      {
        id: 'hw_diamonds',
        name: 'ฟักทองนำโชค (+15 เพชร · 3,500 G)',
        description: 'แลกตะเกียงฟักทองเป็นเพชรและทองทันที',
        kind: 'currency',
        gold: 3500,
        diamonds: 15,
        costTokens: 30,
        limitPerCycle: 3,
      },
    ],
  },
  {
    id: 'weekend_hunter',
    kind: 'ingame',
    name: 'มหกรรมนักล่าสุดสัปดาห์',
    subtitle: 'Weekend Hunter Fever',
    description:
      'กิจกรรมประจำเกมทุกสุดสัปดาห์! เพิ่ม EXP +40% และโอกาสดรอป +40% พร้อมภารกิจสะสมตรานักล่าท้าทายแลกหินตีบวกและเพชร',
    scheduleLabel: 'กิจกรรมในเกม: ทุกศุกร์ 18:00 – อาทิตย์ 23:59 น.',
    tokenName: 'ตรานักล่าท้าทาย',
    accentColor: '#fb923c',
    secondaryColor: '#fde047',
    expBonusPct: 40,
    dropBonusPct: 40,
    goldBonusPct: 30,
    dailyGift: { gold: 500, diamonds: 5, tokens: 12 },
    missions: [
      {
        id: 'hunt_25',
        title: 'อุ่นเครื่องสุดสัปดาห์ (25 ตัว)',
        description: 'กำจัดมอนสเตอร์ครบ 25 ตัวในรอบกิจกรรม',
        metric: 'kills',
        target: 25,
        rewardTokens: 14,
        rewardGold: 1000,
        rewardDiamonds: 2,
      },
      {
        id: 'hunt_80',
        title: 'จ้าวแห่งการล่าสุดสัปดาห์ (80 ตัว)',
        description: 'กำจัดมอนสเตอร์ครบ 80 ตัวในรอบกิจกรรม',
        metric: 'kills',
        target: 80,
        rewardTokens: 28,
        rewardGold: 2500,
        rewardDiamonds: 6,
      },
      {
        id: 'boss_2',
        title: 'ล้มบอสประจำสัปดาห์ (2 ครั้ง)',
        description: 'ปราบบอสหรือผ่านหอคอยท้าทายรวม 2 ครั้ง',
        metric: 'bossAndTower',
        target: 2,
        rewardTokens: 32,
        rewardGold: 2200,
        rewardDiamonds: 10,
      },
      {
        id: 'gather_5',
        title: 'เก็บเกี่ยวทรัพยากร (5 ครั้ง)',
        description: 'ตกปลา ขุดแร่ หรือเก็บสมุนไพรครบ 5 ครั้ง',
        metric: 'gathers',
        target: 5,
        rewardTokens: 16,
        rewardGold: 1200,
        rewardDiamonds: 3,
      },
    ],
    shopRewards: [
      {
        id: 'wh_stones',
        name: 'หินตีบวก x6',
        description: 'หินตีบวก 6 ก้อน สำหรับอัปเกรดอุปกรณ์',
        kind: 'item',
        itemId: 'enhance_stone',
        qty: 6,
        costTokens: 18,
        limitPerCycle: 5,
      },
      {
        id: 'wh_exp',
        name: 'EXP Boost Up 100% (20น.)',
        description: 'เพิ่ม EXP จากมอนสเตอร์ +100% นาน 20 นาที',
        kind: 'item',
        itemId: 'asura_exp_100',
        qty: 1,
        costTokens: 20,
        limitPerCycle: 3,
      },
      {
        id: 'wh_companion',
        name: 'กล่องสุ่มคู่หู Pixel Quest',
        description: 'เปิดรับคู่หูผอบหรือผลึกวิวัฒนาการ x5',
        kind: 'item',
        itemId: 'companion_gacha_box',
        qty: 1,
        costTokens: 40,
        limitPerCycle: 2,
      },
      {
        id: 'wh_title',
        name: 'ฉายา: วีรชนแห่งเทศกาลนิรันดร์',
        description: 'ปลดล็อกฉายาถาวร +90 HP, +28 ATK, +20 DEF, +3% CRIT',
        kind: 'title',
        titleId: 'grand_festival_hero',
        costTokens: 70,
        limitPerCycle: 1,
      },
      {
        id: 'wh_diamonds',
        name: 'รางวัลนักล่า (+12 เพชร · 2,500 G)',
        description: 'แลกตรานักล่าเป็นเพชรและทองคำทันที',
        kind: 'currency',
        gold: 2500,
        diamonds: 12,
        costTokens: 24,
        limitPerCycle: 3,
      },
    ],
  },
  {
    id: 'guild_boss_rush',
    kind: 'ingame',
    name: 'ศึกพิชิตบอส & หอคอยท้าทาย',
    subtitle: 'Boss Siege & Tower Rush',
    description:
      'กิจกรรมในเกมวันอังคาร & พฤหัสบดี เพิ่มอัตราดรอปไอเทม +50% เหมาะสำหรับการล่าฟิลด์บอสและพิชิตหอคอย!',
    scheduleLabel: 'กิจกรรมในเกม: ทุกวันอังคาร & พฤหัสบดี (เวลาไทย)',
    tokenName: 'เหรียญตราพิชิตบอส',
    accentColor: '#f43f5e',
    secondaryColor: '#c084fc',
    expBonusPct: 35,
    dropBonusPct: 50,
    goldBonusPct: 35,
    dailyGift: { gold: 600, diamonds: 5, tokens: 12 },
    missions: [
      {
        id: 'hunt_25',
        title: 'กวาดล้างแนวหน้าบอส (25 ตัว)',
        description: 'กำจัดมอนสเตอร์ครบ 25 ตัวในรอบกิจกรรม',
        metric: 'kills',
        target: 25,
        rewardTokens: 14,
        rewardGold: 1100,
        rewardDiamonds: 2,
      },
      {
        id: 'hunt_80',
        title: 'ทะลวงปราการศัตรู (80 ตัว)',
        description: 'กำจัดมอนสเตอร์ครบ 80 ตัวในรอบกิจกรรม',
        metric: 'kills',
        target: 80,
        rewardTokens: 28,
        rewardGold: 2600,
        rewardDiamonds: 6,
      },
      {
        id: 'boss_2',
        title: 'พิชิตบอสหรือหอคอย (2 ครั้ง)',
        description: 'ปราบบอสหรือผ่านหอคอยท้าทายรวม 2 ครั้ง',
        metric: 'bossAndTower',
        target: 2,
        rewardTokens: 36,
        rewardGold: 2500,
        rewardDiamonds: 10,
      },
      {
        id: 'gather_5',
        title: 'เตรียมเสบียงทัพ (5 ครั้ง)',
        description: 'ตกปลา ขุดแร่ หรือเก็บสมุนไพรครบ 5 ครั้ง',
        metric: 'gathers',
        target: 5,
        rewardTokens: 15,
        rewardGold: 1200,
        rewardDiamonds: 3,
      },
    ],
    shopRewards: [
      {
        id: 'gbr_chance',
        name: 'ใบเพิ่มโอกาสตีบวกชั้นดี (+20%)',
        description: 'เพิ่มโอกาสสำเร็จการตีบวก +20%',
        kind: 'item',
        itemId: 'enhance_chance_scroll_2',
        qty: 1,
        costTokens: 18,
        limitPerCycle: 3,
      },
      {
        id: 'gbr_protect',
        name: 'ใบประกันความเสียหายตีบวก',
        description: 'กันระดับลดเมื่อตีบวก +6 ขึ้นไปพลาด',
        kind: 'item',
        itemId: 'enhance_protect_scroll_1',
        qty: 1,
        costTokens: 26,
        limitPerCycle: 2,
      },
      {
        id: 'gbr_stones',
        name: 'หินตีบวก x8',
        description: 'หินตีบวก 8 ก้อนสำหรับอัปเกรดอุปกรณ์',
        kind: 'item',
        itemId: 'enhance_stone',
        qty: 8,
        costTokens: 24,
        limitPerCycle: 4,
      },
      {
        id: 'gbr_diamonds',
        name: 'บำเหน็จผู้พิชิตบอส (+14 เพชร · 3,000 G)',
        description: 'แลกเหรียญตราพิชิตบอสเป็นเพชรและทอง',
        kind: 'currency',
        gold: 3000,
        diamonds: 14,
        costTokens: 26,
        limitPerCycle: 3,
      },
    ],
  },
  {
    id: 'harvest_blessing',
    kind: 'ingame',
    name: 'เทศกาลเก็บเกี่ยว & ฟาร์มมั่งคั่ง',
    subtitle: 'Harvest & Golden Farming',
    description:
      'กิจกรรมในเกมวันจันทร์ พุธ และศุกร์กลางวัน เพิ่มโบนัสทอง +45% และ EXP +35% พร้อมรางวัลสนับสนุนทักษะชีวิต',
    scheduleLabel: 'กิจกรรมในเกม: จันทร์ · พุธ · ศุกร์ช่วงกลางวัน (เวลาไทย)',
    tokenName: 'ใบโคลเวอร์ทองคำ',
    accentColor: '#34d399',
    secondaryColor: '#fbbf24',
    expBonusPct: 35,
    dropBonusPct: 30,
    goldBonusPct: 45,
    dailyGift: { gold: 500, diamonds: 4, tokens: 12 },
    missions: [
      {
        id: 'hunt_25',
        title: 'เปิดทางทุ่งเก็บเกี่ยว (25 ตัว)',
        description: 'กำจัดมอนสเตอร์ครบ 25 ตัวในรอบกิจกรรม',
        metric: 'kills',
        target: 25,
        rewardTokens: 14,
        rewardGold: 1100,
        rewardDiamonds: 2,
      },
      {
        id: 'hunt_80',
        title: 'เก็บเกี่ยวผลผลิตใหญ่ (80 ตัว)',
        description: 'กำจัดมอนสเตอร์ครบ 80 ตัวในรอบกิจกรรม',
        metric: 'kills',
        target: 80,
        rewardTokens: 28,
        rewardGold: 2800,
        rewardDiamonds: 6,
      },
      {
        id: 'boss_2',
        title: 'ปราบผู้พิทักษ์ทรัพยากร (2 ครั้ง)',
        description: 'ปราบบอสหรือผ่านหอคอยท้าทายรวม 2 ครั้ง',
        metric: 'bossAndTower',
        target: 2,
        rewardTokens: 30,
        rewardGold: 2200,
        rewardDiamonds: 9,
      },
      {
        id: 'gather_5',
        title: 'ยอดนักเก็บเกี่ยว (5 ครั้ง)',
        description: 'ตกปลา ขุดแร่ หรือเก็บสมุนไพรครบ 5 ครั้ง',
        metric: 'gathers',
        target: 5,
        rewardTokens: 22,
        rewardGold: 1600,
        rewardDiamonds: 5,
      },
    ],
    shopRewards: [
      {
        id: 'hb_life',
        name: 'น้ำยาทักษะฝึกฝน Boost Up 50%',
        description: 'เพิ่ม EXP ตกปลา/ขุดแร่/สมุนไพร +50% นาน 20 นาที',
        kind: 'item',
        itemId: 'asura_lifeskill_50',
        qty: 2,
        costTokens: 16,
        limitPerCycle: 3,
      },
      {
        id: 'hb_feast',
        name: 'ชุดอาหารผู้กล้า x3',
        description: 'ATK +18%, CRIT +8%, EXP +25% ต่อขวด',
        kind: 'item',
        itemId: 'food_hero_feast',
        qty: 3,
        costTokens: 18,
        limitPerCycle: 3,
      },
      {
        id: 'hb_stones',
        name: 'หินตีบวก x6',
        description: 'หินตีบวก 6 ก้อน สำหรับอัปเกรดอุปกรณ์',
        kind: 'item',
        itemId: 'enhance_stone',
        qty: 6,
        costTokens: 18,
        limitPerCycle: 4,
      },
      {
        id: 'hb_diamonds',
        name: 'โคลเวอร์นำโชค (+12 เพชร · 3,200 G)',
        description: 'แลกใบโคลเวอร์ทองคำเป็นเพชรและทองคำ',
        kind: 'currency',
        gold: 3200,
        diamonds: 12,
        costTokens: 24,
        limitPerCycle: 3,
      },
    ],
  },
]

const EVENT_BY_ID = new Map<FestivalEventId, FestivalEventDef>(
  FESTIVAL_EVENTS.map((ev) => [ev.id, ev]),
)

export function getFestivalEventDef(id: FestivalEventId | string | null | undefined): FestivalEventDef | null {
  if (!id) return null
  return EVENT_BY_ID.get(id as FestivalEventId) ?? null
}

export function isValidFestivalEventId(id: unknown): id is FestivalEventId {
  return typeof id === 'string' && EVENT_BY_ID.has(id as FestivalEventId)
}

export function sanitizeFestivalOverrideState(
  raw: unknown,
  nowMs = Date.now(),
): FestivalOverrideState | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Partial<FestivalOverrideState>
  if (!obj.active || !isValidFestivalEventId(obj.eventId)) return null
  const def = getFestivalEventDef(obj.eventId)!
  const expiresAtMs =
    typeof obj.expiresAtMs === 'number' && Number.isFinite(obj.expiresAtMs) && obj.expiresAtMs > 0
      ? Math.floor(obj.expiresAtMs)
      : null
  if (expiresAtMs !== null && expiresAtMs <= nowMs) return null

  const startedAtMs =
    typeof obj.startedAtMs === 'number' && Number.isFinite(obj.startedAtMs) && obj.startedAtMs > 0
      ? Math.floor(obj.startedAtMs)
      : nowMs
  const clampPct = (val: unknown, fallback: number) => {
    const n = Number(val)
    if (!Number.isFinite(n)) return fallback
    return Math.max(0, Math.min(500, Math.round(n)))
  }

  return {
    active: true,
    eventId: def.id,
    cycleKey:
      typeof obj.cycleKey === 'string' && obj.cycleKey.trim()
        ? obj.cycleKey.trim().slice(0, 64)
        : `override:${def.id}:${startedAtMs}`,
    customTitle:
      typeof obj.customTitle === 'string' && obj.customTitle.trim()
        ? obj.customTitle.trim().slice(0, 80)
        : undefined,
    expBonusPct: obj.expBonusPct !== undefined ? clampPct(obj.expBonusPct, def.expBonusPct) : def.expBonusPct,
    dropBonusPct: obj.dropBonusPct !== undefined ? clampPct(obj.dropBonusPct, def.dropBonusPct) : def.dropBonusPct,
    goldBonusPct: obj.goldBonusPct !== undefined ? clampPct(obj.goldBonusPct, def.goldBonusPct) : def.goldBonusPct,
    startedAtMs,
    expiresAtMs,
    triggeredByName:
      typeof obj.triggeredByName === 'string' && obj.triggeredByName.trim()
        ? obj.triggeredByName.trim().slice(0, 24)
        : 'GM',
  }
}

function matchSeasonalWindow(nowMs = Date.now()): {
  def: FestivalEventDef
  cycleKey: string
  startedAtMs: number
  endsAtMs: number
} | null {
  const bkk = getBangkokDateParts(nowMs)
  const { year, month, day } = bkk

  // Nov 10 - Nov 30: Loy Krathong
  if (month === 11 && day >= 10 && day <= 30) {
    return {
      def: EVENT_BY_ID.get('loy_krathong')!,
      cycleKey: `loy_krathong:${year}`,
      startedAtMs: bangkokMidnightUtcMs(year, 11, 10),
      endsAtMs: bangkokEndOfDayUtcMs(year, 11, 30),
    }
  }

  // Dec 20 - Jan 10: Winter Starlight & New Year
  if ((month === 12 && day >= 20) || (month === 1 && day <= 10)) {
    const seasonYear = month === 12 ? year : year - 1
    return {
      def: EVENT_BY_ID.get('new_year')!,
      cycleKey: `new_year:${seasonYear}`,
      startedAtMs: bangkokMidnightUtcMs(seasonYear, 12, 20),
      endsAtMs: bangkokEndOfDayUtcMs(seasonYear + 1, 1, 10),
    }
  }

  // Jan 22 - Feb 16: Lunar New Year
  if ((month === 1 && day >= 22) || (month === 2 && day <= 16)) {
    return {
      def: EVENT_BY_ID.get('lunar_new_year')!,
      cycleKey: `lunar_new_year:${year}`,
      startedAtMs: bangkokMidnightUtcMs(year, 1, 22),
      endsAtMs: bangkokEndOfDayUtcMs(year, 2, 16),
    }
  }

  // Apr 10 - Apr 18: Songkran
  if (month === 4 && day >= 10 && day <= 18) {
    return {
      def: EVENT_BY_ID.get('songkran')!,
      cycleKey: `songkran:${year}`,
      startedAtMs: bangkokMidnightUtcMs(year, 4, 10),
      endsAtMs: bangkokEndOfDayUtcMs(year, 4, 18),
    }
  }

  // Oct 24 - Nov 3: Halloween
  if ((month === 10 && day >= 24) || (month === 11 && day <= 3)) {
    const seasonYear = year
    return {
      def: EVENT_BY_ID.get('halloween')!,
      cycleKey: `halloween:${seasonYear}`,
      startedAtMs: bangkokMidnightUtcMs(seasonYear, 10, 24),
      endsAtMs: bangkokEndOfDayUtcMs(seasonYear, 11, 3),
    }
  }

  return null
}

function matchInGameRotatingWindow(nowMs = Date.now()): {
  def: FestivalEventDef
  cycleKey: string
  startedAtMs: number
  endsAtMs: number
} {
  const bkk = getBangkokDateParts(nowMs)
  const { year, month, day, dayOfWeek, hour, isoWeekKey } = bkk

  // Weekend Hunter Fever: Fri >= 18:00 through Sun 23:59
  if ((dayOfWeek === 5 && hour >= 18) || dayOfWeek === 6 || dayOfWeek === 0) {
    const daysSinceFriday = dayOfWeek === 5 ? 0 : dayOfWeek === 6 ? 1 : 2
    const fridayUtc = bangkokMidnightUtcMs(year, month, day) - daysSinceFriday * DAY_MS + 18 * 3_600_000
    const sundayEndUtc = bangkokEndOfDayUtcMs(year, month, day) + (dayOfWeek === 0 ? 0 : (7 - dayOfWeek) * DAY_MS)
    return {
      def: EVENT_BY_ID.get('weekend_hunter')!,
      cycleKey: `weekend_hunter:${isoWeekKey}`,
      startedAtMs: fridayUtc,
      endsAtMs: sundayEndUtc,
    }
  }

  // Tuesday (2) or Thursday (4): Boss Siege & Tower Rush
  if (dayOfWeek === 2 || dayOfWeek === 4) {
    return {
      def: EVENT_BY_ID.get('guild_boss_rush')!,
      cycleKey: `guild_boss_rush:${isoWeekKey}`,
      startedAtMs: bangkokMidnightUtcMs(year, month, day),
      endsAtMs: bangkokEndOfDayUtcMs(year, month, day),
    }
  }

  // Mon / Wed / Fri daytime: Harvest & Golden Farming
  return {
    def: EVENT_BY_ID.get('harvest_blessing')!,
    cycleKey: `harvest_blessing:${isoWeekKey}`,
    startedAtMs: bangkokMidnightUtcMs(year, month, day),
    endsAtMs:
      dayOfWeek === 5
        ? bangkokMidnightUtcMs(year, month, day) + 18 * 3_600_000 - 1
        : bangkokEndOfDayUtcMs(year, month, day),
  }
}

export function getActiveFestivalEvent(
  nowMs = Date.now(),
  override: FestivalOverrideState | null = null,
): ResolvedActiveFestival {
  const cleanOverride = sanitizeFestivalOverrideState(override, nowMs)
  if (cleanOverride) {
    const def = EVENT_BY_ID.get(cleanOverride.eventId)!
    return {
      def,
      cycleKey: cleanOverride.cycleKey,
      source: 'override',
      isGmOverride: true,
      title: cleanOverride.customTitle || def.name,
      startedAtMs: cleanOverride.startedAtMs,
      endsAtMs: cleanOverride.expiresAtMs,
      expBonusPct: cleanOverride.expBonusPct ?? def.expBonusPct,
      dropBonusPct: cleanOverride.dropBonusPct ?? def.dropBonusPct,
      goldBonusPct: cleanOverride.goldBonusPct ?? def.goldBonusPct,
      triggeredByName: cleanOverride.triggeredByName,
    }
  }

  const seasonal = matchSeasonalWindow(nowMs)
  if (seasonal) {
    return {
      def: seasonal.def,
      cycleKey: seasonal.cycleKey,
      source: 'seasonal',
      isGmOverride: false,
      title: seasonal.def.name,
      startedAtMs: seasonal.startedAtMs,
      endsAtMs: seasonal.endsAtMs,
      expBonusPct: seasonal.def.expBonusPct,
      dropBonusPct: seasonal.def.dropBonusPct,
      goldBonusPct: seasonal.def.goldBonusPct,
    }
  }

  const rotating = matchInGameRotatingWindow(nowMs)
  return {
    def: rotating.def,
    cycleKey: rotating.cycleKey,
    source: 'ingame',
    isGmOverride: false,
    title: rotating.def.name,
    startedAtMs: rotating.startedAtMs,
    endsAtMs: rotating.endsAtMs,
    expBonusPct: rotating.def.expBonusPct,
    dropBonusPct: rotating.def.dropBonusPct,
    goldBonusPct: rotating.def.goldBonusPct,
  }
}

export function computeFestivalMultipliers(
  nowMs = Date.now(),
  override: FestivalOverrideState | null = null,
): {
  expMul: number
  dropMul: number
  goldMul: number
  active: ResolvedActiveFestival
} {
  const active = getActiveFestivalEvent(nowMs, override)
  return {
    expMul: 1 + active.expBonusPct / 100,
    dropMul: 1 + active.dropBonusPct / 100,
    goldMul: 1 + active.goldBonusPct / 100,
    active,
  }
}

export function createDefaultFestivalPlayerState(): FestivalPlayerState {
  return {
    tokens: {},
    cycleProgress: {},
    claimedMissionKeys: [],
    claimedDailyGiftKeys: [],
    shopPurchases: {},
  }
}

export function sanitizeFestivalPlayerState(raw: unknown): FestivalPlayerState {
  const def = createDefaultFestivalPlayerState()
  if (!raw || typeof raw !== 'object') return def
  const obj = raw as Partial<FestivalPlayerState>

  const tokens: Record<string, number> = {}
  if (obj.tokens && typeof obj.tokens === 'object') {
    for (const [k, v] of Object.entries(obj.tokens)) {
      if (isValidFestivalEventId(k) && typeof v === 'number' && Number.isFinite(v) && v > 0) {
        tokens[k] = Math.min(999_999, Math.floor(v))
      }
    }
  }

  const cycleProgress: Record<string, FestivalCycleProgress> = {}
  if (obj.cycleProgress && typeof obj.cycleProgress === 'object') {
    const entries = Object.entries(obj.cycleProgress).slice(-12)
    for (const [cycleKey, prog] of entries) {
      if (!cycleKey || !prog || typeof prog !== 'object') continue
      cycleProgress[cycleKey.slice(0, 64)] = {
        kills: Math.max(0, Math.floor(Number(prog.kills ?? 0) || 0)),
        bossKills: Math.max(0, Math.floor(Number(prog.bossKills ?? 0) || 0)),
        gathers: Math.max(0, Math.floor(Number(prog.gathers ?? 0) || 0)),
        towerClears: Math.max(0, Math.floor(Number(prog.towerClears ?? 0) || 0)),
      }
    }
  }

  const claimedMissionKeys = Array.isArray(obj.claimedMissionKeys)
    ? [...new Set(obj.claimedMissionKeys.filter((k): k is string => typeof k === 'string' && k.length > 0))].slice(-80)
    : []

  const claimedDailyGiftKeys = Array.isArray(obj.claimedDailyGiftKeys)
    ? [...new Set(obj.claimedDailyGiftKeys.filter((k): k is string => typeof k === 'string' && k.length > 0))].slice(-60)
    : []

  const shopPurchases: Record<string, number> = {}
  if (obj.shopPurchases && typeof obj.shopPurchases === 'object') {
    const entries = Object.entries(obj.shopPurchases).slice(-80)
    for (const [k, v] of entries) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
        shopPurchases[k.slice(0, 96)] = Math.min(999, Math.floor(v))
      }
    }
  }

  return {
    tokens,
    cycleProgress,
    claimedMissionKeys,
    claimedDailyGiftKeys,
    shopPurchases,
  }
}

export function getFestivalTokenCount(
  state: FestivalPlayerState | undefined,
  eventId: FestivalEventId,
): number {
  return Math.max(0, Math.floor(state?.tokens?.[eventId] ?? 0))
}

export function getFestivalCycleProgress(
  state: FestivalPlayerState | undefined,
  cycleKey: string,
): FestivalCycleProgress {
  return state?.cycleProgress?.[cycleKey] ?? { kills: 0, bossKills: 0, gathers: 0, towerClears: 0 }
}

export function getFestivalMissionMetricValue(
  progress: FestivalCycleProgress,
  metric: FestivalMissionMetric,
): number {
  if (metric === 'kills') return progress.kills
  if (metric === 'bossAndTower') return progress.bossKills + progress.towerClears
  return progress.gathers
}

export function getFestivalDailyGiftKey(eventId: FestivalEventId, nowMs = Date.now()): string {
  const { isoDate } = getBangkokDateParts(nowMs)
  return `${eventId}:${isoDate}`
}

export function canClaimFestivalDailyGift(
  state: FestivalPlayerState | undefined,
  eventId: FestivalEventId,
  nowMs = Date.now(),
): boolean {
  const clean = sanitizeFestivalPlayerState(state)
  const key = getFestivalDailyGiftKey(eventId, nowMs)
  return !clean.claimedDailyGiftKeys.includes(key)
}

export function getFestivalMissionClaimKey(cycleKey: string, missionId: string): string {
  return `${cycleKey}:${missionId}`
}

export function getFestivalShopPurchaseKey(cycleKey: string, rewardId: string): string {
  return `${cycleKey}:${rewardId}`
}

export function recordFestivalProgressInState(
  state: FestivalPlayerState | undefined,
  delta: {
    kills?: number
    bossKills?: number
    gathers?: number
    towerClears?: number
    tokensEarned?: number
  },
  nowMs = Date.now(),
  override: FestivalOverrideState | null = null,
): { next: FestivalPlayerState; active: ResolvedActiveFestival; tokensAdded: number } {
  const active = getActiveFestivalEvent(nowMs, override)
  const next = sanitizeFestivalPlayerState(state)
  const cur = getFestivalCycleProgress(next, active.cycleKey)

  next.cycleProgress[active.cycleKey] = {
    kills: cur.kills + Math.max(0, Math.floor(delta.kills ?? 0)),
    bossKills: cur.bossKills + Math.max(0, Math.floor(delta.bossKills ?? 0)),
    gathers: cur.gathers + Math.max(0, Math.floor(delta.gathers ?? 0)),
    towerClears: cur.towerClears + Math.max(0, Math.floor(delta.towerClears ?? 0)),
  }

  const tokensAdded = Math.max(0, Math.floor(delta.tokensEarned ?? 0))
  if (tokensAdded > 0) {
    next.tokens[active.def.id] = (next.tokens[active.def.id] ?? 0) + tokensAdded
  }

  return { next, active, tokensAdded }
}

export function claimFestivalDailyGiftInState(
  state: FestivalPlayerState | undefined,
  nowMs = Date.now(),
  override: FestivalOverrideState | null = null,
):
  | {
      ok: true
      next: FestivalPlayerState
      active: ResolvedActiveFestival
      gift: FestivalDailyGiftDef
    }
  | { ok: false; reason: 'already_claimed'; message: string } {
  const active = getActiveFestivalEvent(nowMs, override)
  const next = sanitizeFestivalPlayerState(state)
  const key = getFestivalDailyGiftKey(active.def.id, nowMs)

  if (next.claimedDailyGiftKeys.includes(key)) {
    return {
      ok: false,
      reason: 'already_claimed',
      message: `รับของขวัญรายวัน "${active.title}" วันนี้ไปแล้ว (พรุ่งนี้มารับใหม่นะ!)`,
    }
  }

  next.claimedDailyGiftKeys = [...next.claimedDailyGiftKeys, key].slice(-60)
  next.tokens[active.def.id] = (next.tokens[active.def.id] ?? 0) + active.def.dailyGift.tokens

  return {
    ok: true,
    next,
    active,
    gift: active.def.dailyGift,
  }
}

export function claimFestivalMissionInState(
  state: FestivalPlayerState | undefined,
  missionId: string,
  nowMs = Date.now(),
  override: FestivalOverrideState | null = null,
):
  | {
      ok: true
      next: FestivalPlayerState
      active: ResolvedActiveFestival
      mission: FestivalMissionDef
    }
  | { ok: false; message: string } {
  const active = getActiveFestivalEvent(nowMs, override)
  const mission = active.def.missions.find((m) => m.id === missionId)
  if (!mission) {
    return { ok: false, message: 'ไม่พบภารกิจเทศกาลนี้' }
  }

  const next = sanitizeFestivalPlayerState(state)
  const claimKey = getFestivalMissionClaimKey(active.cycleKey, mission.id)
  if (next.claimedMissionKeys.includes(claimKey)) {
    return { ok: false, message: 'คุณรับรางวัลภารกิจนี้ไปแล้ว' }
  }

  const prog = getFestivalCycleProgress(next, active.cycleKey)
  const currentVal = getFestivalMissionMetricValue(prog, mission.metric)
  if (currentVal < mission.target) {
    return { ok: false, message: `ภารกิจยังไม่สำเร็จ (${currentVal}/${mission.target})` }
  }

  next.claimedMissionKeys = [...next.claimedMissionKeys, claimKey].slice(-80)
  next.tokens[active.def.id] = (next.tokens[active.def.id] ?? 0) + mission.rewardTokens

  return {
    ok: true,
    next,
    active,
    mission,
  }
}

export function countClaimableFestivalBadges(
  state: FestivalPlayerState | undefined,
  nowMs = Date.now(),
  override: FestivalOverrideState | null = null,
): number {
  const active = getActiveFestivalEvent(nowMs, override)
  const clean = sanitizeFestivalPlayerState(state)
  let count = canClaimFestivalDailyGift(clean, active.def.id, nowMs) ? 1 : 0
  const prog = getFestivalCycleProgress(clean, active.cycleKey)

  for (const m of active.def.missions) {
    const key = getFestivalMissionClaimKey(active.cycleKey, m.id)
    if (clean.claimedMissionKeys.includes(key)) continue
    if (getFestivalMissionMetricValue(prog, m.metric) >= m.target) {
      count += 1
    }
  }
  return count
}

export function spendFestivalTokensForShopInState(
  state: FestivalPlayerState | undefined,
  rewardId: string,
  nowMs = Date.now(),
  override: FestivalOverrideState | null = null,
):
  | {
      ok: true
      next: FestivalPlayerState
      active: ResolvedActiveFestival
      reward: FestivalShopRewardDef
    }
  | { ok: false; message: string } {
  const active = getActiveFestivalEvent(nowMs, override)
  const reward = active.def.shopRewards.find((r) => r.id === rewardId)
  if (!reward) {
    return { ok: false, message: 'ไม่พบของรางวัลนี้ในร้านค้าเทศกาล' }
  }

  const next = sanitizeFestivalPlayerState(state)
  const purchaseKey = getFestivalShopPurchaseKey(active.cycleKey, reward.id)
  const boughtCount = next.shopPurchases[purchaseKey] ?? 0
  if (boughtCount >= reward.limitPerCycle) {
    return { ok: false, message: `แลกไอเทมนี้ครบสิทธิ์ (${reward.limitPerCycle}/${reward.limitPerCycle}) แล้วในรอบนี้` }
  }

  const balance = getFestivalTokenCount(next, active.def.id)
  if (balance < reward.costTokens) {
    return {
      ok: false,
      message: `${active.def.tokenName} ไม่พอ (ต้องการ ${reward.costTokens} · มี ${balance})`,
    }
  }

  next.tokens[active.def.id] = balance - reward.costTokens
  next.shopPurchases[purchaseKey] = boughtCount + 1

  return {
    ok: true,
    next,
    active,
    reward,
  }
}

export function formatFestivalRemaining(endsAtMs: number | null, nowMs = Date.now()): string {
  if (endsAtMs === null) return 'GM เปิดต่อเนื่อง'
  const diffMs = Math.max(0, endsAtMs - nowMs)
  if (diffMs <= 0) return 'กำลังเปลี่ยนรอบ'
  const totalMinutes = Math.floor(diffMs / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const mins = totalMinutes % 60
  if (days > 0) return `อีก ${days} วัน ${hours} ชม.`
  if (hours > 0) return `อีก ${hours} ชม. ${mins} นาที`
  return `อีก ${Math.max(1, mins)} นาที`
}
