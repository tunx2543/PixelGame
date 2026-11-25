import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MOUNT_DEFS,
  MAX_MOUNT_LEVEL,
  MOUNT_ANIM_FRAME_COUNTS,
  MOUNT_RUN_HOLD_SEC,
  MOUNT_TRANSITION_DURATION,
  getMountDef,
  mountUpgradeCost,
  createDefaultMountState,
  sanitizeMountState,
  getActiveMountBonuses,
  getMountVisualTier,
  getMountVisualTierLabel,
  selectMountState,
  summonMountState,
  storeMountState,
  setMountRidingState,
  getMountAnimFrameBobY,
  getMountRiderSeatOffset,
  resolveMountAnimationState,
} from './mounts';

test('MOUNT_DEFS preserves all 9 mount IDs, rarities, and distinct configurations', () => {
  assert.equal(MOUNT_DEFS.length, 9);
  assert.deepEqual(
    MOUNT_DEFS.map((m) => m.id),
    ['meadow_pony', 'dog', 'cat', 'turtle', 'frost_wolf', 'panda', 'chocobo', 'elephant', 'aurora_cloud_dragon'],
  );
  assert.deepEqual(
    MOUNT_DEFS.map((m) => m.rarity),
    ['ทั่วไป', 'ทั่วไป', 'ทั่วไป', 'หายาก', 'หายาก', 'อีปิก', 'อีปิก', 'ตำนาน', 'มายา'],
  );
  for (const def of MOUNT_DEFS) {
    assert.equal(getMountDef(def.id)?.id, def.id);
  }
  assert.equal(getMountDef('royal_griffin')?.id, 'chocobo');
  assert.equal(getMountDef('starlight_kirin')?.id, 'elephant');
  assert.equal(getMountDef('non_existent'), null);
  assert.equal(getMountDef(null), null);
});

test('getMountVisualTier maps Lv.1-10 cleanly into 5 distinct visual tiers', () => {
  assert.equal(getMountVisualTier(1), 1);
  assert.equal(getMountVisualTier(2), 1);
  assert.equal(getMountVisualTier(3), 2);
  assert.equal(getMountVisualTier(4), 2);
  assert.equal(getMountVisualTier(5), 3);
  assert.equal(getMountVisualTier(6), 3);
  assert.equal(getMountVisualTier(7), 4);
  assert.equal(getMountVisualTier(8), 4);
  assert.equal(getMountVisualTier(9), 5);
  assert.equal(getMountVisualTier(10), 5);
  assert.equal(getMountVisualTier(0), 1);
  assert.equal(getMountVisualTier(99), 5);

  assert.match(getMountVisualTierLabel(1), /ขั้น 1/);
  assert.match(getMountVisualTierLabel(3), /ขั้น 2/);
  assert.match(getMountVisualTierLabel(5), /ขั้น 3/);
  assert.match(getMountVisualTierLabel(7), /ขั้น 4/);
  assert.match(getMountVisualTierLabel(9), /ขั้น 5/);
});

test('summon, mount, dismount, select, and store state transitions preserve owned mounts', () => {
  const initial = sanitizeMountState({
    activeMountId: null,
    mounted: false,
    ownedMounts: {
      meadow_pony: { level: 3 },
      chocobo: { level: 5 },
    },
  });

  // Summon puts mount out beside player without immediately mounting
  const summoned = summonMountState(initial, 'meadow_pony');
  assert.equal(summoned.activeMountId, 'meadow_pony');
  assert.equal(summoned.mounted, false);

  // Riding toggles mounted=true while preserving activeMountId
  const riding = setMountRidingState(summoned, true);
  assert.equal(riding.activeMountId, 'meadow_pony');
  assert.equal(riding.mounted, true);

  // Selecting another owned mount updates activeMountId and keeps riding state or autoMounts
  const switched = selectMountState(riding, 'chocobo', [], false);
  assert.equal(switched.activeMountId, 'chocobo');
  assert.equal(switched.mounted, true);

  // Dismounting keeps activeMountId summoned
  const dismounted = setMountRidingState(switched, false);
  assert.equal(dismounted.activeMountId, 'chocobo');
  assert.equal(dismounted.mounted, false);

  // Storing clears activeMountId and mounted while keeping ownedMounts intact
  const stored = storeMountState(dismounted);
  assert.equal(stored.activeMountId, null);
  assert.equal(stored.mounted, false);
  assert.equal(stored.ownedMounts.chocobo.level, 5);
  assert.equal(stored.ownedMounts.meadow_pony.level, 3);

  // Cannot summon unowned mount
  const invalidSummon = summonMountState(stored, 'elephant');
  assert.equal(invalidSummon.activeMountId, null);
});

