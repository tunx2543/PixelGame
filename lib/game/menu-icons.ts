'use client'

export type MenuIconId =
  | 'status'
  | 'skills'
  | 'quests'
  | 'equipment'
  | 'inventory'
  | 'tower'
  | 'gem-shop'
  | 'more'
  | 'shop'
  | 'job'
  | 'pass'
  | 'enhance'
  | 'craft'
  | 'pets'
  | 'wardrobe'
  | 'lifeskills'
  | 'dungeon'
  | 'guild'
  | 'arena'
  | 'market'
  | 'mail'
  | 'codex'
  | 'gacha'
  | 'guide'
  | 'models'
  | 'friends'
  | 'party'
  | 'settings'
  | 'checkin'
  | 'dev-tools'
  | 'helper'
  | 'soul-shop'
  | 'menu-castle'
  | 'spirit'
  | 'rebirth'
  | 'rate'
  | 'camera'
  | 'gold-coin'
  | 'silver-coin'
  | 'soul-gem'
  | 'buff-xp'
  | 'buff-jp'
  | 'buff-food'
  | 'buff-vip'
  | 'buff-magnet'
  | 'auto-farm'
  | 'auto-skill'
  | 'pk-swords'
  | 'mount-wind'
  | 'gp-trophy'
  | 'bp-wings'
  | 'event-flash'
  | 'race-human'
  | 'class-star'
  | 'npc-anvil'
  | 'npc-chest'
  | 'npc-pouch'
  | 'npc-job'
  | 'npc-gacha'
  | 'npc-rebirth'

const OUTLINE = '#131726'
const iconDataCache = new Map<MenuIconId, string>()
const iconCanvasCache = new Map<MenuIconId, HTMLCanvasElement>()

interface IconTemplate {
  rows: string[]
  palette: Record<string, string>
}

