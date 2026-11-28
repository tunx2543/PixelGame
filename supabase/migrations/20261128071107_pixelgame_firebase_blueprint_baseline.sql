-- PixelGame Firebase blueprint baseline for Supabase.
-- Additive only: does not drop or overwrite existing objects or migrate player data.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public."user_profile" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "uid" text not null,
  "email" text not null,
  "displayName" text not null,
  "gameUid" text not null,
  "role" text not null check ("role" in ('gm','player')),
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."user_profile" enable row level security;

revoke all on table public."user_profile" from anon, authenticated;

grant all on table public."user_profile" to service_role;

create table if not exists public."character_save" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "id" text not null,
  "ownerId" text not null,
  "name" text not null,
  "jobId" text not null,
  "level" bigint not null,
  "exp" bigint not null,
  "hp" bigint not null,
  "mp" bigint not null,
  "gold" bigint not null,
  "diamonds" bigint not null,
  "mapId" text not null,
  "playTime" double precision not null,
  "saveData" jsonb not null,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."character_save" enable row level security;

revoke all on table public."character_save" from anon, authenticated;

grant all on table public."character_save" to service_role;

create table if not exists public."daily_mission_board" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "dateKey" text not null,
  "ownerId" text not null,
  "missions" jsonb not null,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."daily_mission_board" enable row level security;

revoke all on table public."daily_mission_board" from anon, authenticated;

grant all on table public."daily_mission_board" to service_role;

create table if not exists public."player_uid_directory" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "gameUid" text not null,
  "ownerId" text not null,
  "displayName" text not null,
  "characterName" text not null,
  "level" bigint not null,
  "jobId" text not null,
  "isGm" boolean not null,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."player_uid_directory" enable row level security;

revoke all on table public."player_uid_directory" from anon, authenticated;

grant all on table public."player_uid_directory" to service_role;

create table if not exists public."friend_request" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "requestId" text not null,
  "fromUid" text not null,
  "toUid" text not null,
  "fromGameUid" text not null,
  "toGameUid" text not null,
  "fromName" text not null,
  "toName" text not null,
  "fromIsGm" boolean not null,
  "toIsGm" boolean not null,
  "status" text not null check ("status" in ('pending','accepted','declined')),
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."friend_request" enable row level security;

revoke all on table public."friend_request" from anon, authenticated;

grant all on table public."friend_request" to service_role;

create table if not exists public."world_presence" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "userId" text not null,
  "gameUid" text not null,
  "uid" bigint not null,
  "displayName" text not null,
  "jobId" text not null,
  "mapId" text not null,
  "x" double precision not null,
  "y" double precision not null,
  "level" bigint not null,
  "gm" boolean not null,
  "facing" text not null check ("facing" in ('up','down','left','right')),
  "moving" boolean not null,
  "status" text not null check ("status" in ('town','idle','moving','combat')),
  "attackAnim" double precision not null,
  "invisible" boolean not null,
  "heartbeatMs" bigint not null,
  "updatedAt" timestamptz not null,
  "rebirthCount" bigint check ("rebirthCount" >= 0) check ("rebirthCount" <= 6),
  "vipLevel" bigint check ("vipLevel" >= 0) check ("vipLevel" <= 5),
  "activeTitle" text,
  "guildTag" text,
  "weaponType" text check ("weaponType" in ('stick','sword','staff','bow','dagger')),
  "weaponColor" text,
  "petId" text,
  "mountId" text,
  "mountSkinId" text,
  "fashionCostume" text,
  "fashionHair" text,
  "fashionAura" text,
  "fashionWings" text,
  "cosmeticWing" text,
  "weaponSkinId" text,
  "gemFashionId" text,
  "nameColor" text,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."world_presence" enable row level security;

revoke all on table public."world_presence" from anon, authenticated;

grant all on table public."world_presence" to service_role;

create table if not exists public."party" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "partyId" text not null,
  "name" text not null,
  "leaderId" text not null,
  "memberIds" jsonb not null,
  "members" jsonb not null,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."party" enable row level security;

revoke all on table public."party" from anon, authenticated;

grant all on table public."party" to service_role;

