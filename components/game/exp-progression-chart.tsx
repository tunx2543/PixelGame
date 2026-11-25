'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Award, Flame, TrendingUp } from 'lucide-react'
import {
  buildExpProgressionSeries,
  formatCompactExp,
  type ExpChartMode,
  type ExpChartRange,
  type ExpLevelPoint,
} from '@/lib/game/exp-progression'
import { formatNum } from './format'

interface ExpProgressionChartProps {
  level: number
  exp: number
  maxExp?: number
  characterName?: string
  jobName?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    payload?: ExpLevelPoint
  }>
  mode: ExpChartMode
}

function ExpChartTooltip({ active, payload, mode }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]?.payload
  if (!point) return null

  return (
    <div className="pixel-panel min-w-[200px] space-y-1.5 px-3 py-2.5 text-xs shadow-xl">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1">
        <span className="font-bold text-primary tabular-nums">{point.label}</span>
        {point.isCurrentLevel ? (
          <span className="rounded bg-[#fbbf24]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#fbbf24]">
            เลเวลปัจจุบัน
          </span>
        ) : point.isMilestone ? (
          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
            Milestone
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">EXP ขึ้นเลเวลถัดไป</span>
        <span className="font-semibold text-foreground tabular-nums">
          {point.expToNext > 0 ? formatNum(point.expToNext) : 'MAX'}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">EXP สะสมถึงระดับนี้</span>
        <span className="font-semibold text-[#fbbf24] tabular-nums">
          {formatNum(point.cumulativeExp)}
        </span>
      </div>

      <div className="pt-0.5 text-[10px] text-muted-foreground">
        โหมดแสดงผล: {mode === 'perLevel' ? 'EXP ที่ใช้ต่อเลเวล' : 'EXP สะสมตลอดเส้นทาง'}
      </div>
    </div>
  )
}

export function ExpProgressionChart({
  level,
  exp,
  maxExp,
  characterName,
  jobName,
}: ExpProgressionChartProps) {
  const [mode, setMode] = useState<ExpChartMode>('perLevel')
  const [range, setRange] = useState<ExpChartRange>('nearby')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const { points, summary, startLevel, endLevel } = useMemo(
    () =>
      buildExpProgressionSeries({
        currentLevel: level,
        currentExp: exp,
        maxExp,
        range,
      }),
    [level, exp, maxExp, range],
  )

  const curveKey = mode === 'perLevel' ? 'expToNext' : 'cumulativeExp'
  const earnedKey = mode === 'perLevel' ? 'earnedPerLevel' : 'earnedCumulativeExp'
  const currentPoint = points.find((pt) => pt.isCurrentLevel)
  const currentPointY = currentPoint ? currentPoint[curveKey] : undefined

  return (
    <section
      aria-label="กราฟความก้าวหน้าค่าประสบการณ์"
      data-testid="exp-progression-chart"
      className="pixel-panel flex w-full flex-col gap-4 p-4 text-foreground"
    >
      {/* Header & Controls */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-border/70 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-[#fbbf24]" aria-hidden />
            <h2 className="text-base font-bold text-foreground">
              กราฟความก้าวหน้าค่าประสบการณ์ (EXP)
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {characterName ? `${characterName}` : 'ตัวละคร'}
            {jobName ? ` · ${jobName}` : ''} — ช่วงที่แสดง Lv.{startLevel} ถึง Lv.{endLevel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="รูปแบบกราฟ EXP"
            className="flex items-center gap-1 rounded-md bg-background/60 p-1"
          >
            <button
              type="button"
              aria-pressed={mode === 'perLevel'}
              onClick={() => setMode('perLevel')}
              className={`px-2.5 py-1 text-xs font-medium ${
                mode === 'perLevel' ? 'asura-tab-active' : 'asura-tab'
              }`}
            >
              EXP ต่อเลเวล
            </button>
            <button
              type="button"
              aria-pressed={mode === 'cumulative'}
              onClick={() => setMode('cumulative')}
              className={`px-2.5 py-1 text-xs font-medium ${
                mode === 'cumulative' ? 'asura-tab-active' : 'asura-tab'
              }`}
            >
              EXP สะสม
            </button>
          </div>

          <div
            role="group"
            aria-label="ช่วงเลเวลบนกราฟ"
            className="flex items-center gap-1 rounded-md bg-background/60 p-1"
          >
            <button
              type="button"
              aria-pressed={range === 'nearby'}
              onClick={() => setRange('nearby')}
              className={`px-2.5 py-1 text-xs font-medium ${
                range === 'nearby' ? 'asura-tab-active' : 'asura-tab'
              }`}
            >
              รอบตัวละคร
            </button>
            <button
              type="button"
              aria-pressed={range === 'full'}
              onClick={() => setRange('full')}
              className={`px-2.5 py-1 text-xs font-medium ${
                range === 'full' ? 'asura-tab-active' : 'asura-tab'
              }`}
            >
              Lv.1–{summary.maxLevel}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="rounded-lg border border-border/80 bg-secondary/45 px-3 py-2.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>เป้าหมายถัดไป</span>
            <Flame className="size-3.5 text-[#fbbf24]" aria-hidden />
          </div>
          <p className="mt-1 text-sm font-bold text-foreground tabular-nums">
            {summary.isMaxLevel
              ? `Lv.${summary.maxLevel} (MAX)`
              : `Lv.${summary.currentLevel} → Lv.${summary.currentLevel + 1}`}
          </p>
          <p className="mt-0.5 text-[11px] text-[#fbbf24] tabular-nums">
            ความคืบหน้าเลเวลนี้ {summary.levelProgressPct}%
          </p>
        </div>

        <div className="rounded-lg border border-border/80 bg-secondary/45 px-3 py-2.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>EXP ของระดับนี้</span>
            <TrendingUp className="size-3.5 text-accent" aria-hidden />
          </div>
          <p className="mt-1 text-sm font-bold text-foreground tabular-nums">
            {summary.isMaxLevel
              ? 'เต็มเพดานแล้ว'
              : `${formatNum(summary.currentExp)} / ${formatNum(summary.nextLevelExp)}`}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            {summary.isMaxLevel
              ? 'ระดับสูงสุด'
              : `ขาดอีก ${formatNum(summary.remainingToNext)} EXP`}
          </p>
        </div>

        <div className="rounded-lg border border-border/80 bg-secondary/45 px-3 py-2.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>EXP สะสมรวม</span>
            <Award className="size-3.5 text-primary" aria-hidden />
          </div>
          <p className="mt-1 text-sm font-bold text-foreground tabular-nums">
            {formatNum(summary.currentTotalExp)}
          </p>
          <p className="mt-0.5 text-[11px] text-accent tabular-nums">
            {summary.overallProgressPct}% ของเส้นทาง Lv.{summary.maxLevel}
          </p>
        </div>
      </div>

      {/* Recharts Area Chart */}
      <div className="rounded-lg border border-border/80 bg-[#0d1420]/80 p-3">
        <div className="h-[270px] w-full min-w-0">
          {isMounted ? (
            <ResponsiveContainer width="100%" height={270}>
              <AreaChart
                data={points}
                margin={{ top: 24, right: 20, left: 4, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="expUpcomingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="expEarnedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.58} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.08} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.14)" />

                <XAxis
                  dataKey="level"
                  tickFormatter={(val: number) => `Lv.${val}`}
                  tick={{ fill: '#96a8c0', fontSize: 11 }}
                  axisLine={{ stroke: '#2c4a75' }}
                  tickLine={{ stroke: '#2c4a75' }}
                  minTickGap={16}
                />

                <YAxis
                  tickFormatter={(val: number) => formatCompactExp(val)}
                  tick={{ fill: '#96a8c0', fontSize: 11 }}
                  axisLine={{ stroke: '#2c4a75' }}
                  tickLine={{ stroke: '#2c4a75' }}
                  width={54}
                />

                <Tooltip
                  cursor={{ stroke: '#60a5fa', strokeDasharray: '3 3' }}
                  content={<ExpChartTooltip mode={mode} />}
                />

                <Area
                  type="monotone"
                  dataKey={curveKey}
                  name={mode === 'perLevel' ? 'เส้นโค้ง EXP ต่อเลเวล' : 'เส้นโค้ง EXP สะสม'}
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fill="url(#expUpcomingGrad)"
                  isAnimationActive={false}
                />

                <Area
                  type="monotone"
                  dataKey={earnedKey}
                  name="ช่วงเลเวลที่ผ่านแล้ว"
                  stroke="#fbbf24"
                  strokeWidth={2.5}
                  fill="url(#expEarnedGrad)"
                  connectNulls={false}
                  isAnimationActive={false}
                />

                <ReferenceLine
                  x={summary.currentLevel}
                  stroke="#fbbf24"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Lv.${summary.currentLevel}`,
                    position: 'top',
                    fill: '#fbbf24',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />

                {typeof currentPointY === 'number' ? (
                  <ReferenceDot
                    x={summary.currentLevel}
                    y={currentPointY}
                    r={6}
                    fill="#fbbf24"
                    stroke="#0d131d"
                    strokeWidth={2}
                  />
                ) : null}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              กำลังเตรียมกราฟความก้าวหน้า EXP...
            </div>
          )}
        </div>
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#fbbf24]" aria-hidden />
            ช่วงเลเวลที่ผ่านแล้ว (ถึง Lv.{summary.currentLevel})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#38bdf8]" aria-hidden />
            {mode === 'perLevel' ? 'เกณฑ์ EXP ที่ใช้ในแต่ละเลเวล' : 'EXP สะสมทั้งหมดถึง Lv.100'}
          </span>
        </div>
        <span className="tabular-nums">
          จุดสูงสุด Lv.99→100: {formatNum(39636)} EXP/Lv
        </span>
      </div>
    </section>
  )
}
