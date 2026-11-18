import QRCode from 'qrcode'

export type TopupProvider = 'stripe_promptpay' | 'stripe_checkout' | 'promptpay_slip'

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
