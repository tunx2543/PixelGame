# Pixel Quest BGM Audio Directory

วางไฟล์เสียงประกอบเกม (รูปแบบ `.ogg` หรือ `.mp3` ที่ไม่มีลิขสิทธิ์) ลงในโฟลเดอร์นี้ได้ทั้งแบบ **ตามธีมหลัก** และ **แยกเฉพาะแต่ละแผนที่** ระบบจะตรวจจับและเล่นวนซ้ำแบบ Seamless Loop ให้อัตโนมัติ:

## 1) เพลงธีมหลัก (7 สถานการณ์)
1. `login.ogg` หรือ `login.mp3` — เพลงหน้า Login / เลือกตัวละคร
2. `town.ogg` หรือ `town.mp3` — เพลงเมืองหลัก
3. `field.ogg` หรือ `field.mp3` — เพลงแผนที่เก็บเลเวล (Fallback)
4. `dungeon.ogg` หรือ `dungeon.mp3` — เพลงดันเจี้ยนและหอคอย (Fallback)
5. `battle.ogg` หรือ `battle.mp3` — เพลงต่อสู้มอนสเตอร์ทั่วไป
6. `boss.ogg` หรือ `boss.mp3` — เพลงต่อสู้บอสและเวิลด์บอส
7. `event.ogg` หรือ `event.mp3` — เพลงกิจกรรมพิเศษ (Fallback)

## 2) เพลงเฉพาะแต่ละแผนที่ (Open World Per-Map Override)
สามารถใส่ไฟล์ชื่อ `map_<mapId>.ogg` หรือ `map_<mapId>.mp3` เพื่อใช้แทนเพลงซินธ์ออร์เคสตราเฉพาะแผนที่ได้ทันที เช่น:
- `map_meadow.ogg`, `map_vale.ogg`, `map_woods.ogg`, `map_forest.ogg`, `map_coast.ogg`
- `map_cave.ogg`, `map_desert.ogg`, `map_graveyard.ogg`, `map_isles.ogg`, `map_snow.ogg`
- `map_ruins.ogg`, `map_volcano.ogg`, `map_sky.ogg`, `map_abyss.ogg`, `map_world.ogg`
- `map_act_invasion.ogg`, `map_act_guild_war.ogg`, `map_act_bounty.ogg`, `map_act_treasure.ogg`, `map_act_fishing.ogg`

หมายเหตุ: หากยังไม่มีไฟล์เสียงในโฟลเดอร์นี้ ระบบจะบรรเลงดนตรี MMORPG Open World ออร์เคสตราต้นฉบับ (Royalty-free Multi-Voice Web Audio Orchestra + Concert Hall Reverb) แยกทำนองและเครื่องดนตรีเฉพาะครบทุกแผนที่โดยไม่เกิดข้อผิดพลาด 404
