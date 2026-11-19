import type { Dir, SpriteAction } from '../sprites'
import { computeMotion } from './primitives'
import { renderEarlyBiomeMonster } from './biome-early'
import { renderMidBiomeMonster } from './biome-mid'
import { renderGothicBiomeMonster } from './biome-gothic'
import { renderRuinsBiomeMonster } from './biome-ruins'
import { renderEndgameBiomeMonster } from './biome-endgame'

export function renderCatalogMonster(
  ctx: CanvasRenderingContext2D,
  archetype: string,
  W: number,
  H: number,
  dir: Dir,
  action: SpriteAction,
  f: number,
): boolean {
  const m = computeMotion(W, H, dir, action, f)
  if (renderEarlyBiomeMonster(ctx, archetype, m)) return true
  if (renderMidBiomeMonster(ctx, archetype, m)) return true
  if (renderGothicBiomeMonster(ctx, archetype, m)) return true
  if (renderRuinsBiomeMonster(ctx, archetype, m)) return true
  if (renderEndgameBiomeMonster(ctx, archetype, m)) return true
  return false
}
