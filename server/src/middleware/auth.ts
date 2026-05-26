import { Request, Response, NextFunction } from 'express'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // GET requests are public
  if (req.method === 'GET') {
    return next()
  }

  const userId = req.headers['x-user-id'] as string
  if (!userId || typeof userId !== 'string' || userId.length < 8) {
    return res.status(401).json({
      code: 401,
      message: '缺少有效的用户标识 (X-User-Id)',
    })
  }

  next()
}