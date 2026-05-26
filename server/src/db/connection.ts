import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'journey.db')
const dbDir = path.dirname(dbPath)

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const db = new Database(dbPath)

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Initialize schema
const initSQL = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf-8')
db.exec(initSQL)

// Seed data if cities table is empty
const cityCount = db.prepare('SELECT COUNT(*) as count FROM cities').get() as { count: number }
if (cityCount.count === 0) {
  const seedSQL = fs.readFileSync(path.join(__dirname, 'seed-full.sql'), 'utf-8')
  db.exec(seedSQL)
  console.log('Database seeded with initial data')
}

export default db