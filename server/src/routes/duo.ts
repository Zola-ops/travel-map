import { Router, Request, Response } from 'express'
import db from '../db/connection.js'
import { duoCreateLimiter, duoJoinLimiter } from '../middleware/rateLimit.js'

const router = Router()

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// POST /api/duo/create
router.post('/create', duoCreateLimiter, (req: Request, res: Response) => {
  const { nickname, cities } = req.body
  const userId = req.headers['x-user-id'] as string

  if (!nickname || !cities?.length) {
    return res.status(400).json({ code: 400, message: '缺少必填字段' })
  }

  const inviteCode = generateInviteCode()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const result = db.prepare(
    'INSERT INTO duo_sessions (invite_code, user_a_id, user_a_nickname, expires_at) VALUES (?, ?, ?, ?)'
  ).run(inviteCode, userId, nickname, expiresAt)

  const sessionId = result.lastInsertRowid as number

  const insertNode = db.prepare(
    'INSERT INTO duo_nodes (session_id, user_type, city_name, lat, lng, sort_order, label, meet_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )

  const insertNodes = db.transaction((cities: any[]) => {
    for (const city of cities) {
      insertNode.run(sessionId, 'A', city.cityName, city.lat, city.lng, city.sortOrder, city.label || null, city.meetText || null)
    }
  })

  insertNodes(cities)

  res.json({ code: 0, data: { inviteCode, sessionId } })
})

// POST /api/duo/:code/join
router.post('/:code/join', duoJoinLimiter, (req: Request, res: Response) => {
  const { nickname, cities } = req.body
  const userId = req.headers['x-user-id'] as string

  const session = db.prepare(
    'SELECT id, user_b_id, user_b_nickname, expires_at FROM duo_sessions WHERE invite_code = ?'
  ).get(req.params.code) as any

  if (!session) {
    return res.status(404).json({ code: 404, message: '邀请码不存在' })
  }

  if (new Date(session.expires_at) < new Date()) {
    return res.status(400).json({ code: 400, message: '邀请码已过期' })
  }

  if (session.user_b_id) {
    return res.status(400).json({ code: 400, message: '该双人地图已满' })
  }

  db.prepare('UPDATE duo_sessions SET user_b_id = ?, user_b_nickname = ? WHERE id = ?')
    .run(userId, nickname, session.id)

  const insertNode = db.prepare(
    'INSERT INTO duo_nodes (session_id, user_type, city_name, lat, lng, sort_order, label, meet_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )

  const insertNodes = db.transaction((cities: any[]) => {
    for (const city of cities) {
      insertNode.run(session.id, 'B', city.cityName, city.lat, city.lng, city.sortOrder, city.label || null, city.meetText || null)
    }
  })

  insertNodes(cities)

  res.json({ code: 0, data: { sessionId: session.id } })
})

// GET /api/duo/:code
router.get('/:code', (req: Request, res: Response) => {
  const session = db.prepare(
    'SELECT id, invite_code as inviteCode, user_a_id as userAId, user_b_id as userBId, user_a_nickname as userANickname, user_b_nickname as userBNickname, created_at as createdAt, expires_at as expiresAt FROM duo_sessions WHERE invite_code = ?'
  ).get(req.params.code) as any

  if (!session) {
    return res.status(404).json({ code: 404, message: '双人地图不存在' })
  }

  const nodes = db.prepare(
    'SELECT id, session_id as sessionId, user_type as userType, city_name as cityName, lat, lng, sort_order as sortOrder, label, meet_text as meetText FROM duo_nodes WHERE session_id = ? ORDER BY sort_order'
  ).all(session.id) as any[]

  const userANodes = nodes.filter((n: any) => n.userType === 'A')
  const userBNodes = nodes.filter((n: any) => n.userType === 'B')

  // Calculate meeting points (city name intersection)
  const citySetA = new Set(userANodes.map((n: any) => n.cityName))
  const meetingPoints = userBNodes
    .filter((n: any) => citySetA.has(n.cityName))
    .map((n: any) => {
      const nodeA = userANodes.find((a: any) => a.cityName === n.cityName)
      return {
        cityName: n.cityName,
        lat: n.lat,
        lng: n.lng,
        textA: nodeA?.meetText || null,
        textB: n.meetText || null,
      }
    })

  res.json({
    code: 0,
    data: { session, userANodes, userBNodes, meetingPoints },
  })
})

export default router