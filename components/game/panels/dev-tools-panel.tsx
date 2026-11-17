'use client'

import { useMemo, useState } from 'react'
import {
  Compass,
  Crown,
  Flame,
  Gem,
  Heart,
  Megaphone,
  PackagePlus,
  RefreshCw,
  Save,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Terminal,
  Zap,
} from 'lucide-react'
import { auth } from '@/lib/firebase/client'
import firebaseConfig from '../../../firebase-applet-config.json'
import { ITEMS, JOBS, MAX_LEVEL, MAX_PLUS, MONSTERS } from '@/lib/game/data'
import { devCompleteAllDailyMissions, devRerollDailyMissions } from '@/lib/game/daily-missions'
import {
  castGmSkill,
  closePanel,
  devAddDiamonds,
  devAddGold,
  devAddPoints,
  devBroadcastAnnouncement,
  devChangeJob,
  devGiveItem,
  devHealFull,
  devKillAllMonsters,
  devSetLevel,
  devSetSpeed,
  devSetTowerFloor,
  devSpawnMonster,
  devTeleport,
  getActiveCharacterSlot,
  getStats,
  isCurrentAccountGm,
  openPanel,
  saveGame,
} from '@/lib/game/engine'
import { MAPS, MAP_ORDER, TILE } from '@/lib/game/maps'
import { GM_EMAIL, PERMANENT_GM_GAME_UID } from '@/lib/game/permissions'
import { useGame } from '@/lib/game/use-game'
import { formatNum } from '../format'
import { PanelFrame, PxButton } from './panels'

type DevTab = 'player' | 'world' | 'items' | 'system'

