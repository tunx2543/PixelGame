export function formatPlayTime(sec: number) {
  const s = Math.floor(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h} ชม. ${m} นาที` : `${m} นาที`
}

export function formatNum(n: number) {
  return Math.floor(n).toLocaleString('en-US')
}

export function formatCompactNum(n: number) {
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(Math.floor(n))
  if (abs < 10_000) return `${sign}${abs.toLocaleString('en-US')}`
  if (abs < 1_000_000) {
    const val = (abs / 1_000).toFixed(1).replace(/\.0$/, '')
    return `${sign}${val}K`
  }
  if (abs < 1_000_000_000) {
    const val = (abs / 1_000_000).toFixed(2).replace(/\.?0+$/, '')
    return `${sign}${val}M`
  }
  const val = (abs / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')
  return `${sign}${val}B`
}
