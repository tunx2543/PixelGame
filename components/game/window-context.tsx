'use client'

import { createContext, useContext, type PointerEvent as ReactPointerEvent } from 'react'
import type { PanelId } from '@/lib/game/engine'

export interface WindowContextValue {
  windowId: PanelId
  insideWindowManager: boolean
  maximized: boolean
  isMobileSheet: boolean
  minimize: () => void
  toggleMaximize: () => void
  close: () => void
  startDrag?: (e: ReactPointerEvent<HTMLElement>) => void
}

const WindowContext = createContext<WindowContextValue | null>(null)

export const WindowProvider = WindowContext.Provider

export function useWindowContext(): WindowContextValue | null {
  return useContext(WindowContext)
}