create table if not exists public."party_invite" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "inviteId" text not null,
  "partyId" text not null,
  "partyName" text not null,
  "fromUid" text not null,
  "toUid" text not null,
  "fromGameUid" text not null,
  "toGameUid" text not null,
  "fromName" text not null,
  "toName" text not null,
  "fromIsGm" boolean not null,
  "status" text not null check ("status" in ('pending','accepted','declined')),
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."party_invite" enable row level security;

revoke all on table public."party_invite" from anon, authenticated;

grant all on table public."party_invite" to service_role;

create table if not exists public."guild" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "guildId" text not null,
  "name" text not null,
  "tag" text not null,
  "leaderId" text not null,
  "leaderName" text not null,
  "level" bigint not null check ("level" >= 1) check ("level" <= 50),
  "exp" bigint not null check ("exp" >= 0),
  "totalDonatedGold" bigint not null check ("totalDonatedGold" >= 0),
  "memberIds" jsonb not null,
  "memberCount" bigint not null check ("memberCount" >= 1) check ("memberCount" <= 30),
  "notice" text not null,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."guild" enable row level security;

revoke all on table public."guild" from anon, authenticated;

grant all on table public."guild" to service_role;

create table if not exists public."leaderboard_hero" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "userId" text not null,
  "gameUid" text not null,
  "name" text not null,
  "jobId" text not null,
  "level" bigint not null check ("level" >= 1) check ("level" <= 999),
  "rebirthCount" bigint not null check ("rebirthCount" >= 0) check ("rebirthCount" <= 6),
  "combatPower" bigint not null check ("combatPower" >= 1),
  "arenaRating" bigint not null check ("arenaRating" >= 100) check ("arenaRating" <= 9999),
  "arenaWins" bigint not null check ("arenaWins" >= 0),
  "highestTowerFloor" bigint not null check ("highestTowerFloor" >= 0),
  "activeTitle" text,
  "guildName" text,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."leaderboard_hero" enable row level security;

revoke all on table public."leaderboard_hero" from anon, authenticated;

grant all on table public."leaderboard_hero" to service_role;

create table if not exists public."world_boss_raid" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "cycleKey" text not null,
  "bossId" text not null,
  "name" text not null,
  "maxHp" bigint not null check ("maxHp" >= 1000),
  "currentHp" bigint not null check ("currentHp" >= 0),
  "totalDamageDealt" bigint not null check ("totalDamageDealt" >= 0),
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."world_boss_raid" enable row level security;

revoke all on table public."world_boss_raid" from anon, authenticated;

grant all on table public."world_boss_raid" to service_role;

create table if not exists public."world_boss_contribution" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "userId" text not null,
  "name" text not null,
  "jobId" text not null,
  "level" bigint not null check ("level" >= 1) check ("level" <= 999),
  "damage" bigint not null check ("damage" >= 0),
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."world_boss_contribution" enable row level security;

revoke all on table public."world_boss_contribution" from anon, authenticated;

grant all on table public."world_boss_contribution" to service_role;

create table if not exists public."guild_message" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "messageId" text not null,
  "senderUid" text not null,
  "senderName" text not null,
  "senderGameUid" text not null,
  "jobId" text not null,
  "text" text not null,
  "createdAtMs" bigint not null check ("createdAtMs" >= 0),
  "createdAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."guild_message" enable row level security;

revoke all on table public."guild_message" from anon, authenticated;

grant all on table public."guild_message" to service_role;

create table if not exists public."guild_raid" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "raidId" text not null,
  "guildId" text not null,
  "bossName" text not null,
  "level" bigint not null check ("level" >= 1) check ("level" <= 999),
  "maxHp" bigint not null check ("maxHp" >= 1000),
  "currentHp" bigint not null check ("currentHp" >= 0),
  "clears" bigint not null check ("clears" >= 0),
  "lastHitter" text not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."guild_raid" enable row level security;

revoke all on table public."guild_raid" from anon, authenticated;

grant all on table public."guild_raid" to service_role;

