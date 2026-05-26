import { Router, Request, Response } from 'express'
import db from '../db/connection.js'

const router = Router()

// POST /api/journeys
router.post('/', (req: Request, res: Response) => {
  const { userNickname, journeyName, templateType, cities } = req.body
  const userId = req.headers['x-user-id'] as string

  if (!journeyName || !templateType || !cities?.length) {
    return res.status(400).json({ code: 400, message: '缺少必填字段' })
  }

  const result = db.prepare(
    'INSERT INTO journeys (user_id, user_nickname, journey_name, template_type) VALUES (?, ?, ?, ?)'
  ).run(userId, userNickname, journeyName, templateType)

  const journeyId = result.lastInsertRowid as number

  const insertCity = db.prepare(
    'INSERT INTO journey_cities (journey_id, city_name, lat, lng, sort_order, transport, label) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )

  const insertMany = db.transaction((cities: any[]) => {
    for (const city of cities) {
      insertCity.run(journeyId, city.cityName, city.lat, city.lng, city.sortOrder, city.transport, city.label || null)
    }
  })

  insertMany(cities)

  res.json({ code: 0, data: { id: journeyId } })
})

// GET /api/journeys
router.get('/', (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string
  if (!userId) {
    return res.json({ code: 0, data: [] })
  }

  const journeys = db.prepare(
    'SELECT id, user_nickname as userNickname, journey_name as journeyName, template_type as templateType, created_at as createdAt FROM journeys WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId)

  res.json({ code: 0, data: journeys })
})

// GET /api/journeys/:id
router.get('/:id', (req: Request, res: Response) => {
  const journey = db.prepare(
    'SELECT id, user_nickname as userNickname, journey_name as journeyName, template_type as templateType, created_at as createdAt FROM journeys WHERE id = ?'
  ).get(req.params.id) as any

  if (!journey) {
    return res.status(404).json({ code: 404, message: '旅程不存在' })
  }

  const cities = db.prepare(
    'SELECT id, city_name as cityName, lat, lng, sort_order as sortOrder, transport, label FROM journey_cities WHERE journey_id = ? ORDER BY sort_order'
  ).all(req.params.id)

  res.json({ code: 0, data: { ...journey, cities } })
})

// PUT /api/journeys/:id/cities
router.put('/:id/cities', (req: Request, res: Response) => {
  const { cities } = req.body
  const journeyId = parseInt(req.params.id)

  const journey = db.prepare('SELECT id FROM journeys WHERE id = ?').get(journeyId)
  if (!journey) {
    return res.status(404).json({ code: 404, message: '旅程不存在' })
  }

  db.prepare('DELETE FROM journey_cities WHERE journey_id = ?').run(journeyId)

  const insertCity = db.prepare(
    'INSERT INTO journey_cities (journey_id, city_name, lat, lng, sort_order, transport, label) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )

  const updateCities = db.transaction((cities: any[]) => {
    for (const city of cities) {
      insertCity.run(journeyId, city.cityName, city.lat, city.lng, city.sortOrder, city.transport, city.label || null)
    }
  })

  updateCities(cities)

  res.json({ code: 0, message: '更新成功' })
})

export default router