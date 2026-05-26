import rateLimit from 'express-rate-limit'

// POST /api/eggs
export const eggSubmitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { code: 429, message: '提交太频繁，每分钟最多 5 条' },
  keyGenerator: (req) => req.ip || 'unknown',
})

// POST /api/journeys
export const journeyCreateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  message: { code: 429, message: '每天最多创建 10 条旅程' },
  keyGenerator: (req) => (req.headers['x-user-id'] as string) || req.ip || 'unknown',
})

// POST /api/duo/create
export const duoCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { code: 429, message: '每小时最多创建 3 个双人地图' },
  keyGenerator: (req) => req.ip || 'unknown',
})

// POST /api/duo/join — less restrictive
export const duoJoinLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { code: 429, message: '加入太频繁，每小时最多 10 次' },
  keyGenerator: (req) => (req.headers['x-user-id'] as string) || req.ip || 'unknown',
})
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { code: 429, message: '请求过于频繁' },
})