create table if not exists public."market_listing" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "listingId" text not null,
  "sellerUid" text not null,
  "sellerName" text not null,
  "sellerGameUid" text not null,
  "itemId" text not null,
  "itemName" text not null,
  "kind" text not null,
  "qty" bigint not null check ("qty" >= 1) check ("qty" <= 999),
  "plus" bigint not null check ("plus" >= 0) check ("plus" <= 20),
  "priceGold" bigint not null check ("priceGold" >= 1) check ("priceGold" <= 100000000),
  "status" text not null check ("status" in ('open','sold','cancelled')),
  "buyerUid" text,
  "buyerName" text,
  "sellerClaimed" boolean,
  "rarity" text,
  "affixes" jsonb,
  "createdAtMs" bigint not null check ("createdAtMs" >= 0),
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."market_listing" enable row level security;

revoke all on table public."market_listing" from anon, authenticated;

grant all on table public."market_listing" to service_role;

create table if not exists public."mail_message" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "mailId" text not null,
  "senderUid" text not null,
  "senderName" text not null,
  "senderGameUid" text not null,
  "subject" text not null,
  "body" text not null,
  "gold" bigint not null check ("gold" >= 0) check ("gold" <= 10000000),
  "diamonds" bigint not null check ("diamonds" >= 0) check ("diamonds" <= 100000),
  "itemId" text,
  "qty" bigint not null check ("qty" >= 0) check ("qty" <= 999),
  "plus" bigint not null check ("plus" >= 0) check ("plus" <= 20),
  "claimed" boolean not null,
  "createdAtMs" bigint not null check ("createdAtMs" >= 0),
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."mail_message" enable row level security;

revoke all on table public."mail_message" from anon, authenticated;

grant all on table public."mail_message" to service_role;

create table if not exists public."party_coop" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "coopId" text not null,
  "partyId" text not null,
  "dungeonName" text not null,
  "bossName" text not null,
  "level" bigint not null check ("level" >= 1) check ("level" <= 999),
  "maxHp" bigint not null check ("maxHp" >= 1000),
  "currentHp" bigint not null check ("currentHp" >= 0),
  "clears" bigint not null check ("clears" >= 0),
  "participants" jsonb not null,
  "lastHitter" text not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."party_coop" enable row level security;

revoke all on table public."party_coop" from anon, authenticated;

grant all on table public."party_coop" to service_role;

create table if not exists public."world_chat_message" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "messageId" text not null,
  "channel" text not null check ("channel" in ('world','map','party','trade')),
  "mapId" text not null,
  "partyId" text,
  "senderUid" text not null,
  "senderName" text not null,
  "senderGameUid" text not null,
  "jobId" text not null,
  "isGm" boolean not null,
  "text" text not null,
  "createdAtMs" bigint not null check ("createdAtMs" >= 0),
  "createdAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."world_chat_message" enable row level security;

revoke all on table public."world_chat_message" from anon, authenticated;

grant all on table public."world_chat_message" to service_role;

create table if not exists public."whisper_message" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "whisperId" text not null,
  "fromUid" text not null,
  "toUid" text not null,
  "fromGameUid" text not null,
  "toGameUid" text not null,
  "fromName" text not null,
  "toName" text not null,
  "body" text not null,
  "createdAtMs" bigint not null check ("createdAtMs" >= 0),
  "createdAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."whisper_message" enable row level security;

revoke all on table public."whisper_message" from anon, authenticated;

grant all on table public."whisper_message" to service_role;

create table if not exists public."trade_session" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "tradeId" text not null,
  "status" text not null check ("status" in ('pending','active','completed','declined','cancelled')),
  "senderUid" text not null,
  "recipientUid" text not null,
  "senderGameUid" text not null,
  "recipientGameUid" text not null,
  "senderName" text not null,
  "recipientName" text not null,
  "senderItems" jsonb not null,
  "recipientItems" jsonb not null,
  "senderGold" bigint not null check ("senderGold" >= 0) check ("senderGold" <= 100000000),
  "recipientGold" bigint not null check ("recipientGold" >= 0) check ("recipientGold" <= 100000000),
  "senderGemItems" jsonb not null,
  "recipientGemItems" jsonb not null,
  "senderReady" boolean not null,
  "recipientReady" boolean not null,
  "createdAtMs" bigint not null check ("createdAtMs" >= 0),
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."trade_session" enable row level security;

revoke all on table public."trade_session" from anon, authenticated;

grant all on table public."trade_session" to service_role;