const TEMPLATES: Record<MenuIconId, IconTemplate> = {
  // สถานะ: นักรบผมแดง
  status: {
    rows: [
      '......rrrrrr......',
      '....rrRRRRRRrr....',
      '...rRRRRlRRRRRr...',
      '..rRRRlRRRRRRRrr..',
      '..rRRrrrrrrRRRRr..',
      '..rRrssssssrRRr...',
      '...rskssskssr.....',
      '...rssssssssr.....',
      '....rssmmssr......',
      '.....rssssr.......',
      '...ggbbbbbbgg.....',
      '..gGGbBBBBbGGg....',
      '.gGGbbBggBbbGGg...',
      '.gGbbbBBBBbbbGg...',
      '..bbbbbbbbbbbb....',
      '..bBBBBbbBBBBb....',
      '...bbbb..bbbb.....',
    ],
    palette: {
      r: '#b91c1c',
      R: '#ef4444',
      l: '#fca5a5',
      s: '#fcd5b5',
      k: '#1e1b2e',
      m: '#d99b78',
      g: '#b45309',
      G: '#fbbf24',
      b: '#334155',
      B: '#64748b',
    },
  },

  // สกิล: ตำราเวทมนตร์เปิดกลางหน้าเรืองแสง
  skills: {
    rows: [
      '..................',
      '...bbbb....bbbb...',
      '..bppppb..bppppb..',
      '.bppppppbbppppppb.',
      '.bpWWWWpbbpWWWWpb.',
      '.bpWccWpbbpWyyWpb.',
      '.bpWWWWpbbpWWWWpb.',
      '.bpWppWpbbpWppWpb.',
      '.bpWWWWpbbpWWWWpb.',
      '.bppppppbbppppppb.',
      '.boooooobboooooob.',
      '..booooobbooooob..',
      '...ggggg..ggggg...',
      '......rr..........',
      '......rR..........',
      '.......r..........',
    ],
    palette: {
      b: '#78350f',
      o: '#b45309',
      g: '#fbbf24',
      p: '#e5d4b3',
      W: '#fffbeb',
      c: '#38bdf8',
      y: '#f59e0b',
      r: '#dc2626',
      R: '#f87171',
    },
  },

  // เควส: ม้วนภารกิจผูกริบบิ้นแดงและตราขี้ผึ้ง
  quests: {
    rows: [
      '.....ppppppppp....',
      '....pWWWWWWWWWp...',
      '...pWWppppppWWp...',
      '...pWWppppppWWp...',
      '..pWWWWWWWWWWWWp..',
      '..pWWddddddddWWp..',
      '..pWWWWWWWWWWWWp..',
      '.rrrrrrrrrrrrrrrr.',
      '.rRRRRggGGggRRRRr.',
      '..pWWWgGGGGgWWWp..',
      '..pWWddgGGgddWWp..',
      '..pWWWWWWWWWWWWp..',
      '...pWWWWWWppppWp..',
      '...pddddddppppdp..',
      '....pppppppppp....',
    ],
    palette: {
      p: '#e7c998',
      W: '#fef3c7',
      d: '#9c7a4c',
      r: '#b91c1c',
      R: '#ef4444',
      g: '#d97706',
      G: '#fde047',
    },
  },

  // อุปกรณ์: เกราะอกเหล็กผสมทองแดง
  equipment: {
    rows: [
      '..oo..........oo..',
      '.oOOo........oOOo.',
      '.oOllo......olloo.',
      '.oosssso..ossssoo.',
      '..osssssggssssso..',
      '...ssSSgGGgSSss...',
      '...ssSSGGGGSSss...',
      '...ssSSsggssSSs...',
      '....sSSssssSSs....',
      '....sSSSSSSSSs....',
      '....sSSooooSSs....',
      '.....soooooos.....',
      '.....gggggggg.....',
      '......oooooo......',
    ],
    palette: {
      o: '#9a4f23',
      O: '#c97136',
      l: '#f6ad7b',
      s: '#64748b',
      S: '#cbd5e1',
      g: '#b45309',
      G: '#fbbf24',
    },
  },

  // กระเป๋า: เป้หนังนักผจญภัยพร้อมสายรัดทองเหลือง
  inventory: {
    rows: [
      '......gggggg......',
      '.....gnnnnnng.....',
      '....nNNNNNNNNn....',
      '...nNNllllllNNn...',
      '..nNNNNNNNNNNNNn..',
      '..nNNggggggggNNn..',
      '.snNNgGnnnnGgNNns.',
      '.snNNgnNNNNngNNns.',
      '.snNNgnNNNNngNNns.',
      '.snNNgnnnnnngNNns.',
      '..nNNnNNNNNNnNNn..',
      '..nNNnggggggnNNn..',
      '..nnnnNNNNNNnnnn..',
      '...ddddddddddddd..',
    ],
    palette: {
      n: '#7c3f1d',
      N: '#a85a2b',
      l: '#d2844c',
      d: '#4c2410',
      s: '#5c2d14',
      g: '#b45309',
      G: '#fde047',
    },
  },

  // หอคอย: ป้อมหอคอยหลังคาน้ำเงินยอดทอง
  tower: {
    rows: [
      '........GG........',
      '........gg........',
      '.......bbbb.......',
      '......bBBBBb......',
      '.....bBllllBb.....',
      '....bBBBBBBBBb....',
      '...bbbbbbbbbbbb...',
      '....sSSsSSsSSs....',
      '....sSSSSSSSSs....',
      '....sSSsYYsSSs....',
      '....sSSsYYsSSs....',
      '....sSSSSSSSSs....',
      '...ssSSooooSSss...',
      '...ssSSoYYoSSss...',
      '..ssssssssssssss..',
    ],
    palette: {
      G: '#fde047',
      g: '#ca8a04',
      b: '#3730a3',
      B: '#4f46e5',
      l: '#818cf8',
      s: '#475569',
      S: '#94a3b8',
      Y: '#fbbf24',
      o: '#78350f',
    },
  },

  // ร้านเพชร / Premium: มงกุฎทองฝังอัญมณี
  'gem-shop': {
    rows: [
      '........GG........',
      '..G.....GG.....G..',
      '..GG...gGGg...GG..',
      '..gGg..gGGg..gGg..',
      '..gGGggGGGGggGGg..',
      '..gGGcGGGGGGcGGg..',
      '..gGGrGGccGGrGGg..',
      '..gGGGGGGGGGGGGg..',
      '..gGGGGGGGGGGGGg..',
      '..rrrrrrrrrrrrrr..',
      '..rRRRRRRRRRRRRr..',
      '..gggggggggggggg..',
    ],
    palette: {
      G: '#fde047',
      g: '#ca8a04',
      c: '#38bdf8',
      r: '#991b1b',
      R: '#ef4444',
    },
  },

  // เพิ่มเติม: อัญมณี 4 สีเรียงตาราง 2x2
  more: {
    rows: [
      '..rrrrr....ggggg..',
      '.rRllRRr..gGllGGg.',
      '.rRRRRRr..gGGGGGGg',
      '.rRRRRRr..gGGGGGGg',
      '.rdddddr..gddddddg',
      '..rrrrr....ggggg..',
      '..................',
      '..yyyyy....bbbbb..',
      '.yYllYYy..bBllBBb.',
      '.yYYYYYy..bBBBBBBb',
      '.yYYYYYy..bBBBBBBb',
      '.ydddddy..bdddddd.',
      '..yyyyy....bbbbb..',
    ],
    palette: {
      r: '#b91c1c',
      R: '#ef4444',
      l: '#ffffff',
      d: '#7f1d1d',
      g: '#15803d',
      G: '#22c55e',
      y: '#b45309',
      Y: '#f59e0b',
      b: '#1d4ed8',
      B: '#38bdf8',
    },
  },

  // ร้านค้า: ถุงเหรียญทอง
  shop: {
    rows: [
      '.....gggggg.......',
      '......nNNn........',
      '.....rrrrrr.......',
      '....nNNNNNNn......',
      '...nNNllllNNn.....',
      '..nNNNNNNNNNNn....',
      '..nNNgGGGGgNNn....',
      '..nNNgGyyGgNNn....',
      '..nNNgGGGGgNNn....',
      '..nNNNNNNNNNNn....',
      '...dddddddddd.....',
    ],
    palette: {
      g: '#ca8a04',
      G: '#fbbf24',
      y: '#fef08a',
      n: '#92400e',
      N: '#d97706',
      l: '#fcd34d',
      r: '#dc2626',
      d: '#78350f',
    },
  },

  // เปลี่ยนอาชีพ: ดาบไขว้บนโล่ทอง
  job: {
    rows: [
      '.ll............ll.',
      '.lSl..........lSl.',
      '..lSl..GGGG..lSl..',
      '...lSlGGGGGGSl....',
      '....GGGGGGGGGG....',
      '....gGGcGGcGGg....',
      '....gGGGGGGGGg....',
      '...gGlSlGGGlSlg...',
      '..gg....GG....gg..',
      '.n......gg......n.',
    ],
    palette: {
      l: '#f8fafc',
      S: '#94a3b8',
      G: '#fbbf24',
      g: '#b45309',
      c: '#38bdf8',
      n: '#78350f',
    },
  },

  // Battle Pass: เหรียญตราปีกทอง
  pass: {
    rows: [
      '.ww............ww.',
      'wWWw..gggggg..wWWw',
      'wWWwgGGGGGGGGgwWWw',
      '.wwgGGyyyyyyGGgww.',
      '...gGGyWWWWyGGg...',
      '...gGGyyyyyyGGg...',
      '....gGGGGGGGGg....',
      '.....rrrrrrrr.....',
      '....rRRr..rRRr....',
      '....rrr....rrr....',
    ],
    palette: {
      w: '#cbd5e1',
      W: '#ffffff',
      g: '#b45309',
      G: '#fbbf24',
      y: '#fde047',
      r: '#b91c1c',
      R: '#ef4444',
    },
  },

  // ตีบวก: ทั่งเหล็กและค้อนทอง
  enhance: {
    rows: [
      '.......gggggg.....',
      '......gGGGGGGg....',
      '.......nGGGGn.....',
      '......n...........',
      '.....n............',
      '..ssssssssssssss..',
      '.sSSSSSSSSSSSSSSs.',
      '...ssssssssssss...',
      '.....sSSSSSSs.....',
      '....ssssssssss....',
    ],
    palette: {
      g: '#b45309',
      G: '#fbbf24',
      n: '#78350f',
      s: '#475569',
      S: '#cbd5e1',
    },
  },

  // คราฟต์ & รูน: ขวดแปรธาตุเรืองแสง
  craft: {
    rows: [
      '......nnnnnn......',
      '.......cccc.......',
      '.......cCCc.......',
      '......cCCCCc......',
      '....ccCCCCCCcc....',
      '...cppppppppppcc..',
      '..cpPPPPPPPPPPpc..',
      '..cpPPllPPPPPPpc..',
      '..cpPPPPPPPPPPpc..',
      '...cccccccccccc...',
    ],
    palette: {
      n: '#78350f',
      c: '#0284c7',
      C: '#bae6fd',
      p: '#9333ea',
      P: '#c084fc',
      l: '#ffffff',
    },
  },

  // สัตว์เลี้ยง: อุ้งเท้าน้อยน่ารัก
  pets: {
    rows: [
      '..oo......oo......',
      '.oOOo....oOOo.....',
      '..oo......oo..oo..',
      '....ooooo....oOOo.',
      '...oOOOOOo....oo..',
      '..oOOlllOOo.......',
      '..oOOOOOOOo.......',
      '..oOOOOOOOo.......',
      '...ooooooo........',
    ],
    palette: {
      o: '#c2410c',
      O: '#fb923c',
      l: '#fed7aa',
    },
  },

  // แฟชั่น & ปีก: ปีกนางฟ้าชมพูขาว
  wardrobe: {
    rows: [
      '.pppp........pppp.',
      'pPPPPp......pPPPPp',
      'pPPllPp....pPllPPp',
      '.pPPPPp....pPPPPp.',
      '..pPPPp....pPPPp..',
      '...pPPp.gg.pPPp...',
      '....pppgGGgppp....',
      '........gg........',
    ],
    palette: {
      p: '#db2777',
      P: '#f472b6',
      l: '#fce7f3',
      g: '#b45309',
      G: '#fbbf24',
    },
  },

  // ทักษะชีวิต: ใบไม้มรกต
  lifeskills: {
    rows: [
      '.........gggggg...',
      '.......ggGGGGGGg..',
      '.....ggGGllGGGGg..',
      '....gGGGGGGGGgg...',
      '...gGGGGggggg.....',
      '..gGGGgg..........',
      '..ggg.............',
      '.n................',
    ],
    palette: {
      g: '#15803d',
      G: '#4ade80',
      l: '#dcfce7',
      n: '#78350f',
    },
  },

  // ดันเจี้ยน: ประตูมิติม่วง
  dungeon: {
    rows: [
      '...ssssssssss.....',
      '..sSSppppppSSs....',
      '.sSSpPPPPPPpSSs...',
      '.sSSpPPccPPpSSs...',
      '.sSSpPPccPPpSSs...',
      '.sSSpPPPPPPpSSs...',
      '.sSSppppppppSSs...',
      '.ssssssssssssss...',
    ],
    palette: {
      s: '#334155',
      S: '#64748b',
      p: '#6b21a8',
      P: '#a855f7',
      c: '#67e8f9',
    },
  },

  // กิลด์: ธงโล่มรกตขอบทอง
  guild: {
    rows: [
      '..gggggggggggg....',
      '.gGGGGGGGGGGGGg...',
      '.gGeeeeeeeeeeGg...',
      '.gGeEEllllEEeGg...',
      '.gGeeeeeeeeeeGg...',
      '..gGeeeeeeeeGg....',
      '...gGeeeeeeGg.....',
      '....gGeeeeGg......',
      '.....gggggg.......',
    ],
    palette: {
      g: '#b45309',
      G: '#fbbf24',
      e: '#047857',
      E: '#34d399',
      l: '#fde047',
    },
  },

  // ลานประลอง: ดาบประลองสีแดงทอง
  arena: {
    rows: [
      '.ll............ll.',
      '..lSl........lSl..',
      '...lSl......lSl...',
      '....lSl....lSl....',
      '.....rRrrrrRr.....',
      '......gGGGGg......',
      '.....lSl..lSl.....',
      '....nn......nn....',
    ],
    palette: {
      l: '#f8fafc',
      S: '#94a3b8',
      r: '#b91c1c',
      R: '#ef4444',
      g: '#b45309',
      G: '#fbbf24',
      n: '#78350f',
    },
  },

  // ตลาดประมูล: เหรียญทองเรียงตั้ง
  market: {
    rows: [
      '......ggggg.......',
      '.....gGGllGg......',
      '.....gGGGGGGg.....',
      '..gggggggggg......',
      '.gGGllGGGGGGg.....',
      '.gGGGGGGGGGGg.....',
      '..gggggggggg......',
      '.gGGGGGGGGGGg.....',
      '..gggggggggg......',
    ],
    palette: {
      g: '#b45309',
      G: '#fbbf24',
      l: '#fef08a',
    },
  },

  // จดหมาย: ซองจดหมายตราแดง
  mail: {
    rows: [
      '.wwwwwwwwwwwwww...',
      '.wWwwwwwwwwwwWw...',
      '.wwWwwwwwwwwWww...',
      '.wwwWwrrrrwWwww...',
      '.wwwwWrRRrWwwww...',
      '.wwwWwwrrwwWwww...',
      '.wwWwwwwwwwwWww...',
      '.wwwwwwwwwwwwww...',
    ],
    palette: {
      w: '#cbd5e1',
      W: '#ffffff',
      r: '#b91c1c',
      R: '#ef4444',
    },
  },

  // สมุดภาพ: หนังสือฟ้าอัญมณี
  codex: {
    rows: [
      '..ccccccccccc.....',
      '.cCCCCCCCCCCCc....',
      '.cCCgggggggCCc....',
      '.cCCgGyyGGgCCc....',
      '.cCCgggggggCCc....',
      '.cCCCCCCCCCCCc....',
      '.cCCwwwwwwwCCc....',
      '..ccccccccccc.....',
    ],
    palette: {
      c: '#0e7490',
      C: '#22d3ee',
      g: '#b45309',
      G: '#fbbf24',
      y: '#fef08a',
      w: '#e2e8f0',
    },
  },

  // กาชา: กล่องของขวัญกาชาแดงทอง
  gacha: {
    rows: [
      '...yy......yy.....',
      '..yYYy....yYYy....',
      '.rrrrrrgggrrrrr...',
      '.rRRRRgGGgRRRRr...',
      '.rrrrrrrrrrrrrr...',
      '..rRRRgGGgRRRr....',
      '..rRRRgGGgRRRr....',
      '..rrrrgggggrrr....',
    ],
    palette: {
      y: '#ca8a04',
      Y: '#fef08a',
      r: '#b91c1c',
      R: '#ef4444',
      g: '#d97706',
      G: '#fbbf24',
    },
  },

  // คู่มือ: เข็มทิศนักเดินทาง
  guide: {
    rows: [
      '....gggggggg......',
      '..ggCCCCCCCCgg....',
      '.gCCCrrCCCCCCg....',
      '.gCCrRRwCCCCCg....',
      '.gCCCCwwbbCCCg....',
      '.gCCCCCbbCCCCg....',
      '..ggCCCCCCCCgg....',
      '....gggggggg......',
    ],
    palette: {
      g: '#b45309',
      C: '#e0f2fe',
      r: '#b91c1c',
      R: '#ef4444',
      w: '#ffffff',
      b: '#334155',
    },
  },

  // คลังโมเดล: คริสตัลสี่เหลี่ยมเรืองแสง
  models: {
    rows: [
      '.......cc.........',
      '......cCCc........',
      '.....cCllCc.......',
      '....cCCCCCCc......',
      '...cCCCCCCCCc.....',
      '....cCCCCCCc......',
      '.....cCCCCc.......',
      '......cCCc........',
      '.......cc.........',
    ],
    palette: {
      c: '#0284c7',
      C: '#38bdf8',
      l: '#ffffff',
    },
  },

  // เพื่อน: ตัวละครคู่กัน
  friends: {
    rows: [
      '..cccc....gggg....',
      '.cCCCCc..gGGGGg...',
      '..ssss....ssss....',
      '..sSSs....sSSs....',
      '.bbbbbb..eeeeee...',
      'bBBBBBBbeEEEEEEe..',
      'bBBBBBBbeEEEEEEe..',
    ],
    palette: {
      c: '#0284c7',
      C: '#38bdf8',
      g: '#d97706',
      G: '#fbbf24',
      s: '#d99b78',
      S: '#fcd5b5',
      b: '#1d4ed8',
      B: '#60a5fa',
      e: '#047857',
      E: '#34d399',
    },
  },

  // ปาร์ตี้: ธงปาร์ตี้ม่วงทอง
  party: {
    rows: [
      '.ggpppppppppp.....',
      '.gGpPPPPPPPPp.....',
      '.gGpPPyyyyPPp.....',
      '.gGpPPPPPPPPp.....',
      '.gGpppppppppp.....',
      '.gg...............',
      '.gg...............',
      '.gg...............',
    ],
    palette: {
      g: '#b45309',
      G: '#fbbf24',
      p: '#6b21a8',
      P: '#a855f7',
      y: '#fde047',
    },
  },

  // ตั้งค่า: ฟันเฟืองโลหะทองเหลือง
  settings: {
    rows: [
      '.....gg..gg.......',
      '..gg.gGGGGg.gg....',
      '.gGGgGGGGGGgGGg...',
      '..gGGGssssGGGg....',
      '..gGGsSSSSsGGg....',
      '..gGGGssssGGGg....',
      '.gGGgGGGGGGgGGg...',
      '..gg.gGGGGg.gg....',
      '.....gg..gg.......',
    ],
    palette: {
      g: '#475569',
      G: '#cbd5e1',
      s: '#1e293b',
      S: '#fbbf24',
    },
  },

  // เช็คอินรายวัน: ปฏิทินดาวทอง
  checkin: {
    rows: [
      '..rrrrrrrrrrrr....',
      '.rRRRRRRRRRRRRr...',
      '.wwwwwwwwwwwwww...',
      '.wWWWWyyyyWWWWw...',
      '.wWWWyyYYyyWWWw...',
      '.wWWWWyyyyWWWWw...',
      '.wWWWWWWWWWWWWw...',
      '.ssssssssssssss...',
    ],
    palette: {
      r: '#b91c1c',
      R: '#ef4444',
      w: '#cbd5e1',
      W: '#ffffff',
      y: '#d97706',
      Y: '#fde047',
      s: '#64748b',
    },
  },

  // Dev Console: ตราคำสั่ง GM
  'dev-tools': {
    rows: [
      '.gggggggggggggg...',
      'gGGGGGGGGGGGGGGg..',
      'gGbbbbbbbbbbbbGg..',
      'gGbYYbbbbbbYYbGg..',
      'gGbbYYbbbbbbbbGg..',
      'gGbYYbbYYYYbbGGg..',
      'gGbbbbbbbbbbbbGg..',
      '.gggggggggggggg...',
    ],
    palette: {
      g: '#b45309',
      G: '#fbbf24',
      b: '#0f172a',
      Y: '#fde047',
    },
  },

  // ตัวช่วยประจำวัน: กระดานภารกิจกับขนนกเช็กถูก
  helper: {
    rows: [
      '.....gggggg.......',
      '....gGGGGGGg..cc..',
      '...ppppppppppcCCc.',
      '..pWWWWWWWWWWcCCc.',
      '..pWggWWWWWWcCCc..',
      '..pWGGWdddddccc...',
      '..pWWWWWWWWWWp....',
      '..pWggWWdddddW....',
      '..pWGGWWWWWWWW....',
      '..pWWWWdddddWp....',
      '..ppppppppppp.....',
    ],
    palette: {
      g: '#15803d',
      G: '#4ade80',
      p: '#c29b61',
      W: '#fef9e7',
      d: '#64748b',
      c: '#0284c7',
      C: '#7dd3fc',
    },
  },

  // ร้านโซล / Premium Shop: ถุงสมบัติปักตราเพชรฟ้า
  'soul-shop': {
    rows: [
      '....ggGGGGgg......',
      '.....gGGGGg.......',
      '....rrrrrrrr......',
      '...nNNNNNNNNn.....',
      '..nNNllllllNNn....',
      '..nNNcCCCCcNNn....',
      '..nNcCCllCCcNn....',
      '..nNNcCCCCcNNn....',
      '..nNNNccccNNNn....',
      '...dddddddddd.....',
    ],
    palette: {
      g: '#b45309',
      G: '#fde047',
      r: '#e11d48',
      n: '#9a3412',
      N: '#f59e0b',
      l: '#fef3c7',
      c: '#0284c7',
      C: '#38bdf8',
      d: '#7c2d12',
    },
  },

  // ปุ่มเมนูหลัก: หอปราสาทศิลาน้ำเงินหลังคาทอง
  'menu-castle': {
    rows: [
      '.......gg.........',
      '......bBBb........',
      '.....bBllBb.......',
      '....bBBBBBBb......',
      '...bBBBBBBBBb.....',
      '..bbbbbbbbbbbb....',
      '...sSSsSSsSSs.....',
      '...sSSsGGsSSs.....',
      '...sSSgGGgSSs.....',
      '...sSSgYYgSSs.....',
      '..ssssssssssss....',
    ],
    palette: {
      g: '#b45309',
      G: '#fbbf24',
      Y: '#fef08a',
      b: '#1d4ed8',
      B: '#38bdf8',
      l: '#e0f2fe',
      s: '#475569',
      S: '#cbd5e1',
    },
  },

  // จิต & จุจิต: ดอกบัวจิตวิญญาณเรืองแสง
  spirit: {
    rows: [
      '.......ll.........',
      '......lCCc........',
      '..pp..cCCc..pp....',
      '.pPPp.cCCc.pPPp...',
      '.pPPpcCCCCcpPPp...',
      '..pPpcCllCcPPp....',
      '...ppcCCCCcpp.....',
      '...ggGGGGGGgg.....',
      '....gGGGGGGg......',
      '.....gggggg.......',
    ],
    palette: {
      l: '#ffffff',
      c: '#0284c7',
      C: '#67e8f9',
      p: '#9333ea',
      P: '#e879f9',
      g: '#b45309',
      G: '#fde047',
    },
  },

  // จุติ: ปีกวิหคทองคำแห่งการกำเนิดใหม่
  rebirth: {
    rows: [
      '.gg............gg.',
      'gGGg....ll....gGGg',
      'gGllg..gGGg..gllGg',
      '.gGGg.gGllGg.gGGg.',
      '..gGGgGGGGGGgGGg..',
      '...gGGGGccGGGGg...',
      '....gGGGccGGGg....',
      '.....ggGGGGgg.....',
      '.......gggg.......',
    ],
    palette: {
      g: '#b45309',
      G: '#fbbf24',
      l: '#fffbeb',
      c: '#38bdf8',
    },
  },

  // ให้คะแนน: เหรียญดาวทองมีประกาย
  rate: {
    rows: [
      '.......GG.........',
      '......gGGg........',
      '..ggggGGGGgggg....',
      '.gGGGGllllGGGGg...',
      '..gGGGGGGGGGGg....',
      '...gGGGGGGGGg.....',
      '..gGGGggggGGGg....',
      '..gGGg....gGGg....',
      '...gg......gg.....',
    ],
    palette: {
      g: '#b45309',
      G: '#fbbf24',
      l: '#fef9c3',
    },
  },

  // ถ่ายภาพ: กล้องบันทึกภาพผจญภัย
  camera: {
    rows: [
      '.....ssssss.......',
      '..ssssssssssss....',
      '.sSSSSSSSSSSSSs...',
      '.sSSbbbbbbSSrrs...',
      '.sSbBBllBBbSSSs...',
      '.sSbBBBBBBbSSSs...',
      '.sSSbbbbbbSSSSs...',
      '.sSSSSSSSSSSSSs...',
      '..dddddddddddd....',
    ],
    palette: {
      s: '#334155',
      S: '#cbd5e1',
      d: '#1e293b',
      b: '#0284c7',
      B: '#38bdf8',
      l: '#ffffff',
      r: '#ef4444',
    },
  },

  // เหรียญทอง
  'gold-coin': {
    rows: [
      '....gggggg........',
      '..ggGGllGGgg......',
      '.gGGllGGGGGGg.....',
      '.gGGgYYYYgGGg.....',
      '.gGGgYYYYgGGg.....',
      '.gGGGGGGGGGGg.....',
      '..ggGGGGGGgg......',
      '....gggggg........',
    ],
    palette: {
      g: '#b45309',
      G: '#fbbf24',
      l: '#fffbeb',
      Y: '#fde047',
    },
  },

  // เหรียญเงิน
  'silver-coin': {
    rows: [
      '....ssssss........',
      '..ssSSllSSss......',
      '.sSSllSSSSSSs.....',
      '.sSSsWWWWsSSs.....',
      '.sSSsWWWWsSSs.....',
      '.sSSSSSSSSSSs.....',
      '..ssSSSSSSss......',
      '....ssssss........',
    ],
    palette: {
      s: '#475569',
      S: '#cbd5e1',
      l: '#ffffff',
      W: '#f1f5f9',
    },
  },

  // โซลเจม / คริสตัลสีฟ้า
  'soul-gem': {
    rows: [
      '......cc..........',
      '.....cCCc.........',
      '...ccCllCcc.......',
      '..cCCCCCCCCc......',
      '..cCCCCCCCCc......',
      '...cCCCCCCc.......',
      '....cCCCCc........',
      '.....cCCc.........',
      '......cc..........',
    ],
    palette: {
      c: '#0369a1',
      C: '#38bdf8',
      l: '#e0f2fe',
    },
  },

  // บัฟ EXP
  'buff-xp': {
    rows: [
      '..gggggggggg......',
      '.gGGllGGGGGGg.....',
      '.gGbbGGGGbbGg.....',
      '.gGGbbGGbbGGg.....',
      '.gGGGbbbbGGGg.....',
      '.gGGbbGGbbGGg.....',
      '.gGbbGGGGbbGg.....',
      '..gggggggggg......',
    ],
    palette: {
      g: '#b45309',
      G: '#fbbf24',
      l: '#fef9c3',
      b: '#78350f',
    },
  },

  // บัฟ JP
  'buff-jp': {
    rows: [
      '..oooooooooo......',
      '.oOOllOOOOOOo.....',
      '.oOOObbbbOOOo.....',
      '.oOOOObbOOOOo.....',
      '.oOOOObbOOOOo.....',
      '.oOObbOObbOOo.....',
      '.oOOObbbbOOOo.....',
      '..oooooooooo......',
    ],
    palette: {
      o: '#c2410c',
      O: '#fb923c',
      l: '#ffedd5',
      b: '#431407',
    },
  },

  // บัฟอาหาร
  'buff-food': {
    rows: [
      '......ww..........',
      '...nnnnnnnn.......',
      '..nNNllNNNNn..ss..',
      '.nNNNNNNNNNNnsSSs.',
      '..nnnnnnnnnn..ss..',
      '.ssssssssssss.....',
      '..dddddddddd......',
    ],
    palette: {
      w: '#ffffff',
      n: '#9a3412',
      N: '#ea580c',
      l: '#fed7aa',
      s: '#cbd5e1',
      S: '#ffffff',
      d: '#64748b',
    },
  },

  // บัฟ VIP
  'buff-vip': {
    rows: [
      '..G....GG....G....',
      '..Gg..gGGg..gG....',
      '..gGggGGGGggGg....',
      '..gGGcGGGGcGGg....',
      '..gGGGGGGGGGGg....',
      '..rrrrrrrrrrrr....',
      '..gggggggggggg....',
    ],
    palette: {
      G: '#fde047',
      g: '#ca8a04',
      c: '#38bdf8',
      r: '#dc2626',
    },
  },

  // แม่เหล็กดูดของ
  'buff-magnet': {
    rows: [
      '..sss......sss....',
      '.sSSSs....sSSSs...',
      '.rRRRr....rRRRr...',
      '.rRRRr....rRRRr...',
      '.rRRRRrrrrRRRRr...',
      '..rRRRRRRRRRRr....',
      '...rrrrrrrrrr.....',
    ],
    palette: {
      s: '#64748b',
      S: '#e2e8f0',
      r: '#b91c1c',
      R: '#ef4444',
    },
  },

  // ออโต้ฟาร์ม
  'auto-farm': {
    rows: [
      '......cc..........',
      '...gggggggg.......',
      '..gGGGGGGGGg......',
      '..gGcCggCcGg......',
      '..gGGGGGGGGg......',
      '...gGllllGg.......',
      '..gggggggggg......',
      '...ss....ss.......',
    ],
    palette: {
      c: '#22d3ee',
      C: '#a5f3fc',
      g: '#047857',
      G: '#34d399',
      l: '#a7f3d0',
      s: '#475569',
    },
  },

  // ออโต้สกิล
  'auto-skill': {
    rows: [
      '.......pppp.......',
      '......pPPllp......',
      '.....pPPPp........',
      '....pPPPPPPPp.....',
      '.......pPPPp......',
      '......pPPPp.......',
      '.....pPPp.........',
      '....ppp...........',
    ],
    palette: {
      p: '#7e22ce',
      P: '#c084fc',
      l: '#faf5ff',
    },
  },

  // PK ดาบไขว้
  'pk-swords': {
    rows: [
      '.ll..........ll...',
      '..lSl......lSl....',
      '...lSl....lSl.....',
      '....rRrrrrRr......',
      '.....rRRRRr.......',
      '....lSl..lSl......',
      '...nn......nn.....',
    ],
    palette: {
      l: '#f8fafc',
      S: '#94a3b8',
      r: '#b91c1c',
      R: '#ef4444',
      n: '#78350f',
    },
  },

  // สัตว์ขี่สายลม
  'mount-wind': {
    rows: [
      '..ccc......ggg....',
      '.cCCCc....gGGGg...',
      '..ccCCCccgGGGGg...',
      '....ccCCCCCCCCg...',
      '..cccCCCllCCCc....',
      '...ccCCCCCCcc.....',
      '.....cccccc.......',
    ],
    palette: {
      c: '#0284c7',
      C: '#38bdf8',
      l: '#e0f2fe',
      g: '#b45309',
      G: '#fbbf24',
    },
  },

  // GP ถ้วยรางวัล
  'gp-trophy': {
    rows: [
      '..gggggggggggg....',
      '.gGgGGGGGGGGgGg...',
      '.gg.gGGllGGg.gg...',
      '....gGGGGGGg......',
      '.....gGGGGg.......',
      '......gGGg........',
      '....gggggggg......',
    ],
    palette: {
      g: '#b45309',
      G: '#fbbf24',
      l: '#fef9c3',
    },
  },

  // BP ปีกตราสัญลักษณ์
  'bp-wings': {
    rows: [
      '.ww....cc....ww...',
      'wWWw..cCCc..wWWw..',
      '.wwgGGcCCcGGgww...',
      '...gGGcCCcGGg.....',
      '....gGGGGGGg......',
      '.....gGGGGg.......',
      '......gggg........',
    ],
    palette: {
      w: '#94a3b8',
      W: '#ffffff',
      c: '#0284c7',
      C: '#38bdf8',
      g: '#b45309',
      G: '#fbbf24',
    },
  },

  // Event Flash
  'event-flash': {
    rows: [
      '......yyyy........',
      '.....yYYlly.......',
      '....yYYYy.........',
      '...yYYYYYYYYy.....',
      '......yYYYy.......',
      '.....yYYy.........',
      '....yyy...........',
    ],
    palette: {
      y: '#d97706',
      Y: '#fde047',
      l: '#ffffff',
    },
  },

  // ตราเผ่ามนุษย์
  'race-human': {
    rows: [
      '....cccccccc......',
      '..ccCCCCCCCCcc....',
      '.cCCcWWWWWWcCCc...',
      '.cCCcWWbbWWcCCc...',
      '.cCCcWWbbWWcCCc...',
      '..ccCWWWWWWCcc....',
      '....ccCCCCcc......',
      '......cccc........',
    ],
    palette: {
      c: '#1d4ed8',
      C: '#38bdf8',
      W: '#e0f2fe',
      b: '#1e3a8a',
    },
  },

  // ตราอาชีพ 8 แฉก
  'class-star': {
    rows: [
      '......gg..........',
      '...g..GG..g.......',
      '..gGggGGggGg......',
      '...gGGllGGg.......',
      '.ggggGllGgggg.....',
      '...gGGGGGGg.......',
      '..gGggGGggGg......',
      '...g..GG..g.......',
      '......gg..........',
    ],
    palette: {
      g: '#b45309',
      G: '#fbbf24',
      l: '#fffbeb',
    },
  },

  // NPC Overhead Tool Bubbles
  'npc-anvil': {
    rows: [
      '.......ggggg......',
      '......gGGGGGg.....',
      '.......nGGGn......',
      '......n...........',
      '..ssssssssssssss..',
      '.sSSSSSSSSSSSSSSs.',
      '...ssssssssssss...',
      '.....sSSSSSSs.....',
    ],
    palette: {
      g: '#b45309',
      G: '#fbbf24',
      n: '#78350f',
      s: '#475569',
      S: '#cbd5e1',
    },
  },
  'npc-chest': {
    rows: [
      '...nnnnnnnnnn.....',
      '..nNNNNNNNNNNn....',
      '.nNNgGGGGGGgNNn...',
      '.nNNgGyyyyGgNNn...',
      '.gggggggggggggg...',
      '.nNNnGGGGGGnNNn...',
      '.nNNnNNNNNNnNNn...',
      '..dddddddddddd....',
    ],
    palette: {
      n: '#78350f',
      N: '#b45309',
      d: '#451a03',
      g: '#ca8a04',
      G: '#fbbf24',
      y: '#fef08a',
    },
  },
  'npc-pouch': {
    rows: [
      '.....gggggg.......',
      '......nNNn........',
      '.....rrrrrr.......',
      '....nNNNNNNn......',
      '...nNNgGGgNNn.....',
      '...nNNgYYgNNn.....',
      '...nNNNNNNNNn.....',
      '....dddddddd......',
    ],
    palette: {
      g: '#ca8a04',
      n: '#92400e',
      N: '#d97706',
      r: '#dc2626',
      G: '#fbbf24',
      Y: '#fef08a',
      d: '#78350f',
    },
  },
  'npc-job': {
    rows: [
      '..ll..........ll..',
      '...lSl......lSl...',
      '....lSgGGGGSl.....',
      '.....gGGGGGGg.....',
      '....gGlSlGlSlg....',
      '...nn...gg...nn...',
    ],
    palette: {
      l: '#f8fafc',
      S: '#94a3b8',
      g: '#b45309',
      G: '#fbbf24',
      n: '#78350f',
    },
  },
  'npc-gacha': {
    rows: [
      '...yy......yy.....',
      '..yYYy....yYYy....',
      '.rrrrrrgggrrrrr...',
      '.rRRRRgGGgRRRRr...',
      '..rRRRgGGgRRRr....',
      '..rrrrgggggrrr....',
    ],
    palette: {
      y: '#ca8a04',
      Y: '#fef08a',
      r: '#b91c1c',
      R: '#ef4444',
      g: '#d97706',
      G: '#fbbf24',
    },
  },
  'npc-rebirth': {
    rows: [
      '.gg....ll....gg...',
      'gGGg..cCCc..gGGg..',
      '.gGGgcCllCcgGGg...',
      '..gGGcCCCCcGGg....',
      '...ggGGGGGGgg.....',
    ],
    palette: {
      g: '#b45309',
      G: '#fbbf24',
      l: '#ffffff',
      c: '#0284c7',
      C: '#67e8f9',
    },
  },
}