test('sanitizeMountState handles Save/Load clamping, legacy aliases, unknown IDs, and linked gem items', () => {
  const restored = sanitizeMountState(
    {
      activeMountId: 'frost_wolf',
      mounted: true,
      ownedMounts: {
        frost_wolf: { level: 999 },
        meadow_pony: { level: -3 },
        royal_griffin: { level: 4 },
        removed_fake_mount: { level: 4 },
      },
    },
    ['aurora_cloud_dragon'],
  );

  assert.equal(restored.activeMountId, 'frost_wolf');
  assert.equal(restored.mounted, true);
  assert.equal(restored.ownedMounts.frost_wolf.level, MAX_MOUNT_LEVEL);
  assert.equal(restored.ownedMounts.meadow_pony.level, 1);
  assert.equal(restored.ownedMounts.chocobo.level, 4);
  assert.equal(restored.ownedMounts.aurora_cloud_dragon.level, 1);
  assert.equal(restored.ownedMounts.removed_fake_mount, undefined);

  const defaultFromGem = createDefaultMountState(['aurora_cloud_dragon']);
  assert.equal(defaultFromGem.activeMountId, 'aurora_cloud_dragon');
  assert.equal(defaultFromGem.mounted, true);
});

test('getActiveMountBonuses preserves exact bonus formulas without altering stat math', () => {
  const state = sanitizeMountState({
    activeMountId: 'chocobo',
    mounted: true,
    ownedMounts: { chocobo: { level: 4 } },
  });
  const def = getMountDef('chocobo')!;
  const bonuses = getActiveMountBonuses(state);
  assert.ok(bonuses);
  const expectedScale = 1 + (4 - 1) * 0.16;
  const expectedSpeedPct = def.speedBonusPct + (4 - 1) * 3;
  assert.equal(bonuses.speedBonusPct, expectedSpeedPct);
  assert.equal(bonuses.speedMul, 1 + expectedSpeedPct / 100);
  assert.equal(bonuses.hpBonus, Math.round(def.hpBonus * expectedScale));
  assert.equal(bonuses.atkBonus, Math.round(def.atkBonus * expectedScale));
  assert.equal(bonuses.defBonus, Math.round(def.defBonus * expectedScale));

  // Unmounted active mount grants passive stat bonuses but speedMul stays 1
  const dismountedBonuses = getActiveMountBonuses({ ...state, mounted: false });
  assert.equal(dismountedBonuses?.speedMul, 1);
  assert.equal(dismountedBonuses?.atkBonus, bonuses.atkBonus);

  // Upgrade cost formula unchanged
  assert.equal(mountUpgradeCost(1), 450);
  assert.equal(mountUpgradeCost(3), 4050);
});

