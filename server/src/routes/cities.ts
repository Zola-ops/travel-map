import { Router, Request, Response } from 'express'
import db from '../db/connection.js'

const router = Router()

// GET /api/cities/search?q=keyword
router.get('/search', (req: Request, res: Response) => {
  const q = (req.query.q as string || '').trim()
  if (!q) {
    return res.json({ code: 0, data: [] })
  }

  const cities = db.prepare(
    'SELECT id, city_name as cityName, lat, lng, country, level FROM cities WHERE city_name LIKE ? LIMIT 10'
  ).all(`%${q}%`)

  res.json({ code: 0, data: cities })
})

export default router