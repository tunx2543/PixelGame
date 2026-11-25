import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'
import { PLAYER_BOT_DEFS } from '@/lib/game/player-bots'

interface BotReplyRequestBody {
  playerName?: string
  playerLevel?: number
  playerJobName?: string
  mapName?: string
  channel?: string
  message?: string
  mode?: 'chat' | 'whisper'
  targetBotUserId?: string
  recentMessages?: Array<{ author?: string; text: string }>
  botMaps?: Record<string, string>
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 503 })
  }

  let body: BotReplyRequestBody
  try {
    body = (await req.json()) as BotReplyRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const playerMessage = String(body.message ?? '').trim().slice(0, 160)
  if (!playerMessage) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const mode = body.mode === 'whisper' ? 'whisper' : 'chat'
  const targetBot = body.targetBotUserId
    ? PLAYER_BOT_DEFS.find((b) => b.userId === body.targetBotUserId || b.gameUid === body.targetBotUserId)
    : undefined

  const activeBots = targetBot ? [targetBot] : PLAYER_BOT_DEFS
  const botRosterText = activeBots
    .map((b) => {
      const loc = body.botMaps?.[b.userId] ?? b.homeMapId
      return `- botUserId="${b.userId}", ชื่อ="${b.displayName}", Lv.${b.level}, แมพปัจจุบัน="${loc}": ${b.personalityPrompt}`
    })
    .join('\n')

  const historyLines = (body.recentMessages ?? [])
    .slice(-6)
    .map((m) => `${m.author || 'ระบบ'}: ${String(m.text ?? '').slice(0, 100)}`)
    .join('\n')

  const systemInstruction = [
    'คุณกำลังสวมบทบาทเป็นผู้เล่นจริงในเกม RPG ออนไลน์ชื่อ Pixel Quest (ห้ามบอกว่าตัวเองเป็น AI หรือบอทเด็ดขาด ให้พูดเหมือนผู้เล่นคนไทยจริงๆ)',
    'กฎการตอบ:',
    '- ตอบเป็นภาษาแชทเกมคนไทยที่ดูเป็นธรรมชาติ กระชับ สั้น 1 ประโยค (ไม่เกิน 90 ตัวอักษร) และใส่อิโมจิเล็กน้อยให้มีชีวิตชีวา',
    mode === 'whisper'
      ? '- นี่คือข้อความกระซิบ (Whisper) ให้ตัวละครเป้าหมายตอบกลับแค่ 1 ข้อความ'
      : '- เลือก 1 หรือ 2 ตัวละครที่เหมาะกับบริบทมาตอบ (ถ้าข้อความไม่ได้คุยกับใครโดยเฉพาะ ให้ตอบ 1 คน หรือ 2 คนโต้ตอบกันสั้นๆ)',
    '- ใช้เฉพาะ botUserId ที่มีในรายชื่อเท่านั้น',
  ].join('\n')

  const prompt = [
    `ผู้เล่นชื่อ: ${String(body.playerName || 'นักผจญภัย').slice(0, 24)} (Lv.${Number(body.playerLevel || 1)}, อาชีพ ${String(body.playerJobName || 'Wayfarer').slice(0, 24)})`,
    `อยู่ที่แมพ: ${String(body.mapName || 'เมืองปราการเริ่มต้น').slice(0, 40)} | ช่องแชท: ${String(body.channel || 'world')}`,
    `ผู้เล่นในเซิร์ฟเวอร์ตอนนี้:\n${botRosterText}`,
    historyLines ? `บทสนทนาล่าสุด:\n${historyLines}` : '',
    `ข้อความใหม่จากผู้เล่น: "${playerMessage}"`,
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  botUserId: { type: Type.STRING },
                  text: { type: Type.STRING },
                },
                required: ['botUserId', 'text'],
              },
            },
          },
          required: ['replies'],
        },
      },
    })

    const parsed = JSON.parse((response.text ?? '{"replies":[]}').trim()) as {
      replies?: Array<{ botUserId?: string; text?: string }>
    }
    const validIds = new Set(activeBots.map((b) => b.userId))
    const replies = (parsed.replies ?? [])
      .filter((r) => r.botUserId && validIds.has(r.botUserId) && typeof r.text === 'string' && r.text.trim())
      .slice(0, mode === 'whisper' ? 1 : 2)
      .map((r) => ({
        botUserId: r.botUserId!,
        text: r.text!.trim().slice(0, 120),
      }))

    return NextResponse.json({ replies })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate bot reply'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