create table if not exists public."party_listing" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "listingId" text not null,
  "partyId" text not null,
  "partyName" text not null,
  "leaderUid" text not null,
  "leaderName" text not null,
  "leaderGameUid" text not null,
  "leaderJobId" text not null,
  "targetActivity" text not null,
  "minLevel" bigint not null check ("minLevel" >= 1) check ("minLevel" <= 999),
  "memberCount" bigint not null check ("memberCount" >= 1) check ("memberCount" <= 4),
  "maxMembers" bigint not null check ("maxMembers" >= 2) check ("maxMembers" <= 4),
  "status" text not null check ("status" in ('open','closed')),
  "createdAtMs" bigint not null check ("createdAtMs" >= 0),
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."party_listing" enable row level security;

revoke all on table public."party_listing" from anon, authenticated;

grant all on table public."party_listing" to service_role;

create table if not exists public."field_boss" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "mapId" text not null,
  "bossId" text not null,
  "bossName" text not null,
  "level" bigint not null check ("level" >= 1) check ("level" <= 999),
  "maxHp" bigint not null check ("maxHp" >= 1000),
  "currentHp" bigint not null check ("currentHp" >= 0),
  "defeatedAtMs" bigint not null check ("defeatedAtMs" >= 0),
  "respawnAtMs" bigint not null check ("respawnAtMs" >= 0),
  "lastHitter" text not null,
  "clearCount" bigint not null check ("clearCount" >= 0),
  "contributors" jsonb not null,
  "claimedUids" jsonb not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."field_boss" enable row level security;

revoke all on table public."field_boss" from anon, authenticated;

grant all on table public."field_boss" to service_role;

create table if not exists public."duel_match" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "duelId" text not null,
  "status" text not null check ("status" in ('pending','active','completed','declined','cancelled')),
  "challengerUid" text not null,
  "opponentUid" text not null,
  "challengerName" text not null,
  "opponentName" text not null,
  "challengerGameUid" text not null,
  "opponentGameUid" text not null,
  "turnNumber" bigint not null check ("turnNumber" >= 1) check ("turnNumber" <= 999),
  "activeTurnUid" text not null,
  "fighters" jsonb not null,
  "logs" jsonb not null,
  "winnerUid" text,
  "createdAtMs" bigint not null check ("createdAtMs" >= 0),
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."duel_match" enable row level security;

revoke all on table public."duel_match" from anon, authenticated;

grant all on table public."duel_match" to service_role;

create table if not exists public."player_report" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "reportId" text not null,
  "reporterUid" text not null,
  "targetUid" text not null,
  "targetGameUid" text not null,
  "targetName" text not null,
  "reason" text not null,
  "details" text not null,
  "createdAtMs" bigint not null check ("createdAtMs" >= 0),
  "createdAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."player_report" enable row level security;

revoke all on table public."player_report" from anon, authenticated;

grant all on table public."player_report" to service_role;

create table if not exists public."diamond_transaction" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "txId" text not null,
  "requestId" text not null,
  "ownerId" text not null,
  "characterId" text not null,
  "type" text not null check ("type" in ('earn','spend','sandbox_grant','refund')),
  "source" text not null,
  "amount" bigint not null check ("amount" >= 0) check ("amount" <= 1000000000),
  "balanceBefore" bigint not null check ("balanceBefore" >= 0) check ("balanceBefore" <= 1000000000),
  "balanceAfter" bigint not null check ("balanceAfter" >= 0) check ("balanceAfter" <= 1000000000),
  "productId" text,
  "itemId" text,
  "note" text not null,
  "actorUid" text not null,
  "isGm" boolean not null,
  "serverVerified" boolean not null,
  "serverSignature" text,
  "createdAtMs" bigint not null check ("createdAtMs" >= 0),
  "createdAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."diamond_transaction" enable row level security;

revoke all on table public."diamond_transaction" from anon, authenticated;

grant all on table public."diamond_transaction" to service_role;

create table if not exists public."premium_audit_log" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "logId" text not null,
  "ownerId" text not null,
  "characterId" text not null,
  "action" text not null,
  "actorUid" text not null,
  "actorRole" text not null check ("actorRole" in ('gm','player')),
  "txId" text,
  "details" text not null,
  "verifiedByServer" boolean not null,
  "createdAtMs" bigint not null check ("createdAtMs" >= 0),
  "createdAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."premium_audit_log" enable row level security;

