import express from 'express'
import cors from 'cors'
import { authMiddleware } from './middleware/auth.js'
import { globalLimiter, eggSubmitLimiter, journeyCreateLimiter, duoCreateLimiter, duoJoinLimiter } from './middleware/rateLimit.js'
import citiesRouter from './routes/cities.js'
import journeysRouter from './routes/journeys.js'
import duoRouter from './routes/duo.js'
import eggsRouter from './routes/eggs.js'
import db from './db/connection.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(globalLimiter)

// Egg count endpoint (separate from eggs router)
app.get('/api/cities/egg-count', (_req, res) => {
  const counts = db.prepare(
    'SELECT city_name as cityName, COUNT(*) as count FROM eggs GROUP BY city_name'
  ).all()
  res.json({ code: 0, data: counts })
})

// Public routes
app.use('/api/cities', citiesRouter)
app.use('/api/eggs', eggsRouter)

// Auth-protected write routes
app.use(authMiddleware)
app.use('/api/journeys', journeyCreateLimiter, journeysRouter)
app.use('/api/duo', duoRouter)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})