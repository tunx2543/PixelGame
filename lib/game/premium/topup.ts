import QRCode from 'qrcode'

export type TopupProvider =
  | 'stripe_promptpay'
  | 'stripe_checkout'
  | 'promptpay_slip'
  | 'promptpay_manual_gm'

export interface TopupPackage {
  packageId: string
  name: string
  subtitle: string
  priceThb: number
  baseDiamonds: number
  bonusDiamonds: number
  vipExp: number
  badge?: string
  featured?: boolean
}

export interface TopupOrderRecord {
  orderId: string
  characterId: string
  packageId: string
  packageName: string
  provider: TopupProvider
  gatewayRef: string
  amountThb: number
  baseDiamonds: number
  bonusDiamonds: number
  totalDiamonds: number
  vipExpGranted: number
  status: 'credited'
  txId: string
  serverVerified: boolean
  serverSignature: string
  createdAtMs: number
}

export const TOPUP_PACKAGES: TopupPackage[] = [
  {
    packageId: 'topup_starter',
    name: 'ถุงเพชรเริ่มต้น',
    subtitle: 'เหมาะสำหรับทดลองซื้อบัตร VIP หรือยา',
    priceThb: 29,
    baseDiamonds: 60,
    bonusDiamonds: 10,
    vipExp: 30,
  },
  {
    packageId: 'topup_pouch',
    name: 'ถุงเพชรนักผจญภัย',
    subtitle: 'คุ้มค่าสำหรับการตีบวกและขยายช่อง',
    priceThb: 59,
    baseDiamonds: 130,
    bonusDiamonds: 25,
    vipExp: 65,
  },
  {
    packageId: 'topup_chest',
    name: 'หีบเพชรอัศวิน',
    subtitle: 'แพ็กยอดนิยมสำหรับเปิด VIP & แฟชั่น',
    priceThb: 149,
    baseDiamonds: 350,
    bonusDiamonds: 80,
    vipExp: 170,
    badge: 'ยอดนิยม',
    featured: true,
  },
  {
    packageId: 'topup_treasury',
    name: 'คลังเพชรขุนพล',
    subtitle: 'ปลดล็อก Battle Pass & สัตว์ขี่ได้สบาย',
    priceThb: 299,
    baseDiamonds: 750,
    bonusDiamonds: 200,
    vipExp: 360,
  },
  {
    packageId: 'topup_royal',
    name: 'หีบราชันย์ออโรร่า',
    subtitle: 'รับโบนัสเพชรพิเศษ + VIP EXP สูง',
    priceThb: 599,
    baseDiamonds: 1600,
    bonusDiamonds: 480,
    vipExp: 750,
    badge: 'โบนัส +30%',
  },
  {
    packageId: 'topup_mythic',
    name: 'คลังมหาสมบัติเทพเจ้า',
    subtitle: 'แพ็กใหญ่คุ้มที่สุดสำหรับสายจัดเต็ม',
    priceThb: 1490,
    baseDiamonds: 4200,
    bonusDiamonds: 1500,
    vipExp: 1950,
    badge: 'คุ้มที่สุด',
    featured: true,
  },
]

export function getTopupPackage(packageId: string): TopupPackage | undefined {
  return TOPUP_PACKAGES.find((p) => p.packageId === packageId)
}

export function calculateTopupReward(
  pkg: TopupPackage,
  isFirstPurchase: boolean,
): {
  baseDiamonds: number
  bonusDiamonds: number
  totalDiamonds: number
  vipExp: number
} {
  const firstTimeExtra = isFirstPurchase ? pkg.baseDiamonds : 0
  const bonusDiamonds = pkg.bonusDiamonds + firstTimeExtra
  return {
    baseDiamonds: pkg.baseDiamonds,
    bonusDiamonds,
    totalDiamonds: pkg.baseDiamonds + bonusDiamonds,
    vipExp: pkg.vipExp,
  }
}

export function maskPromptPayId(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 6) return '***'
  return `${digits.slice(0, 3)}-xxx-${digits.slice(-4)}`
}

function tlv(tag: string, value: string): string {
  const len = String(value.length).padStart(2, '0')
  return `${tag}${len}${value}`
}

function crc16Ccitt(payload: string): string {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff
      } else {
        crc = (crc << 1) & 0xffff
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export function formatPromptPayTarget(rawId: string): { subTag: string; value: string } | null {
  const digits = rawId.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10 && digits.startsWith('0')) {
    return { subTag: '01', value: '0066' + digits.slice(1) }
  }
  if (digits.length === 11 && digits.startsWith('66')) {
    return { subTag: '01', value: '00' + digits }
  }
  if (digits.length === 13) {
    return { subTag: '02', value: digits }
  }
  if (digits.length === 15) {
    return { subTag: '03', value: digits }
  }
  return null
}

/**
 * Generates an official EMVCo Thai PromptPay QR payload string with CRC-16/CCITT checksum.
 */
export function buildPromptPayPayload(rawTarget: string, amountThb?: number): string {
  const target = formatPromptPayTarget(rawTarget)
  if (!target) {
    throw new Error('รูปแบบหมายเลข PromptPay ไม่ถูกต้อง (ต้องเป็นเบอร์มือถือ 10 หลัก, บัตร ปชช. 13 หลัก หรือ e-Wallet 15 หลัก)')
  }

  const merchantAccount = tlv('00', 'A000000677010111') + tlv(target.subTag, target.value)
  const hasAmount = typeof amountThb === 'number' && Number.isFinite(amountThb) && amountThb > 0
  const parts = [
    tlv('00', '01'),
    tlv('01', hasAmount ? '12' : '11'),
    tlv('29', merchantAccount),
    tlv('58', 'TH'),
    tlv('53', '764'),
  ]
  if (hasAmount) {
    parts.push(tlv('54', amountThb.toFixed(2)))
  }
  const body = parts.join('') + '6304'
  return body + crc16Ccitt(body)
}