revoke all on table public."premium_audit_log" from anon, authenticated;

grant all on table public."premium_audit_log" to service_role;

create table if not exists public."topup_order" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "orderId" text not null,
  "ownerId" text not null,
  "characterId" text not null,
  "packageId" text not null,
  "packageName" text not null,
  "provider" text not null check ("provider" in ('stripe_promptpay','stripe_checkout','promptpay_slip','promptpay_manual_gm')),
  "gatewayRef" text not null,
  "amountThb" bigint not null check ("amountThb" >= 1) check ("amountThb" <= 100000),
  "baseDiamonds" bigint not null check ("baseDiamonds" >= 1) check ("baseDiamonds" <= 1000000),
  "bonusDiamonds" bigint not null check ("bonusDiamonds" >= 0) check ("bonusDiamonds" <= 1000000),
  "totalDiamonds" bigint not null check ("totalDiamonds" >= 1) check ("totalDiamonds" <= 2000000),
  "vipExpGranted" bigint not null check ("vipExpGranted" >= 0) check ("vipExpGranted" <= 100000),
  "status" text not null check ("status" in ('credited')),
  "txId" text not null,
  "serverVerified" boolean not null,
  "serverSignature" text,
  "createdAtMs" bigint not null check ("createdAtMs" >= 0),
  "createdAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."topup_order" enable row level security;

revoke all on table public."topup_order" from anon, authenticated;

grant all on table public."topup_order" to service_role;

create table if not exists public."prompt_pay_shop_settings" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "settingId" text not null check ("settingId" in ('promptpay')),
  "promptPayId" text not null,
  "accountName" text not null,
  "customQrDataUrl" text,
  "enabled" boolean not null,
  "updatedByUid" text not null,
  "createdAtMs" bigint not null check ("createdAtMs" >= 0),
  "updatedAtMs" bigint not null check ("updatedAtMs" >= 0),
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."prompt_pay_shop_settings" enable row level security;

revoke all on table public."prompt_pay_shop_settings" from anon, authenticated;

grant all on table public."prompt_pay_shop_settings" to service_role;

create table if not exists public."topup_slip_request" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "requestId" text not null,
  "ownerId" text not null,
  "ownerEmail" text not null,
  "playerName" text not null,
  "gameUid" text not null,
  "characterId" text not null,
  "packageId" text not null,
  "packageName" text not null,
  "amountThb" bigint not null check ("amountThb" >= 1) check ("amountThb" <= 100000),
  "baseDiamonds" bigint not null check ("baseDiamonds" >= 1) check ("baseDiamonds" <= 1000000),
  "bonusDiamonds" bigint not null check ("bonusDiamonds" >= 0) check ("bonusDiamonds" <= 1000000),
  "totalDiamonds" bigint not null check ("totalDiamonds" >= 1) check ("totalDiamonds" <= 2000000),
  "vipExpGranted" bigint not null check ("vipExpGranted" >= 0) check ("vipExpGranted" <= 100000),
  "slipDataUrl" text not null,
  "slipNote" text not null,
  "status" text not null check ("status" in ('pending','approved','rejected')),
  "claimed" boolean not null,
  "claimedAtMs" bigint check ("claimedAtMs" >= 0),
  "reviewedByUid" text,
  "reviewNote" text,
  "slipHash" text,
  "createdAtMs" bigint not null check ("createdAtMs" >= 0),
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."topup_slip_request" enable row level security;

revoke all on table public."topup_slip_request" from anon, authenticated;

grant all on table public."topup_slip_request" to service_role;

create table if not exists public."world_announcement" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "announcementId" text not null,
  "authorUid" text not null,
  "authorName" text not null,
  "authorGameUid" text not null,
  "body" text not null,
  "createdAtMs" bigint not null check ("createdAtMs" >= 0),
  "expiresAtMs" bigint not null check ("expiresAtMs" >= 0),
  "createdAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."world_announcement" enable row level security;

revoke all on table public."world_announcement" from anon, authenticated;

grant all on table public."world_announcement" to service_role;

