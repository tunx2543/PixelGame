import type { Metadata } from 'next'
import { InventoryScreen } from '@/components/game/inventory-screen'

export const metadata: Metadata = {
  title: 'คลังไอเทมและอุปกรณ์ - Pixel Quest',
  description: 'จัดการไอเทมที่ดรอปจากมอนสเตอร์ สวมใส่อาวุธ ชุดเกราะ และดูค่าสเตตัสที่เพิ่มขึ้นแบบเรียลไทม์',
}

export default function InventoryPage() {
  return <InventoryScreen />
}
