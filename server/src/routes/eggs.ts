import { Router, Request, Response } from 'express'
import db from '../db/connection.js'
import { eggSubmitLimiter } from '../middleware/rateLimit.js'

const router = Router()

// GET /api/eggs/:city - public
router.get('/:city', (req: Request, res: Response) => {
  const eggs = db.prepare(
    'SELECT id, city_name as cityName, nickname, message, is_seed as isSeed, created_at as createdAt FROM eggs WHERE city_name = ? ORDER BY RANDOM() LIMIT 3'
  ).all(req.params.city)

  res.json({ code: 0, data: eggs })
})

// POST /api/eggs - auth required + rate limited
router.post('/', eggSubmitLimiter, (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string
  if (!userId) {
    return res.status(401).json({ code: 401, message: '缺少用户标识' })
  }

  const { cityName, nickname, message } = req.body

  if (!cityName || !nickname || !message) {
    return res.status(400).json({ code: 400, message: '缺少必填字段' })
  }

  if (message.length > 140) {
    return res.status(400).json({ code: 400, message: '彩蛋内容不能超过 140 字' })
  }

  if (nickname.length > 50) {
    return res.status(400).json({ code: 400, message: '昵称不能超过 50 字' })
  }

  db.prepare(
    'INSERT INTO eggs (city_name, user_id, nickname, message) VALUES (?, ?, ?, ?)'
  ).run(cityName, userId, nickname, message)

  res.json({ code: 0, message: '彩蛋已留下' })
})

export default router