create table if not exists public."gm_directive" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "directiveId" text not null,
  "action" text not null check ("action" in ('summon','mute','unmute','kick')),
  "fromUid" text not null,
  "fromName" text not null,
  "fromGameUid" text not null,
  "targetUid" text not null,
  "targetGameUid" text not null,
  "targetName" text not null,
  "mapId" text not null,
  "x" double precision not null,
  "y" double precision not null,
  "durationMin" bigint not null check ("durationMin" >= 0) check ("durationMin" <= 1440),
  "reason" text not null,
  "createdAtMs" bigint not null check ("createdAtMs" >= 0),
  "consumed" boolean not null,
  "consumedAtMs" bigint check ("consumedAtMs" >= 0),
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."gm_directive" enable row level security;

revoke all on table public."gm_directive" from anon, authenticated;

grant all on table public."gm_directive" to service_role;

create table if not exists public."server_gift_drop" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "dropId" text not null,
  "authorUid" text not null,
  "authorName" text not null,
  "authorGameUid" text not null,
  "subject" text not null,
  "body" text not null,
  "gold" bigint not null check ("gold" >= 0) check ("gold" <= 10000000),
  "diamonds" bigint not null check ("diamonds" >= 0) check ("diamonds" <= 100000),
  "itemId" text,
  "qty" bigint not null check ("qty" >= 0) check ("qty" <= 999),
  "plus" bigint not null check ("plus" >= 0) check ("plus" <= 20),
  "createdAtMs" bigint not null check ("createdAtMs" >= 0),
  "expiresAtMs" bigint not null check ("expiresAtMs" >= 0),
  "createdAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."server_gift_drop" enable row level security;

revoke all on table public."server_gift_drop" from anon, authenticated;

grant all on table public."server_gift_drop" to service_role;

create table if not exists public."redeem_code" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "code" text not null,
  "label" text not null,
  "gold" bigint not null check ("gold" >= 0) check ("gold" <= 10000000),
  "diamonds" bigint not null check ("diamonds" >= 0) check ("diamonds" <= 100000),
  "itemId" text,
  "qty" bigint not null check ("qty" >= 0) check ("qty" <= 99),
  "plus" bigint not null check ("plus" >= 0) check ("plus" <= 15),
  "vipExp" bigint not null check ("vipExp" >= 0) check ("vipExp" <= 50000),
  "maxUses" bigint not null check ("maxUses" >= 1) check ("maxUses" <= 100000),
  "usedCount" bigint not null check ("usedCount" >= 0) check ("usedCount" <= 100000),
  "active" boolean not null,
  "expiresAtMs" bigint check ("expiresAtMs" >= 0),
  "createdByUid" text not null,
  "createdAtMs" bigint not null check ("createdAtMs" >= 0),
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."redeem_code" enable row level security;

revoke all on table public."redeem_code" from anon, authenticated;

grant all on table public."redeem_code" to service_role;

create table if not exists public."redeem_claim" (
  document_id text primary key default (extensions.gen_random_uuid()::text),
  "uid" text not null,
  "code" text not null,
  "characterId" text not null,
  "playerName" text not null,
  "gameUid" text not null,
  "claimedAtMs" bigint not null check ("claimedAtMs" >= 0),
  "createdAt" timestamptz not null,
  _created_at timestamptz not null default now(),
  _updated_at timestamptz not null default now()
);

alter table public."redeem_claim" enable row level security;

revoke all on table public."redeem_claim" from anon, authenticated;

grant all on table public."redeem_claim" to service_role;

create index if not exists "user_profile_uid_idx" on public."user_profile" ("uid");

create index if not exists "user_profile_created_at_idx" on public."user_profile" ("createdAt");

create index if not exists "user_profile_game_uid_idx" on public."user_profile" ("gameUid");

create index if not exists "character_save_owner_id_idx" on public."character_save" ("ownerId");

create index if not exists "character_save_map_id_idx" on public."character_save" ("mapId");

create index if not exists "character_save_created_at_idx" on public."character_save" ("createdAt");

create index if not exists "daily_mission_board_owner_id_idx" on public."daily_mission_board" ("ownerId");

create index if not exists "daily_mission_board_created_at_idx" on public."daily_mission_board" ("createdAt");

