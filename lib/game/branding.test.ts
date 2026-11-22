import test from 'node:test'
import assert from 'node:assert/strict'
import { ITEMS } from './data'
import { ASURA_SOUL_CATEGORIES, PREMIUM_CATALOG } from './premium/catalog'
import { CHEST_TIERS } from './treasure-chest'

const FORBIDDEN_BRAND_RE = /lumivara|อสุรา|\basura\b/i

test('player-facing items contain no legacy Lumivara or Asura branding while preserving save IDs', () => {
  for (const item of Object.values(ITEMS)) {
    assert.equal(
      FORBIDDEN_BRAND_RE.test(item.name),
      false,
      `Item ${item.id} name contains forbidden branding: ${item.name}`,
    )
    assert.equal(
      FORBIDDEN_BRAND_RE.test(item.description ?? ''),
      false,
      `Item ${item.id} description contains forbidden branding: ${item.description}`,
    )
  }

  // Verify backward-compatible save IDs and Pixel Quest display names
  assert.equal(ITEMS.lv100_mythic_asura_sovereign?.name, 'ดาบเทพราชันย์ Pixel Quest')
  assert.equal(ITEMS.mythic_asura_crown?.name, 'มงกุฎเทพ Pixel Quest นิรันดร์')
  assert.equal(ITEMS.companion_gacha_box?.name, 'กล่องสุ่มคู่หู Pixel Quest')
  assert.ok(ITEMS.asura_exp_50)
})

test('treasure chests and premium shop catalog contain no legacy Lumivara or Asura branding', () => {
  for (const chest of Object.values(CHEST_TIERS)) {
    assert.equal(FORBIDDEN_BRAND_RE.test(chest.name), false, `Chest ${chest.id} name: ${chest.name}`)
    assert.equal(
      FORBIDDEN_BRAND_RE.test(chest.subtitle),
      false,
      `Chest ${chest.id} subtitle: ${chest.subtitle}`,
    )
  }
  assert.equal(CHEST_TIERS.mythic.name, 'หีบสมบัติเทพ Pixel Quest')

  for (const product of PREMIUM_CATALOG) {
    assert.equal(
      FORBIDDEN_BRAND_RE.test(product.name),
      false,
      `Product ${product.productId} name: ${product.name}`,
    )
    assert.equal(
      FORBIDDEN_BRAND_RE.test(product.description),
      false,
      `Product ${product.productId} description: ${product.description}`,
    )
  }

  for (const cat of ASURA_SOUL_CATEGORIES) {
    assert.equal(FORBIDDEN_BRAND_RE.test(cat.label), false, `Category ${cat.id} label: ${cat.label}`)
  }
})
