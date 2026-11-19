import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Compass, Map as MapIcon } from 'lucide-react'

interface MapPreviewItem {
  id: string
  name: string
  levelRange: string
  monsterCount: number
  portalsLabel: string
  description: string
  image: string
}

const MAP_PREVIEWS: MapPreviewItem[] = [
  {
    id: 'meadow',
    name: 'ทุ่งหญ้า',
    levelRange: 'Lv.1-10',
    monsterCount: 13,
    portalsLabel: 'เหนือ: ซากปราสาท · ใต้: ทะเลทราย · ตะวันตก: เมืองปราการเริ่มต้น · ตะวันออก: ชายฝั่ง',
    description: 'แผนที่เริ่มต้นนอกเมืองปราการ พร้อมมอนสเตอร์ระดับต้น 13 ชนิด (ไม่มีบอส)',
    image: '/previews/meadow.png',
  },
  {
    id: 'forest',
    name: 'ป่าลึก',
    levelRange: 'Lv.14-26',
    monsterCount: 35,
    portalsLabel: 'เหนือ: หุบเขาเขียว · ใต้: สุสาน · ตะวันออก: เมืองปราการเริ่มต้น',
    description: 'ป่าทึบที่มีมอนสเตอร์หลากหลายถึง 35 ชนิดและบอสประจำไบโอม',
    image: '/previews/forest.png',
  },
  {
    id: 'coast',
    name: 'ชายฝั่ง',
    levelRange: 'Lv.20-32',
    monsterCount: 28,
    portalsLabel: 'เหนือ: ภูเขาไฟ · ใต้: หมู่เกาะตะวันออก · ตะวันตก: ทุ่งหญ้า',
    description: 'ชายหาดและแนวโขดหินริมทะเล พร้อมมอนสเตอร์ธาตุน้ำ 28 ชนิด',
    image: '/previews/coast.png',
  },
  {
    id: 'cave',
    name: 'ถ้ำ',
    levelRange: 'Lv.24-36',
    monsterCount: 23,
    portalsLabel: 'เหนือ: เมืองปราการเริ่มต้น · ตะวันตก: สุสาน · ตะวันออก: ทะเลทราย',
    description: 'โถงถ้ำผลึกคริสตัลและแร่โบราณ พร้อมโกเลมและมอนสเตอร์ใต้ดิน',
    image: '/previews/cave.png',
  },
  {
    id: 'desert',
    name: 'ทะเลทราย',
    levelRange: 'Lv.30-42',
    monsterCount: 23,
    portalsLabel: 'เหนือ: ทุ่งหญ้า · ตะวันตก: ถ้ำ · ตะวันออก: หมู่เกาะตะวันออก',
    description: 'ผืนทรายสีทองและซากโบราณสถานแห่งทะเลทราย พร้อมมอนสเตอร์ 23 ชนิด',
    image: '/previews/desert.png',
  },
  {
    id: 'snow',
    name: 'แดนหิมะ',
    levelRange: 'Lv.50-60',
    monsterCount: 15,
    portalsLabel: 'ใต้: หุบเขาเขียว · ตะวันออก: แดนลอยฟ้า',
    description: 'ทุ่งน้ำแข็งและสนหิมะ พร้อมมอนสเตอร์น้ำแข็ง 15 ชนิด',
    image: '/previews/snow.png',
  },
  {
    id: 'volcano',
    name: 'ภูเขาไฟ',
    levelRange: 'Lv.62-74',
    monsterCount: 18,
    portalsLabel: 'เหนือ: บอสโลก · ใต้: ชายฝั่ง · ตะวันตก: ซากปราสาท',
    description: 'ปากปล่องภูเขาไฟและธารลาวา พร้อมมอนสเตอร์ธาตุไฟ 18 ชนิด',
    image: '/previews/volcano.png',
  },
  {
    id: 'sky',
    name: 'แดนลอยฟ้า',
    levelRange: 'Lv.68-78',
    monsterCount: 23,
    portalsLabel: 'ใต้: ป่าละเมาะ · ตะวันตก: แดนหิมะ · ตะวันออก: ห้วงอเวจี',
    description: 'หมู่เกาะลอยฟ้าเหนือเมฆ พร้อมมอนสเตอร์แห่งท้องฟ้า 23 ชนิด',
    image: '/previews/sky.png',
  },
  {
    id: 'world',
    name: 'บอสโลก',
    levelRange: 'Lv.90+',
    monsterCount: 1,
    portalsLabel: 'ใต้: ภูเขาไฟ · ตะวันตก: ห้วงอเวจี',
    description: 'ลานประลองระดับสูงสุดที่เชื่อมจากห้วงอเวจีและแดนลอยฟ้า',
    image: '/previews/world.png',
  },
]

export default function MapPreviewsPage() {
  return (
    <div className="h-full overflow-y-auto bg-[#0d0b14] text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0d0b14]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-amber-300 whitespace-nowrap shrink-0"
          >
            <MapIcon className="h-5 w-5" />
            <span>Pixel Quest Maps</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-300">
            <Link href="/" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              หน้าหลักเกม
            </Link>
            <Link href="/models" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              คลังโมเดล 2D
            </Link>
            <Link href="/encounter" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              สนามล่ามอนสเตอร์
            </Link>
            <Link href="/tower" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              หอคอยไต่ชั้น
            </Link>
          </nav>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>เข้าสู่เกม</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-10 border-b border-white/10 pb-8">
          <p className="text-xs font-medium text-amber-300/90">ตัวอย่างภาพจริงภายในแผนที่มอนสเตอร์</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            ภาพตัวอย่างแมพที่มีมอนสเตอร์และประตูวาร์ปเชื่อม 4 ทิศ
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-300">
            บันทึกภาพจากแคนวาสของเกมจริง แสดงสภาพแวดล้อมแต่ละไบโอม จุดเกิดมอนสเตอร์ตามตาราง
            และซุ้มประตูวาร์ปเชื่อมระหว่างแผนที่ (บน · ล่าง · ซ้าย · ขวา)
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {MAP_PREVIEWS.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-xl border border-white/10 bg-[#151221]"
            >
              <div className="relative aspect-video w-full bg-[#09080f]">
                <Image
                  src={item.image}
                  alt={`ภาพตัวอย่างแผนที่${item.name}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold text-white">{item.name}</h2>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 tabular-nums">
                    <span>{item.levelRange}</span>
                    <span aria-hidden="true">·</span>
                    <span>มอนสเตอร์ {item.monsterCount} ชนิด</span>
                  </div>
                </div>

                <p className="mt-2 text-sm text-zinc-300">{item.description}</p>

                <div className="mt-3 flex items-start gap-2 text-xs text-amber-200/80">
                  <Compass className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{item.portalsLabel}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
