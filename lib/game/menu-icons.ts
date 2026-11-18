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

const OUTLINE = '#16111d'
const iconDataCache = new Map<MenuIconId, string>()

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
}

function renderTemplatePng(tmpl: IconTemplate): string {
  const rows = tmpl.rows
  const w = Math.max(...rows.map((r) => r.length))
  const h = rows.length
  const pad = 1
  const cw = w + pad * 2
  const ch = h + pad * 2
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.imageSmoothingEnabled = false

  const filled: boolean[][] = Array.from({ length: ch }, () => Array<boolean>(cw).fill(false))
  for (let y = 0; y < h; y++) {
    const row = rows[y]
    for (let x = 0; x < row.length; x++) {
      if (tmpl.palette[row[x]]) {
        filled[y + pad][x + pad] = true
      }
    }
  }

  // 1px dark pixel outline
  ctx.fillStyle = OUTLINE
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (filled[y][x]) continue
      if (filled[y - 1]?.[x] || filled[y + 1]?.[x] || filled[y]?.[x - 1] || filled[y]?.[x + 1]) {
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }

  // Fill pixels
  for (let y = 0; y < h; y++) {
    const row = rows[y]
    for (let x = 0; x < row.length; x++) {
      const col = tmpl.palette[row[x]]
      if (!col) continue
      ctx.fillStyle = col
      ctx.fillRect(x + pad, y + pad, 1, 1)
    }
  }

  return canvas.toDataURL('image/png')
}

export function getMenuIconUrl(id: MenuIconId): string {
  if (typeof document === 'undefined') return ''
  const cached = iconDataCache.get(id)
  if (cached) return cached
  const tmpl = TEMPLATES[id]
  if (!tmpl) return ''
  const url = renderTemplatePng(tmpl)
  iconDataCache.set(id, url)
  return url
}
