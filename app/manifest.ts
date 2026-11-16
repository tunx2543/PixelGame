import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Pixel Quest - เกม RPG พิกเซล',
    short_name: 'Pixel Quest',
    description: 'เกม Pixel RPG ผจญภัย ล่ามอนสเตอร์ เปลี่ยนอาชีพ ตีบวกอาวุธ พร้อมระบบบันทึกอัตโนมัติ',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['fullscreen', 'standalone'],
    background_color: '#0e0f1a',
    theme_color: '#0e0f1a',
    orientation: 'landscape',
    categories: ['games', 'role playing'],
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
