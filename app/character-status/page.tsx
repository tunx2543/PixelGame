import type { Metadata } from 'next'
import { CharacterStatusView } from '@/components/game/character-status-view'

export const metadata: Metadata = {
  title: 'สถานะตัวละคร & กราฟ EXP - Pixel Quest',
  description: 'ดูสถานะตัวละคร พร้อมกราฟแสดงความก้าวหน้าของค่าประสบการณ์ (EXP) เทียบกับเลเวลตัวละคร',
}

export default function CharacterStatusPage() {
  return (
    <main className="h-dvh w-full overflow-y-auto bg-background px-4 py-6 md:flex md:items-center md:justify-center md:px-6">
      <CharacterStatusView />
    </main>
  )
}