test('resolveMountAnimationState handles idle, walk, run, mount, dismount, and attack frames', () => {
  assert.deepEqual(MOUNT_ANIM_FRAME_COUNTS, {
    idle: 4,
    walk: 6,
    run: 6,
    mount: 4,
    dismount: 4,
    attack: 4,
  });

  const idle = resolveMountAnimationState({
    mounted: true,
    flying: false,
    moving: false,
    moveHoldT: 0,
    attacking: false,
    attackFrame: 0,
    transition: 'none',
    animRemaining: 0,
    animMax: 0,
    walkT: 0,
    timeSec: 0.5,
  });
  assert.equal(idle.action, 'idle');
  assert.ok(idle.frame >= 0 && idle.frame < 4);

  const walk = resolveMountAnimationState({
    mounted: true,
    flying: false,
    moving: true,
    moveHoldT: 0.1,
    attacking: false,
    attackFrame: 0,
    transition: 'none',
    animRemaining: 0,
    animMax: 0,
    walkT: 0.25,
    timeSec: 1,
  });
  assert.equal(walk.action, 'walk');
  assert.ok(walk.frame >= 0 && walk.frame < 6);

  const run = resolveMountAnimationState({
    mounted: true,
    flying: false,
    moving: true,
    moveHoldT: MOUNT_RUN_HOLD_SEC + 0.1,
    walkOnly: false,
    attacking: false,
    attackFrame: 0,
    transition: 'none',
    animRemaining: 0,
    animMax: 0,
    walkT: 0.5,
    timeSec: 1.5,
  });
  assert.equal(run.action, 'run');
  assert.ok(run.frame >= 0 && run.frame < 6);

  const forcedWalk = resolveMountAnimationState({
    mounted: true,
    flying: false,
    moving: true,
    moveHoldT: MOUNT_RUN_HOLD_SEC + 1,
    walkOnly: true,
    attacking: false,
    attackFrame: 0,
    transition: 'none',
    animRemaining: 0,
    animMax: 0,
    walkT: 0.5,
    timeSec: 1.5,
  });
  assert.equal(forcedWalk.action, 'walk');

  const mounting = resolveMountAnimationState({
    mounted: true,
    flying: true,
    moving: false,
    moveHoldT: 0,
    attacking: false,
    attackFrame: 0,
    transition: 'mounting',
    animRemaining: MOUNT_TRANSITION_DURATION.mount * 0.5,
    animMax: MOUNT_TRANSITION_DURATION.mount,
    walkT: 0,
    timeSec: 2,
  });
  assert.equal(mounting.action, 'mount');
  assert.ok(mounting.riderArcY < 0); // hop arc lifts rider onto saddle

  const dismounting = resolveMountAnimationState({
    mounted: false,
    flying: true,
    moving: false,
    moveHoldT: 0,
    attacking: false,
    attackFrame: 0,
    transition: 'dismounting',
    animRemaining: MOUNT_TRANSITION_DURATION.dismount * 0.5,
    animMax: MOUNT_TRANSITION_DURATION.dismount,
    walkT: 0,
    timeSec: 2,
  });
  assert.equal(dismounting.action, 'dismount');
  assert.ok(dismounting.riderArcX < 0);
});

test('getMountRiderSeatOffset places rider symmetrically on left/right and leans forward when running', () => {
  for (const def of MOUNT_DEFS) {
    const down = getMountRiderSeatOffset(def.id, 'down', 'idle', 0);
    const up = getMountRiderSeatOffset(def.id, 'up', 'idle', 0);
    const rightIdle = getMountRiderSeatOffset(def.id, 'right', 'idle', 0);
    const leftIdle = getMountRiderSeatOffset(def.id, 'left', 'idle', 0);
    const rightRun = getMountRiderSeatOffset(def.id, 'right', 'run', 1);
    const leftRun = getMountRiderSeatOffset(def.id, 'left', 'run', 1);

    assert.equal(down.x, 0);
    assert.equal(up.x, 0);
    assert.ok(down.y < -8); // elevated on mount saddle above ground
    assert.equal(leftIdle.x, -rightIdle.x);
    assert.equal(leftIdle.y, rightIdle.y);
    assert.ok(rightRun.x > rightIdle.x);
    assert.ok(leftRun.x < leftIdle.x);
    assert.ok(down.legClipRatio > 0.1 && down.legClipRatio < 0.35);
    assert.equal(
      rightRun.y - leftRun.y,
      0,
    );
    assert.equal(getMountAnimFrameBobY('run', 1), -2.0);
  }
});

