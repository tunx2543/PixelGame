import type { Metadata, Viewport } from 'next'
import { Cinzel, Kanit } from 'next/font/google'
import { PwaRuntime } from '@/components/game/pwa-controls'
import './globals.css'

const display = Cinzel({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display' })
const thai = Kanit({ subsets: ['thai', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-thai' })

export const metadata: Metadata = {
  title: 'Pixel Quest - เกม RPG พิกเซล',
  description: 'เกม Pixel RPG ผจญภัย ล่ามอนสเตอร์ เปลี่ยนอาชีพ ตีบวกอาวุธ พร้อมระบบบันทึกอัตโนมัติ',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Pixel Quest',
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', sizes: '32x32', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', sizes: '32x32', media: '(prefers-color-scheme: dark)' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#14111d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // ช่วยให้เว็บขยายเต็มพื้นที่จอรวมถึงส่วนขอบโค้ง/รอยบาก
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th" className={`${display.variable} ${thai.variable} h-full bg-background`}>
      <body className="font-sans antialiased h-full overflow-hidden select-none">
        {children}
        <PwaRuntime />
      </body>
    </html>
  )
}
