import type { Metadata } from 'next'
import { TreasureChestScreen } from '@/components/game/treasure-chest-screen'

export const metadata: Metadata = {
  title: 'หีบสมบัติ & สุ่มไอเทม - Pixel Quest',
  description: 'เปิดหีบสมบัติเพื่อสุ่มรับอาวุธ ชุดเกราะ และไอเทมระดับ Common ถึง Mythic ด้วยระบบ generateRandomItem',
}

export default function TreasureChestPage() {
  return <TreasureChestScreen />
}
