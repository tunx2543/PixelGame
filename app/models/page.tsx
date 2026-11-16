import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { ModelGalleryView } from '@/components/game/model-gallery-view'

export default function ModelsGalleryPage() {
  return (
    <main className="relative min-h-screen w-full overflow-y-auto bg-background p-4 md:p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-primary md:text-2xl">
              <Sparkles className="size-5 text-gold" aria-hidden />
              คลังโมเดล 2D &amp; แอนิเมชั่น (21 อาชีพ • 17 มอนสเตอร์ • 5 สัตว์ขี่ • 10 ผอบ/สัตว์เลี้ยง)
            </h1>
            <p className="text-xs text-muted-foreground">
              สำรวจโมเดลพิกเซล 2D พร้อมแอนิเมชั่น Idle, Walk และ Attack สำหรับทุกสายอาชีพ มอนสเตอร์ สัตว์ขี่ และผอบ/สัตว์เลี้ยงใน Pixel Quest
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/class-selector"
              className="pixel-btn bg-secondary px-3 py-1.5 text-xs text-foreground hover:brightness-110"
            >
              เลือกสายอาชีพ
            </Link>
            <Link
              href="/"
              className="pixel-btn inline-flex items-center gap-1.5 bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-110"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              กลับหน้าเกม
            </Link>
          </div>
        </div>

        <section className="pixel-panel p-4">
          <ModelGalleryView />
        </section>
      </div>
    </main>
  )
}