test('renderHdMountSprite renders distinct 4-way facing for all 9 mounts (front eyes, rear no-eyes, left mirror, speed lines)', async () => {
  const { renderHdMountSprite, getMountBackHeightHd } = await import('./hd-characters');
  const { getMountModelSpec } = await import('./models-2d');

  // Calibrated archetype back heights match mount scale hierarchy
  assert.ok(getMountBackHeightHd('cat') < getMountBackHeightHd('dog'));
  assert.ok(getMountBackHeightHd('dog') < getMountBackHeightHd('turtle'));
  assert.ok(getMountBackHeightHd('horse') < getMountBackHeightHd('elephant'));

  type RecordedOp = { op: string; args: unknown[]; fillStyle?: unknown };
  const makeMockDocument = () => {
    return {
      createElement: () => {
        const ops: RecordedOp[] = [];
        let currentFillStyle: unknown = '';
        let currentStrokeStyle: unknown = '';
        const ctx = {
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high',
          lineJoin: 'round',
          lineCap: 'round',
          lineWidth: 1,
          globalAlpha: 1,
          get fillStyle() {
            return currentFillStyle;
          },
          set fillStyle(v: unknown) {
            currentFillStyle = v;
          },
          get strokeStyle() {
            return currentStrokeStyle;
          },
          set strokeStyle(v: unknown) {
            currentStrokeStyle = v;
          },
          createLinearGradient: () => ({ addColorStop: () => {} }),
          createRadialGradient: () => ({ addColorStop: () => {} }),
          save: () => ops.push({ op: 'save', args: [] }),
          restore: () => ops.push({ op: 'restore', args: [] }),
          translate: (x: number, y: number) => ops.push({ op: 'translate', args: [x, y] }),
          scale: (x: number, y: number) => ops.push({ op: 'scale', args: [x, y] }),
          rotate: (a: number) => ops.push({ op: 'rotate', args: [a] }),
          beginPath: () => {},
          closePath: () => {},
          moveTo: (x: number, y: number) => ops.push({ op: 'moveTo', args: [Math.round(x), Math.round(y)] }),
          lineTo: (x: number, y: number) => ops.push({ op: 'lineTo', args: [Math.round(x), Math.round(y)] }),
          quadraticCurveTo: () => {},
          ellipse: (x: number, y: number, rx: number, ry: number) =>
            ops.push({ op: 'ellipse', args: [Math.round(x), Math.round(y), Math.round(rx), Math.round(ry)] }),
          arc: (x: number, y: number, r: number) =>
            ops.push({ op: 'arc', args: [Math.round(x), Math.round(y), Math.round(r)] }),
          roundRect: (x: number, y: number, w: number, h: number) =>
            ops.push({ op: 'roundRect', args: [Math.round(x), Math.round(y), Math.round(w), Math.round(h)] }),
          fillRect: (x: number, y: number, w: number, h: number) =>
            ops.push({ op: 'fillRect', args: [Math.round(x), Math.round(y), Math.round(w), Math.round(h)], fillStyle: currentFillStyle }),
          fill: () => ops.push({ op: 'fill', args: [], fillStyle: currentFillStyle }),
          stroke: () => ops.push({ op: 'stroke', args: [], fillStyle: currentStrokeStyle }),
        };
        return {
          width: 0,
          height: 0,
          dataset: {} as Record<string, string>,
          _ops: ops,
          getContext: () => ctx,
        };
      },
    };
  };

  const prevDoc = (globalThis as { document?: unknown }).document;
  (globalThis as { document?: unknown }).document = makeMockDocument();
  try {
    for (const def of MOUNT_DEFS) {
      const spec = getMountModelSpec(def.id);
      const downCanvas = renderHdMountSprite(spec, 'down', 'run', 1, 1) as unknown as { _ops: RecordedOp[] };
      const upCanvas = renderHdMountSprite(spec, 'up', 'run', 1, 1) as unknown as { _ops: RecordedOp[] };
      const rightCanvas = renderHdMountSprite(spec, 'right', 'run', 1, 1) as unknown as { _ops: RecordedOp[] };
      const leftCanvas = renderHdMountSprite(spec, 'left', 'run', 1, 1) as unknown as { _ops: RecordedOp[] };

      // 1) Front view draws 2 expressive eyes; rear view draws 0 eyes
      const downEyes = downCanvas._ops.filter((o) => o.op === 'fill' && o.fillStyle === '#fff9f5');
      const upEyes = upCanvas._ops.filter((o) => o.op === 'fill' && o.fillStyle === '#fff9f5');
      assert.equal(downEyes.length, 2, `${def.id} down should draw 2 eyes`);
      assert.equal(upEyes.length, 0, `${def.id} up should draw 0 eyes`);

      // 2) Down and Up traces must clearly differ
      assert.notDeepEqual(
        downCanvas._ops.map((o) => [o.op, ...o.args]),
        upCanvas._ops.map((o) => [o.op, ...o.args]),
        `${def.id} up and down geometry must differ`,
      );

      // 3) Left mirrors horizontally while Right does not
      const leftScale = leftCanvas._ops.find((o) => o.op === 'scale');
      const rightScale = rightCanvas._ops.find((o) => o.op === 'scale');
      assert.deepEqual(leftScale?.args, [-1, 1], `${def.id} left should scale(-1, 1)`);
      assert.equal(rightScale, undefined, `${def.id} right should not mirror`);

      // 4) Run action emits speed lines in all 4 directions
      for (const [dName, cvs] of [
        ['down', downCanvas],
        ['up', upCanvas],
        ['right', rightCanvas],
        ['left', leftCanvas],
      ] as const) {
        const speedStrokes = cvs._ops.filter(
          (o) => o.op === 'stroke' && o.fillStyle === 'rgba(255,255,255,0.9)',
        );
        assert.ok(speedStrokes.length >= 2, `${def.id} ${dName} run should draw speed lines`);
      }
    }
  } finally {
    (globalThis as { document?: unknown }).document = prevDoc;
  }
});