create index if not exists "player_uid_directory_owner_id_idx" on public."player_uid_directory" ("ownerId");

create index if not exists "player_uid_directory_created_at_idx" on public."player_uid_directory" ("createdAt");

create index if not exists "player_uid_directory_game_uid_idx" on public."player_uid_directory" ("gameUid");

create index if not exists "friend_request_from_uid_idx" on public."friend_request" ("fromUid");

create index if not exists "friend_request_to_uid_idx" on public."friend_request" ("toUid");

create index if not exists "friend_request_status_idx" on public."friend_request" ("status");

create index if not exists "friend_request_created_at_idx" on public."friend_request" ("createdAt");

create index if not exists "world_presence_user_id_idx" on public."world_presence" ("userId");

create index if not exists "world_presence_uid_idx" on public."world_presence" ("uid");

create index if not exists "world_presence_status_idx" on public."world_presence" ("status");

create index if not exists "world_presence_map_id_idx" on public."world_presence" ("mapId");

create index if not exists "world_presence_game_uid_idx" on public."world_presence" ("gameUid");

create index if not exists "party_created_at_idx" on public."party" ("createdAt");

create index if not exists "party_party_id_idx" on public."party" ("partyId");

create index if not exists "party_invite_from_uid_idx" on public."party_invite" ("fromUid");

create index if not exists "party_invite_to_uid_idx" on public."party_invite" ("toUid");

create index if not exists "party_invite_status_idx" on public."party_invite" ("status");

create index if not exists "party_invite_created_at_idx" on public."party_invite" ("createdAt");

create index if not exists "party_invite_party_id_idx" on public."party_invite" ("partyId");

create index if not exists "guild_created_at_idx" on public."guild" ("createdAt");

create index if not exists "guild_guild_id_idx" on public."guild" ("guildId");

create index if not exists "leaderboard_hero_user_id_idx" on public."leaderboard_hero" ("userId");

create index if not exists "leaderboard_hero_game_uid_idx" on public."leaderboard_hero" ("gameUid");

create index if not exists "world_boss_contribution_user_id_idx" on public."world_boss_contribution" ("userId");

create index if not exists "guild_message_created_at_ms_idx" on public."guild_message" ("createdAtMs");

create index if not exists "guild_message_created_at_idx" on public."guild_message" ("createdAt");

create index if not exists "guild_raid_guild_id_idx" on public."guild_raid" ("guildId");

create index if not exists "market_listing_status_idx" on public."market_listing" ("status");

create index if not exists "market_listing_created_at_ms_idx" on public."market_listing" ("createdAtMs");

create index if not exists "market_listing_created_at_idx" on public."market_listing" ("createdAt");

create index if not exists "mail_message_created_at_ms_idx" on public."mail_message" ("createdAtMs");

create index if not exists "mail_message_created_at_idx" on public."mail_message" ("createdAt");

create index if not exists "party_coop_party_id_idx" on public."party_coop" ("partyId");

create index if not exists "world_chat_message_map_id_idx" on public."world_chat_message" ("mapId");

create index if not exists "world_chat_message_created_at_ms_idx" on public."world_chat_message" ("createdAtMs");

create index if not exists "world_chat_message_created_at_idx" on public."world_chat_message" ("createdAt");

create index if not exists "world_chat_message_party_id_idx" on public."world_chat_message" ("partyId");

create index if not exists "whisper_message_from_uid_idx" on public."whisper_message" ("fromUid");

create index if not exists "whisper_message_to_uid_idx" on public."whisper_message" ("toUid");

create index if not exists "whisper_message_created_at_ms_idx" on public."whisper_message" ("createdAtMs");

create index if not exists "whisper_message_created_at_idx" on public."whisper_message" ("createdAt");

create index if not exists "trade_session_status_idx" on public."trade_session" ("status");

create index if not exists "trade_session_created_at_ms_idx" on public."trade_session" ("createdAtMs");

create index if not exists "trade_session_created_at_idx" on public."trade_session" ("createdAt");

create index if not exists "party_listing_status_idx" on public."party_listing" ("status");

create index if not exists "party_listing_created_at_ms_idx" on public."party_listing" ("createdAtMs");

create index if not exists "party_listing_created_at_idx" on public."party_listing" ("createdAt");