export function DevToolsPanel() {
  const g = useGame()
  const p = g.p
  const [tab, setTab] = useState<DevTab>('player')
  const [levelInput, setLevelInput] = useState(String(p?.level ?? 1))
  const [goldInput, setGoldInput] = useState('100000')
  const [gemInput, setGemInput] = useState('10000')
  const [towerInput, setTowerInput] = useState(String(p?.towerState?.highestFloor ?? 0))
  const [selectedMonster, setSelectedMonster] = useState(() => Object.keys(MONSTERS)[0] ?? 'slime')
  const [spawnCount, setSpawnCount] = useState(3)
  const [itemQuery, setItemQuery] = useState('')
  const [itemQty, setItemQty] = useState(1)
  const [itemPlus, setItemPlus] = useState(0)
  const [announceText, setAnnounceText] = useState('')
  const [statusMsg, setStatusMsg] = useState('')

  const allItems = useMemo(() => {
    const q = itemQuery.trim().toLowerCase()
    const list = Object.values(ITEMS)
    if (!q) return list.slice(0, 36)
    return list.filter((it) => it.id.toLowerCase().includes(q) || it.name.toLowerCase().includes(q)).slice(0, 48)
  }, [itemQuery])

  if (!p || !p.gm || !isCurrentAccountGm()) {
    return (
      <PanelFrame title="DEV CONSOLE" subtitle="ไม่มีสิทธิ์เข้าถึง">
        <div className="space-y-3 py-6 text-center text-xs">
          <p className="font-semibold text-destructive">
            ระบบ Dev สงวนสิทธิ์เฉพาะบัญชี GM {GM_EMAIL} (UID {PERMANENT_GM_GAME_UID}) เท่านั้น
          </p>
          <PxButton variant="secondary" onClick={closePanel}>
            ปิดหน้าต่าง
          </PxButton>
        </div>
      </PanelFrame>
    )
  }

  const s = getStats(p)
  const fbUser = auth.currentUser

  return (
    <PanelFrame
      title={`DEV CONSOLE · UID ${PERMANENT_GM_GAME_UID}`}
      subtitle={`บัญชีผู้พัฒนาหลัก: ${fbUser?.email ?? GM_EMAIL} • สิทธิ์ GM สูงสุด`}
    >
      <div className="space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-amber-400/50 bg-amber-400/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <Crown className="size-4 text-amber-300" aria-hidden />
            <div>
              <p className="font-bold text-amber-300">GM / DEV MODE ACTIVE</p>
              <p className="text-[11px] text-muted-foreground">
                UID: <span className="font-mono font-bold text-foreground">{PERMANENT_GM_GAME_UID}</span> • Lv.{p.level}{' '}
                {JOBS[p.jobId]?.name ?? p.jobId}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <PxButton variant={p.god ? 'accent' : 'secondary'} onClick={() => castGmSkill('immortal')}>
              <Shield className="mr-1 inline size-3.5" aria-hidden />
              อมตะ: {p.god ? 'ON' : 'OFF'}
            </PxButton>
            <PxButton variant={p.invisible ? 'accent' : 'secondary'} onClick={() => castGmSkill('invisible')}>
              ล่องหน: {p.invisible ? 'ON' : 'OFF'}
            </PxButton>
            <PxButton variant="primary" onClick={devHealFull}>
              <Heart className="mr-1 inline size-3.5" aria-hidden />
              ฟื้นฟูเต็ม
            </PxButton>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {(
            [
              ['player', 'ตัวละคร', Swords],
              ['world', 'แมพ/มอน', Compass],
              ['items', 'ไอเทม/ภารกิจ', PackagePlus],
              ['system', 'ระบบ/ประกาศ', Terminal],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`pixel-btn flex items-center justify-center gap-1 px-2 py-2 text-[11px] font-semibold ${
                tab === id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="size-3.5" aria-hidden />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {statusMsg && (
          <p className="border border-accent/50 bg-accent/10 px-2.5 py-1.5 text-[11px] text-accent">{statusMsg}</p>
        )}

        {tab === 'player' && (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
                <p className="font-semibold text-primary">เลเวล & ความเร็ว</p>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={MAX_LEVEL}
                    value={levelInput}
                    onChange={(e) => setLevelInput(e.target.value)}
                    className="w-24 border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
                  />
                  <PxButton onClick={() => devSetLevel(Number(levelInput) || 1)}>ตั้งเลเวล</PxButton>
                  <PxButton variant="secondary" onClick={() => devSetLevel(p.level + 10)}>
                    +10
                  </PxButton>
                  <PxButton variant="accent" onClick={() => devSetLevel(MAX_LEVEL)}>
                    MAX
                  </PxButton>
                </div>
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="mr-1 text-[11px] text-muted-foreground">ความเร็ว:</span>
                  {[0.5, 1, 2, 3, 5].map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => devSetSpeed(sp)}
                      className={`border px-2 py-0.5 text-[10px] ${
                        p.speed === sp
                          ? 'border-primary bg-primary/25 font-bold text-primary'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      x{sp}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
                <p className="font-semibold text-primary">การเงิน & แต้มตัวละคร</p>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={goldInput}
                    onChange={(e) => setGoldInput(e.target.value)}
                    className="min-w-0 flex-1 border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
                  />
                  <PxButton onClick={() => devAddGold(Number(goldInput) || 0)}>+Gold</PxButton>
                  <PxButton variant="secondary" onClick={() => devAddGold(1_000_000)}>
                    +1M
                  </PxButton>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={gemInput}
                    onChange={(e) => setGemInput(e.target.value)}
                    className="min-w-0 flex-1 border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
                  />
                  <PxButton variant="accent" onClick={() => devAddDiamonds(Number(gemInput) || 0)}>
                    <Gem className="mr-1 inline size-3" aria-hidden />
                    +เพชร
                  </PxButton>
                </div>
                <div className="flex gap-1.5 pt-0.5">
                  <PxButton variant="secondary" onClick={() => devAddPoints(50, 0)}>
                    +50 สเตตัส
                  </PxButton>
                  <PxButton variant="secondary" onClick={() => devAddPoints(0, 50)}>
                    +50 แต้มสกิล
                  </PxButton>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
              <p className="font-semibold text-primary">เปลี่ยนอาชีพทันที (14 อาชีพ)</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {Object.values(JOBS).map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => devChangeJob(job.id)}
                    className={`border px-2 py-1.5 text-left text-[11px] transition-colors ${
                      p.jobId === job.id
                        ? 'border-primary bg-primary/20 font-bold text-primary'
                        : 'border-border bg-background/70 text-foreground hover:border-primary/60'
                    }`}
                  >
                    <span className="block truncate">{job.name}</span>
                    <span className="block text-[9px] text-muted-foreground">{job.id}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'world' && (
          <div className="space-y-3">
            <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
              <p className="font-semibold text-primary">วาร์ปข้ามแผนที่</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {MAP_ORDER.map((id) => {
                  const m = MAPS[id]
                  if (!m) return null
                  return (
                    <PxButton
                      key={id}
                      variant={p.mapId === id ? 'accent' : 'secondary'}
                      onClick={() => devTeleport(id)}
                      className="text-left"
                    >
                      <span className="block truncate">{m.name}</span>
                      <span className="block text-[9px] opacity-75">{id}</span>
                    </PxButton>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
                <p className="font-semibold text-primary">เสกมอนสเตอร์ / บอสในแผนที่</p>
                <div className="flex gap-1.5">
                  <select
                    value={selectedMonster}
                    onChange={(e) => setSelectedMonster(e.target.value)}
                    className="min-w-0 flex-1 border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                  >
                    {Object.values(MONSTERS).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (Lv.{m.level}
                        {m.boss ? ' · BOSS' : ''})
                      </option>
                    ))}
                  </select>
                  <select
                    value={spawnCount}
                    onChange={(e) => setSpawnCount(Number(e.target.value))}
                    className="w-16 border border-border bg-background px-1.5 py-1.5 text-xs text-foreground"
                  >
                    <option value={1}>x1</option>
                    <option value={3}>x3</option>
                    <option value={5}>x5</option>
                    <option value={10}>x10</option>
                  </select>
                </div>
                <div className="flex gap-1.5">
                  <PxButton onClick={() => devSpawnMonster(selectedMonster, spawnCount)}>
                    <Flame className="mr-1 inline size-3.5" aria-hidden />
                    เสกมอนสเตอร์
                  </PxButton>
                  <PxButton variant="danger" onClick={devKillAllMonsters}>
                    <Skull className="mr-1 inline size-3.5" aria-hidden />
                    ฆ่าทั้งแมพ
                  </PxButton>
                </div>
              </div>

              <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
                <p className="font-semibold text-primary">หอคอยไต่ชั้น (Tower Dev)</p>
                <p className="text-[11px] text-muted-foreground">
                  ชั้นสูงสุดปัจจุบัน: {p.towerState?.highestFloor ?? 0}
                </p>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={towerInput}
                    onChange={(e) => setTowerInput(e.target.value)}
                    className="w-24 border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
                  />
                  <PxButton onClick={() => devSetTowerFloor(Number(towerInput) || 0)}>ตั้งชั้นหอคอย</PxButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'items' && (
          <div className="space-y-3">
            <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-primary">ระบบทดสอบภารกิจรายวัน (Daily Missions Dev)</p>
                <div className="flex gap-1.5">
                  <PxButton
                    variant="accent"
                    onClick={() =>
                      void devCompleteAllDailyMissions().then((res) => setStatusMsg(res.message))
                    }
                  >
                    <Zap className="mr-1 inline size-3.5" aria-hidden />
                    ทำภารกิจวันนี้ครบ 100%
                  </PxButton>
                  <PxButton
                    variant="secondary"
                    onClick={() =>
                      void devRerollDailyMissions().then((res) => setStatusMsg(res.message))
                    }
                  >
                    <RefreshCw className="mr-1 inline size-3.5" aria-hidden />
                    รีสุ่มภารกิจใหม่
                  </PxButton>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-primary">เสกไอเทมทุกชนิดในเกม</p>
                <div className="flex gap-1.5">
                  <PxButton variant="secondary" onClick={() => devGiveItem('enhance_stone', 100)}>
                    +100 หินตีบวก
                  </PxButton>
                  <PxButton variant="primary" onClick={() => openPanel('gm-summon')}>
                    <Sparkles className="mr-1 inline size-3.5" aria-hidden />
                    เปิดหน้าต่างของ GM
                  </PxButton>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <input
                  value={itemQuery}
                  onChange={(e) => setItemQuery(e.target.value)}
                  placeholder="ค้นหาชื่อไอเทม หรือ ID..."
                  className="min-w-0 flex-1 border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
                />
                <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  จำนวน:
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={itemQty}
                    onChange={(e) => setItemQty(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
                    className="w-14 border border-border bg-background px-1.5 py-1 text-foreground"
                  />
                </label>
                <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  บวก:
                  <input
                    type="number"
                    min={0}
                    max={MAX_PLUS}
                    value={itemPlus}
                    onChange={(e) => setItemPlus(Math.max(0, Math.min(MAX_PLUS, Number(e.target.value) || 0)))}
                    className="w-14 border border-border bg-background px-1.5 py-1 text-foreground"
                  />
                </label>
              </div>

              <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
                {allItems.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      const ok = devGiveItem(it.id, itemQty, itemPlus)
                      setStatusMsg(ok ? `เสก ${it.name} x${itemQty}${itemPlus ? ` +${itemPlus}` : ''} สำเร็จ` : 'กระเป๋าเต็ม')
                    }}
                    className="flex items-center justify-between gap-1 border border-border bg-background/80 px-2 py-1.5 text-left hover:border-primary"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-foreground">{it.name}</span>
                      <span className="block truncate font-mono text-[9px] text-muted-foreground">{it.id}</span>
                    </span>
                    <span className="shrink-0 text-[10px] text-primary">+เสก</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'system' && (
          <div className="space-y-3">
            <form
              className="space-y-2 border-2 border-border bg-muted/50 p-2.5"
              onSubmit={(e) => {
                e.preventDefault()
                devBroadcastAnnouncement(announceText)
                setStatusMsg('ส่งประกาศ GM บนหน้าจอเรียบร้อย')
                setAnnounceText('')
              }}
            >
              <p className="font-semibold text-primary">ประกาศ GM ด้านบนหน้าจอ</p>
              <div className="flex gap-1.5">
                <input
                  value={announceText}
                  onChange={(e) => setAnnounceText(e.target.value)}
                  maxLength={200}
                  placeholder="พิมพ์ข้อความประกาศถึงผู้เล่น..."
                  className="min-w-0 flex-1 border border-border bg-background px-2 py-1.5 text-foreground outline-none focus:border-primary"
                />
                <PxButton type="submit">
                  <Megaphone className="mr-1 inline size-3.5" aria-hidden />
                  ประกาศ
                </PxButton>
              </div>
            </form>

            <div className="space-y-2 border-2 border-border bg-muted/50 p-2.5">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-primary">ข้อมูลระบบและคลาวด์ (Diagnostics)</p>
                <PxButton
                  variant="accent"
                  onClick={() => {
                    saveGame()
                    setStatusMsg('บันทึกข้อมูลตัวละครขึ้น Firestore แล้ว')
                  }}
                >
                  <Save className="mr-1 inline size-3.5" aria-hidden />
                  Force Cloud Save
                </PxButton>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Game UID (Sole GM)</dt>
                  <dd className="font-mono font-bold text-amber-300">{PERMANENT_GM_GAME_UID}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email ผู้พัฒนา</dt>
                  <dd className="truncate font-mono text-foreground">{fbUser?.email ?? GM_EMAIL}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Firebase Auth UID</dt>
                  <dd className="truncate font-mono text-foreground">{fbUser?.uid ?? '-'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Save Slot</dt>
                  <dd className="font-mono text-foreground">{getActiveCharacterSlot()}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Firestore DB</dt>
                  <dd className="truncate font-mono text-foreground">{firebaseConfig.firestoreDatabaseId}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">ตำแหน่งปัจจุบัน</dt>
                  <dd className="font-mono text-foreground">
                    {p.mapId} ({Math.floor(p.x / TILE)}, {Math.floor(p.y / TILE)})
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Stats (ATK / DEF / CRIT)</dt>
                  <dd className="font-mono text-accent">
                    {formatNum(s.atk)} / {formatNum(s.def)} / {Math.round(s.crit * 100)}%
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Max HP / MP</dt>
                  <dd className="font-mono text-foreground">
                    {formatNum(s.maxHp)} / {formatNum(s.maxMp)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Monsters Active</dt>
                  <dd className="font-mono text-foreground">{g.monsters.filter((m) => !m.dead).length}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>
    </PanelFrame>
  )
}