function renderTemplateCanvas(tmpl: IconTemplate): HTMLCanvasElement {
  const rows = tmpl.rows
  const w = Math.max(...rows.map((r) => r.length))
  const h = rows.length
  const pad = 2
  const scale = 4
  const gw = w + pad * 2
  const gh = h + pad * 2
  const cw = gw * scale
  const ch = gh * scale
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const filled: boolean[][] = Array.from({ length: gh }, () => Array<boolean>(gw).fill(false))
  for (let y = 0; y < h; y++) {
    const row = rows[y]
    for (let x = 0; x < row.length; x++) {
      if (tmpl.palette[row[x]]) {
        filled[y + pad][x + pad] = true
      }
    }
  }

  // Soft 2.5D drop shadow
  ctx.save()
  ctx.fillStyle = 'rgba(7, 10, 22, 0.42)'
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (!filled[y][x]) continue
      ctx.beginPath()
      ctx.roundRect(x * scale + 1.5, y * scale + 2.5, scale + 0.6, scale + 0.6, 1.5)
      ctx.fill()
    }
  }
  ctx.restore()

  // Smooth rounded dark contour outline
  ctx.fillStyle = OUTLINE
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (!filled[y][x]) continue
      ctx.beginPath()
      ctx.roundRect(x * scale - 1.6, y * scale - 1.6, scale + 3.2, scale + 3.2, 2.2)
      ctx.fill()
    }
  }

  // Main beveled body + 2.5D top-left highlight & bottom-right shadow per cell
  for (let y = 0; y < h; y++) {
    const row = rows[y]
    for (let x = 0; x < row.length; x++) {
      const col = tmpl.palette[row[x]]
      if (!col) continue
      const gx = x + pad
      const gy = y + pad
      const px = gx * scale
      const py = gy * scale
      const r = 1.1
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.roundRect(px - 0.35, py - 0.35, scale + 0.7, scale + 0.7, r)
      ctx.fill()

      // Top-left bevel highlight when exposed above or left
      if (!filled[gy - 1]?.[gx] || !filled[gy]?.[gx - 1]) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)'
        ctx.fillRect(px, py, scale, 1.1)
      }
      // Bottom-right depth shading when exposed below or right
      if (!filled[gy + 1]?.[gx] || !filled[gy]?.[gx + 1]) {
        ctx.fillStyle = 'rgba(6, 10, 24, 0.3)'
        ctx.fillRect(px, py + scale - 1.1, scale, 1.1)
      }
    }
  }

  return canvas
}

export function getMenuIconCanvas(id: MenuIconId): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  const cached = iconCanvasCache.get(id)
  if (cached) return cached
  const tmpl = TEMPLATES[id]
  if (!tmpl) return null
  const canvas = renderTemplateCanvas(tmpl)
  iconCanvasCache.set(id, canvas)
  return canvas
}

export function getMenuIconUrl(id: MenuIconId): string {
  if (typeof document === 'undefined') return ''
  const cached = iconDataCache.get(id)
  if (cached) return cached
  const canvas = getMenuIconCanvas(id)
  if (!canvas) return ''
  const url = canvas.toDataURL('image/png')
  iconDataCache.set(id, url)
  return url
}
