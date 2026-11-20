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
