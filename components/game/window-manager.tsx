'use client'

import { useEffect, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Layers, Maximize2, Minimize2, RotateCcw, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { closePanel, type PanelId } from '@/lib/game/engine'
import {
  WINDOW_META,
  closeAllWindows,
  focusWindow,
  getSafeZoneBounds,
  isEffectiveTabbedMode,
  moveWindow,
  resetUiLayout,
  resizeWindow,
  setActiveDockTab,
  setDockMode,
  toggleMaximizeWindow,
  toggleMinimizeWindow,
  useUiLayout,
} from '@/lib/game/ui-layout'
import { useGame } from '@/lib/game/use-game'
import { cn } from '@/lib/utils'
import { renderPanelById } from './panels/panels'
import { WindowProvider } from './window-context'

type DragOp =
  | {
      kind: 'move'
      id: PanelId
      startX: number
      startY: number
      origX: number
      origY: number
    }
  | {
      kind: 'resize'
      id: PanelId
      startX: number
      startY: number
      origW: number
      origH: number
    }

export function WindowManager() {
  const g = useGame()
  const layout = useUiLayout()
  const [dragOp, setDragOp] = useState<DragOp | null>(null)

  useEffect(() => {
    if (!dragOp) return

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - dragOp.startX
      const dy = e.clientY - dragOp.startY
      if (dragOp.kind === 'move') {
        moveWindow(dragOp.id, dragOp.origX + dx, dragOp.origY + dy, false)
      } else {
        resizeWindow(dragOp.id, dragOp.origW + dx, dragOp.origH + dy, false)
      }
    }

    const onUp = (e: PointerEvent) => {
      const dx = e.clientX - dragOp.startX
      const dy = e.clientY - dragOp.startY
      if (dragOp.kind === 'move') {
        moveWindow(dragOp.id, dragOp.origX + dx, dragOp.origY + dy, true)
      } else {
        resizeWindow(dragOp.id, dragOp.origW + dx, dragOp.origH + dy, true)
      }
      setDragOp(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragOp])

  if (!g.p || layout.windows.length === 0) return null

  const vw = layout.viewport.width
  const vh = layout.viewport.height
  const isMobile = vw < 768
  const safe = getSafeZoneBounds(vw, vh)
  const tabbed = isEffectiveTabbedMode(layout)
  const visibleWindows = layout.windows.filter((w) => !w.minimized)
  const minimizedWindows = layout.windows.filter((w) => w.minimized)

  const activeTabbedId =
    (layout.activeDockTab && visibleWindows.some((w) => w.id === layout.activeDockTab)
      ? layout.activeDockTab
      : visibleWindows[visibleWindows.length - 1]?.id) ?? null

  const startDragMove = (id: PanelId, e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, select')) return
    const rect = layout.layouts[id] ?? { x: safe.left, y: safe.top, width: 620, height: 500 }
    e.preventDefault()
    focusWindow(id)
    setDragOp({
      kind: 'move',
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.x,
      origY: rect.y,
    })
  }

  const startResize = (id: PanelId, e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return
    const rect = layout.layouts[id] ?? { x: safe.left, y: safe.top, width: 620, height: 500 }
    e.preventDefault()
    e.stopPropagation()
    focusWindow(id)
    setDragOp({
      kind: 'resize',
      id,
      startX: e.clientX,
      startY: e.clientY,
      origW: rect.width,
      origH: rect.height,
    })
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {/* Minimized Taskbar Pills */}
      {minimizedWindows.length > 0 && (
        <div
          data-testid="minimized-windows-bar"
          className="pointer-events-auto absolute left-1/2 top-2 z-50 flex max-w-[min(36rem,calc(100vw-1rem))] -translate-x-1/2 flex-wrap items-center justify-center gap-1 pixel-panel px-2 py-1 shadow-xl"
        >
          {minimizedWindows.map((win) => (
            <div
              key={win.id}
              className="flex items-center overflow-hidden rounded border border-primary/40 bg-secondary/90 text-[10px]"
            >
              <button
                type="button"
                onClick={() => focusWindow(win.id)}
                className="flex items-center gap-1 px-2 py-0.5 font-semibold text-foreground hover:bg-primary/20"
                title={`กู้คืนหน้าต่าง ${WINDOW_META[win.id]?.title ?? win.id}`}
              >
                <Maximize2 className="size-2.5 text-primary" aria-hidden />
                <span className="max-w-[7.5rem] truncate">{WINDOW_META[win.id]?.title ?? win.id}</span>
              </button>
              <button
                type="button"
                onClick={() => closePanel(win.id)}
                aria-label={`ปิด ${WINDOW_META[win.id]?.title ?? win.id}`}
                className="border-l border-border/60 px-1.5 py-0.5 text-muted-foreground hover:bg-destructive/80 hover:text-white"
              >
                <X className="size-2.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tabbed / Mobile Fullscreen Dock Mode */}
      <AnimatePresence>
        {tabbed && activeTabbedId && (
          <motion.div
            key="tabbed-dock"
            initial={{ opacity: 0, scale: 0.985, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: 8 }}
            transition={{ duration: 0.14 }}
            className={cn(
              'pointer-events-auto flex flex-col',
              isMobile
                ? 'fixed inset-1.5 z-50 pb-[env(safe-area-inset-bottom)]'
                : 'absolute z-40 mx-auto',
            )}
            style={
              isMobile
                ? undefined
                : {
                    left: safe.left,
                    right: safe.right,
                    top: safe.top,
                    bottom: safe.bottom,
                    maxWidth: '56rem',
                  }
            }
          >
            {/* Dock Tab Strip */}
            <div className="mb-1 flex items-center justify-between gap-1.5 pixel-panel bg-[#171214]/95 px-2 py-1 shadow-lg">
              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                {visibleWindows.map((win) => {
                  const active = win.id === activeTabbedId
                  return (
                    <div
                      key={win.id}
                      className={cn(
                        'flex shrink-0 items-center rounded border text-[11px] transition-colors',
                        active
                          ? 'border-primary bg-primary text-primary-foreground font-bold'
                          : 'border-border bg-secondary/80 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveDockTab(win.id)}
                        className="px-2.5 py-1 whitespace-nowrap"
                      >
                        {WINDOW_META[win.id]?.title ?? win.id}
                      </button>
                      <button
                        type="button"
                        onClick={() => closePanel(win.id)}
                        aria-label={`ปิดแท็บ ${WINDOW_META[win.id]?.title ?? win.id}`}
                        className="mr-1 rounded p-0.5 opacity-75 hover:bg-black/20 hover:opacity-100"
                      >
                        <X className="size-3" aria-hidden />
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {!isMobile && (
                  <button
                    type="button"
                    onClick={() => setDockMode('floating')}
                    title="สลับเป็นหน้าต่างลอยอิสระ"
                    className="pixel-btn hidden items-center gap-1 bg-secondary px-2 py-1 text-[10px] font-semibold text-foreground hover:bg-secondary/80 sm:flex"
                  >
                    <Layers className="size-3 text-accent" aria-hidden />
                    <span>แยกหน้าต่าง</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => resetUiLayout()}
                  title="รีเซ็ตตำแหน่งหน้าต่าง"
                  aria-label="Reset UI Layout"
                  className="pixel-btn bg-secondary p-1 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => toggleMinimizeWindow(activeTabbedId)}
                  title="ย่อหน้าต่างนี้"
                  aria-label="ย่อหน้าต่าง"
                  className="pixel-btn bg-secondary p-1 text-muted-foreground hover:text-foreground"
                >
                  <Minimize2 className="size-3.5" aria-hidden />
                </button>
                {visibleWindows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => closeAllWindows()}
                    className="pixel-btn bg-destructive/75 px-2 py-1 text-[10px] font-semibold text-white hover:bg-destructive"
                  >
                    ปิดทั้งหมด
                  </button>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <WindowProvider
                value={{
                  windowId: activeTabbedId,
                  insideWindowManager: true,
                  maximized: true,
                  isMobileSheet: isMobile,
                  minimize: () => toggleMinimizeWindow(activeTabbedId),
                  toggleMaximize: () => setDockMode('floating'),
                  close: () => closePanel(activeTabbedId),
                }}
              >
                {renderPanelById(activeTabbedId, g)}
              </WindowProvider>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Multi-Window Mode */}
      {!tabbed &&
        visibleWindows.map((win) => {
          const rect = layout.layouts[win.id] ?? {
            x: safe.left,
            y: safe.top,
            width: 620,
            height: 500,
          }
          const style = win.maximized
            ? {
                left: safe.left,
                top: safe.top,
                width: Math.max(320, vw - safe.left - safe.right),
                height: Math.max(260, vh - safe.top - safe.bottom),
                zIndex: win.zIndex,
              }
            : {
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
                zIndex: win.zIndex,
              }

          return (
            <div
              key={win.id}
              data-testid={`window-${win.id}`}
              onPointerDown={() => focusWindow(win.id)}
              style={style}
              className="pointer-events-auto absolute flex flex-col"
            >
              <WindowProvider
                value={{
                  windowId: win.id,
                  insideWindowManager: true,
                  maximized: win.maximized,
                  isMobileSheet: false,
                  minimize: () => toggleMinimizeWindow(win.id),
                  toggleMaximize: () => toggleMaximizeWindow(win.id),
                  close: () => closePanel(win.id),
                  startDrag: win.maximized ? undefined : (e) => startDragMove(win.id, e),
                }}
              >
                {renderPanelById(win.id, g)}
              </WindowProvider>

              {!win.maximized && (
                <div
                  role="separator"
                  aria-label="ปรับขนาดหน้าต่าง"
                  onPointerDown={(e) => startResize(win.id, e)}
                  className="absolute bottom-0.5 right-0.5 z-10 size-4 cursor-nwse-resize rounded-br border-b-2 border-r-2 border-primary/70 opacity-70 hover:opacity-100"
                />
              )}
            </div>
          )
        })}
    </div>
  )
}
