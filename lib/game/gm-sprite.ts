export type GmDir = 'down' | 'up' | 'left' | 'right'
export type GmAnimAction = 'idle' | 'walk' | 'attack' | 'skill'
export type GmCompassDir =
  | 'south'
  | 'south-east'
  | 'east'
  | 'north-east'
  | 'north'
  | 'north-west'
  | 'west'
  | 'south-west'

export const GM_CANVAS_SIZE = 48
export const GM_ROTATION_OFFSET = 8
export const GM_IDLE_FRAMES = 4
export const GM_WALK_SOUTH_FRAMES = 8
export const GM_WALK_SIDE_FRAMES = 6
export const GM_ATTACK_FRAMES = 4
export const GM_SKILL_FRAMES = 6

export interface GmActiveSkillDef {
  index: 0 | 1 | 2
  skillKey: 'judgment' | 'nova' | 'miracle'
  name: string
  shortLabel: string
  cooldown: number
  color: string
  secondaryColor: string
}

export const GM_ACTIVE_SKILLS: readonly GmActiveSkillDef[] = [
  {
    index: 0,
    skillKey: 'judgment',
    name: 'พิพากษาสวรรค์',
    shortLabel: 'พิพากษา',
    cooldown: 1.8,
    color: '#ffd60a',
    secondaryColor: '#38bdf8',
  },
  {
    index: 1,
    skillKey: 'nova',
    name: 'คลื่นพลังราชันย์',
    shortLabel: 'คลื่นราชันย์',
    cooldown: 2.4,
    color: '#38bdf8',
    secondaryColor: '#f472b6',
  },
  {
    index: 2,
    skillKey: 'miracle',
    name: 'ปาฏิหาริย์ GM',
    shortLabel: 'ฟื้นฟูGM',
    cooldown: 4.0,
    color: '#fde047',
    secondaryColor: '#67e8f9',
  },
] as const

export function dirToGmCompass(dir: GmDir): GmCompassDir {
  switch (dir) {
    case 'up':
      return 'north'
    case 'left':
      return 'west'
    case 'right':
      return 'east'
    case 'down':
    default:
      return 'south'
  }
}

export function getGmSpritePaths() {
  const base = '/images/characters/gm-epic/Idle'
  return {
    rotations: {
      south: `${base}/rotations/south.png`,
      'south-east': `${base}/rotations/south-east.png`,
      east: `${base}/rotations/east.png`,
      'north-east': `${base}/rotations/north-east.png`,
      north: `${base}/rotations/north.png`,
      'north-west': `${base}/rotations/north-west.png`,
      west: `${base}/rotations/west.png`,
      'south-west': `${base}/rotations/south-west.png`,
    } satisfies Record<GmCompassDir, string>,
    walkSouth: Array.from(
      { length: GM_WALK_SOUTH_FRAMES },
      (_, i) => `${base}/animations/Walk/south/frame_${String(i).padStart(3, '0')}.png`,
    ),
  }
}

export function computeGmWalkFrameCount(dir: GmDir): number {
  return dir === 'down' ? GM_WALK_SOUTH_FRAMES : GM_WALK_SIDE_FRAMES
}

export function normalizeGmFrame(action: GmAnimAction, dir: GmDir, frame: number): number {
  const raw = Number.isFinite(frame) ? Math.abs(Math.floor(frame)) : 0
  if (action === 'walk') {
    return raw % computeGmWalkFrameCount(dir)
  }
  if (action === 'attack') {
    return raw % GM_ATTACK_FRAMES
  }
  if (action === 'skill') {
    return raw % GM_SKILL_FRAMES
  }
  return raw % GM_IDLE_FRAMES
}

export interface GmPoseSpec {
  dir: GmDir
  compass: GmCompassDir
  action: GmAnimAction
  frame: number
  useWalkSouthSheet: boolean
  walkSouthIndex: number
  bodyDx: number
  bodyDy: number
  leftFootDx: number
  leftFootDy: number
  rightFootDx: number
  rightFootDy: number
  capeSwayX: number
  wingFlare: number
  crownGlow: number
  slashAlpha: number
  slashAngle: number
  impactRadius: number
  ringRadius: number
  ringPhase: number
  beamAlpha: number
  orbAngle: number
  auraColor: string
  secondaryAuraColor: string
}