export async function generatePromptPayQrDataUrl(rawTarget: string, amountThb: number): Promise<string> {
  const payload = buildPromptPayPayload(rawTarget, amountThb)
  return QRCode.toDataURL(payload, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#0f172a', light: '#ffffff' },
  })
}

export interface PromptPayShopSettings {
  settingId: 'promptpay'
  promptPayId: string
  accountName: string
  customQrDataUrl: string | null
  enabled: boolean
  updatedByUid: string
  createdAtMs: number
  updatedAtMs: number
}

export interface TopupSlipRequestRecord {
  requestId: string
  ownerId: string
  ownerEmail: string
  playerName: string
  gameUid: string
  characterId: string
  packageId: string
  packageName: string
  amountThb: number
  baseDiamonds: number
  bonusDiamonds: number
  totalDiamonds: number
  vipExpGranted: number
  slipDataUrl: string
  slipNote: string
  status: 'pending' | 'approved' | 'rejected'
  claimed: boolean
  claimedAtMs: number | null
  reviewedByUid: string | null
  reviewNote: string | null
  slipHash?: string | null
  createdAtMs: number
}

export interface TopupMilestoneDef {
  id: string
  thresholdThb: number
  title: string
  rewardLabel: string
  diamonds: number
  gold: number
  enhanceStones: number
  vipExp: number
  fashionId?: string
}

export const TOPUP_MILESTONES: TopupMilestoneDef[] = [
  {
    id: 'milestone_29',
    thresholdThb: 29,
    title: 'นักผจญภัยผู้สนับสนุน',
    rewardLabel: '30 D + 15,000 G + หินตีบวก x5',
    diamonds: 30,
    gold: 15000,
    enhanceStones: 5,
    vipExp: 20,
  },
  {
    id: 'milestone_100',
    thresholdThb: 100,
    title: 'ผู้พิทักษ์แห่งแสง',
    rewardLabel: '80 D + 40,000 G + หินตีบวก x12 + 50 VIP EXP',
    diamonds: 80,
    gold: 40000,
    enhanceStones: 12,
    vipExp: 50,
  },
  {
    id: 'milestone_300',
    thresholdThb: 300,
    title: 'ขุนพลออโรร่า',
    rewardLabel: '200 D + 100,000 G + หินตีบวก x25 + 120 VIP EXP',
    diamonds: 200,
    gold: 100000,
    enhanceStones: 25,
    vipExp: 120,
  },
  {
    id: 'milestone_600',
    thresholdThb: 600,
    title: 'ราชันย์คริสตัล',
    rewardLabel: '450 D + 250,000 G + หินตีบวก x45 + 250 VIP EXP',
    diamonds: 450,
    gold: 250000,
    enhanceStones: 45,
    vipExp: 250,
  },
  {
    id: 'milestone_1500',
    thresholdThb: 1500,
    title: 'ตำนานผู้ค้ำจุนโลก',
    rewardLabel: '1,200 D + 600,000 G + หินตีบวก x90 + 600 VIP EXP',
    diamonds: 1200,
    gold: 600000,
    enhanceStones: 90,
    vipExp: 600,
  },
]

export const DAILY_TOPUP_BONUS = {
  diamonds: 25,
  gold: 10000,
  enhanceStones: 3,
  vipExp: 15,
  label: '25 D + 10,000 G + หินตีบวก x3 + 15 VIP EXP',
} as const

export function isValidTopupPackageReward(
  packageId: string,
  amountThb: number,
  baseDiamonds: number,
  bonusDiamonds: number,
  vipExpGranted: number,
): boolean {
  const pkg = getTopupPackage(packageId)
  if (!pkg) return false
  if (amountThb !== pkg.priceThb) return false
  if (baseDiamonds !== pkg.baseDiamonds) return false
  const allowedNormal = pkg.bonusDiamonds
  const allowedFirst = pkg.bonusDiamonds + pkg.baseDiamonds
  if (bonusDiamonds !== allowedNormal && bonusDiamonds !== allowedFirst) return false
  if (vipExpGranted !== pkg.vipExp) return false
  return true
}

export async function computeFileSha256Hex(file: File): Promise<string | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null
  try {
    const buf = await file.arrayBuffer()
    const digest = await window.crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return null
  }
}

/**
 * Compresses an uploaded QR or transfer slip image into a JPEG Data URL <= ~220KB
 * so it can be stored safely in Firestore without exceeding document size bounds.
 */
export async function compressImageFileToDataUrl(
  file: File,
  maxDimension = 720,
  maxChars = 280000,
): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Image compression requires a browser environment')
  }
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'))
      el.src = objectUrl
    })
    const scale = Math.min(1, maxDimension / Math.max(img.width || 1, img.height || 1))
    const width = Math.max(1, Math.round((img.width || 1) * scale))
    const height = Math.max(1, Math.round((img.height || 1) * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('ไม่สามารถประมวลผลรูปภาพได้')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)

    let quality = 0.82
    let dataUrl = canvas.toDataURL('image/jpeg', quality)
    while (dataUrl.length > maxChars && quality > 0.35) {
      quality -= 0.12
      dataUrl = canvas.toDataURL('image/jpeg', quality)
    }
    if (dataUrl.length > maxChars) {
      throw new Error('ไฟล์รูปภาพใหญ่เกินไป กรุณาใช้รูปที่ขนาดเล็กลง')
    }
    return dataUrl
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