create index if not exists "party_listing_party_id_idx" on public."party_listing" ("partyId");

create index if not exists "field_boss_map_id_idx" on public."field_boss" ("mapId");

create index if not exists "duel_match_status_idx" on public."duel_match" ("status");

create index if not exists "duel_match_created_at_ms_idx" on public."duel_match" ("createdAtMs");

create index if not exists "duel_match_created_at_idx" on public."duel_match" ("createdAt");

create index if not exists "player_report_created_at_ms_idx" on public."player_report" ("createdAtMs");

create index if not exists "player_report_created_at_idx" on public."player_report" ("createdAt");

create index if not exists "diamond_transaction_owner_id_idx" on public."diamond_transaction" ("ownerId");

create index if not exists "diamond_transaction_created_at_ms_idx" on public."diamond_transaction" ("createdAtMs");

create index if not exists "diamond_transaction_created_at_idx" on public."diamond_transaction" ("createdAt");

create index if not exists "diamond_transaction_character_id_idx" on public."diamond_transaction" ("characterId");

create index if not exists "premium_audit_log_owner_id_idx" on public."premium_audit_log" ("ownerId");

create index if not exists "premium_audit_log_created_at_ms_idx" on public."premium_audit_log" ("createdAtMs");

create index if not exists "premium_audit_log_created_at_idx" on public."premium_audit_log" ("createdAt");

create index if not exists "premium_audit_log_character_id_idx" on public."premium_audit_log" ("characterId");

create index if not exists "topup_order_owner_id_idx" on public."topup_order" ("ownerId");

create index if not exists "topup_order_status_idx" on public."topup_order" ("status");

create index if not exists "topup_order_created_at_ms_idx" on public."topup_order" ("createdAtMs");

create index if not exists "topup_order_created_at_idx" on public."topup_order" ("createdAt");

create index if not exists "topup_order_character_id_idx" on public."topup_order" ("characterId");

create index if not exists "prompt_pay_shop_settings_created_at_ms_idx" on public."prompt_pay_shop_settings" ("createdAtMs");

create index if not exists "prompt_pay_shop_settings_created_at_idx" on public."prompt_pay_shop_settings" ("createdAt");

create index if not exists "topup_slip_request_owner_id_idx" on public."topup_slip_request" ("ownerId");

create index if not exists "topup_slip_request_status_idx" on public."topup_slip_request" ("status");

create index if not exists "topup_slip_request_created_at_ms_idx" on public."topup_slip_request" ("createdAtMs");

create index if not exists "topup_slip_request_created_at_idx" on public."topup_slip_request" ("createdAt");

create index if not exists "topup_slip_request_game_uid_idx" on public."topup_slip_request" ("gameUid");

create index if not exists "topup_slip_request_character_id_idx" on public."topup_slip_request" ("characterId");

create index if not exists "world_announcement_created_at_ms_idx" on public."world_announcement" ("createdAtMs");

create index if not exists "world_announcement_created_at_idx" on public."world_announcement" ("createdAt");

create index if not exists "gm_directive_from_uid_idx" on public."gm_directive" ("fromUid");

create index if not exists "gm_directive_map_id_idx" on public."gm_directive" ("mapId");

create index if not exists "gm_directive_created_at_ms_idx" on public."gm_directive" ("createdAtMs");

create index if not exists "gm_directive_created_at_idx" on public."gm_directive" ("createdAt");

create index if not exists "server_gift_drop_created_at_ms_idx" on public."server_gift_drop" ("createdAtMs");

create index if not exists "server_gift_drop_created_at_idx" on public."server_gift_drop" ("createdAt");

create index if not exists "redeem_code_created_at_ms_idx" on public."redeem_code" ("createdAtMs");

create index if not exists "redeem_code_created_at_idx" on public."redeem_code" ("createdAt");

create index if not exists "redeem_claim_uid_idx" on public."redeem_claim" ("uid");

create index if not exists "redeem_claim_created_at_idx" on public."redeem_claim" ("createdAt");

create index if not exists "redeem_claim_game_uid_idx" on public."redeem_claim" ("gameUid");

create index if not exists "redeem_claim_character_id_idx" on public."redeem_claim" ("characterId");