export function computeGmPoseSpec(
  dir: GmDir,
  action: GmAnimAction,
  frame: number,
): GmPoseSpec {
  const f = normalizeGmFrame(action, dir, frame)
  const compass = dirToGmCompass(dir)
  const dirVecX = dir === 'left' ? -1 : dir === 'right' ? 1 : 0
  const dirVecY = dir === 'up' ? -1 : dir === 'down' ? 1 : 0

  const base: GmPoseSpec = {
    dir,
    compass,
    action,
    frame: f,
    useWalkSouthSheet: false,
    walkSouthIndex: 0,
    bodyDx: 0,
    bodyDy: 0,
    leftFootDx: 0,
    leftFootDy: 0,
    rightFootDx: 0,
    rightFootDy: 0,
    capeSwayX: 0,
    wingFlare: 0.22,
    crownGlow: 0.35,
    slashAlpha: 0,
    slashAngle: dir === 'left' ? Math.PI : dir === 'right' ? 0 : dir === 'up' ? -Math.PI / 2 : Math.PI / 2,
    impactRadius: 0,
    ringRadius: 0,
    ringPhase: 0,
    beamAlpha: 0,
    orbAngle: 0,
    auraColor: '#38bdf8',
    secondaryAuraColor: '#ffd60a',
  }

  if (action === 'idle') {
    const hover = f === 1 || f === 2 ? -1 : 0
    return {
      ...base,
      bodyDy: hover,
      wingFlare: f === 1 ? 0.42 : f === 2 ? 0.5 : 0.25,
      crownGlow: f === 2 ? 0.72 : 0.38,
    }
  }

  if (action === 'walk') {
    if (dir === 'down') {
      return {
        ...base,
        useWalkSouthSheet: true,
        walkSouthIndex: f,
        wingFlare: f % 2 === 0 ? 0.36 : 0.24,
        crownGlow: 0.45,
      }
    }

    if (dir === 'left' || dir === 'right') {
      const sign = dir === 'right' ? 1 : -1
      // 6-frame stride cycle with real leg crossover + cape trail
      const bobTable = [0, -1, 0, 0, -1, 0]
      const frontStride = [2, 1, -2, -2, -1, 2]
      const frontLift = [0, -1, 0, 0, 0, -1]
      const backStride = [-2, -1, 2, 2, 1, -2]
      const backLift = [0, 0, -1, 0, -1, 0]
      const capeWave = [-1, -2, -1, 0, -1, -2]

      return {
        ...base,
        bodyDx: f === 1 || f === 4 ? sign : 0,
        bodyDy: bobTable[f],
        leftFootDx: frontStride[f] * sign,
        leftFootDy: frontLift[f],
        rightFootDx: backStride[f] * sign,
        rightFootDy: backLift[f],
        capeSwayX: capeWave[f] * sign,
        wingFlare: f === 1 || f === 4 ? 0.48 : 0.28,
        crownGlow: 0.45,
      }
    }

    // Walking up (north): alternating boot lifts + flowing cape sway
    const bobTable = [0, -1, 0, 0, -1, 0]
    const leftLift = [-2, -1, 0, 0, 0, 0]
    const rightLift = [0, 0, 0, -2, -1, 0]
    const capeSway = [-1, 0, 1, 1, 0, -1]

    return {
      ...base,
      bodyDy: bobTable[f],
      leftFootDy: leftLift[f],
      rightFootDy: rightLift[f],
      capeSwayX: capeSway[f],
      wingFlare: f === 0 || f === 3 ? 0.48 : 0.28,
      crownGlow: 0.45,
    }
  }

  if (action === 'attack') {
    // 4-frame attack: windup -> lunge strike -> impact burst -> follow-through
    const lungeOffsets = [-2, 4, 3, 1]
    const bodyBob = [1, -1, 0, 0]
    const wingFlares = [0.45, 0.95, 0.85, 0.4]
    const slashAlphas = [0.25, 0.96, 0.78, 0.22]
    const impactRadii = [0, 6, 11, 5]

    return {
      ...base,
      bodyDx: dirVecX * lungeOffsets[f],
      bodyDy: dirVecY * lungeOffsets[f] + bodyBob[f],
      capeSwayX: -dirVecX * (f === 1 ? 2 : 1),
      wingFlare: wingFlares[f],
      crownGlow: f === 1 || f === 2 ? 0.95 : 0.55,
      slashAlpha: slashAlphas[f],
      impactRadius: impactRadii[f],
    }
  }

  // Skill animation (6 frames): floating ascension + arcane ring + wing overdrive + celestial burst
  const floatTable = [-1, -3, -4, -4, -3, -1]
  const wingFlares = [0.55, 0.85, 1, 1, 0.9, 0.6]
  const ringRadii = [9, 13, 16, 17, 15, 11]
  const beamAlphas = [0.15, 0.35, 0.75, 0.95, 0.65, 0.25]

  return {
    ...base,
    bodyDy: floatTable[f],
    wingFlare: wingFlares[f],
    crownGlow: 1,
    ringRadius: ringRadii[f],
    ringPhase: (f / GM_SKILL_FRAMES) * Math.PI * 2,
    beamAlpha: beamAlphas[f],
    orbAngle: (f / GM_SKILL_FRAMES) * Math.PI * 2,
    impactRadius: f >= 2 && f <= 4 ? 12 + (f - 2) * 3 : 0,
  }
}
