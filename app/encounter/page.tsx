import type { Metadata } from 'next'
import { MonsterEncounterArena } from '@/components/game/monster-encounter-arena'

export const metadata: Metadata = {
  title: 'Monster Encounter - Pixel Quest',
  description: 'สนามต่อสู้สุ่มมอนสเตอร์ตามเลเวล คำนวณดาเมจจากสเตตัสและอาวุธตีบวก พร้อมซิงค์รางวัลเข้าเซฟตัวละคร',
}

export default function EncounterPage() {
  return <MonsterEncounterArena />
}
