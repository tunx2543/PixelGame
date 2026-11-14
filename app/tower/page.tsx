import type { Metadata } from 'next'
import { TowerArena } from '@/components/game/tower-arena'

export const metadata: Metadata = {
  title: 'หอคอยไต่ชั้นและบอสท้าทาย · Pixel Quest',
  description: 'ท้าทายหอคอยไต่ชั้นพร้อมคู่หูสัตว์เลี้ยงและบอสประจำทุก 5 ชั้นใน Pixel Quest',
}

export default function TowerPage() {
  return <TowerArena />
}
