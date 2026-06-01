import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { readFileSync, readdirSync } from 'fs'
import { dirname, join, basename } from 'path'
import { fileURLToPath } from 'url'

dotenv.config({ path: new URL('../../.env', import.meta.url) })

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, '../../init.sql'), 'utf8')

async function init() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4',
    multipleStatements: true,
  })

  await conn.query(sql)

  // Migration tracking
  await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)

  const migrationsDir = join(__dirname, '../../migrations')
  let files = []
  try {
    files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && f !== '_tracking.sql')
      .sort()
  } catch {}

  const [executed] = await conn.query('SELECT filename FROM schema_migrations')
  const executedSet = new Set(executed.map(r => r.filename))

  for (const file of files) {
    if (!executedSet.has(file)) {
      const migrationSql = readFileSync(join(migrationsDir, file), 'utf8')
      await conn.query(migrationSql)
      await conn.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file])
    }
  }

  await conn.end()
}

init().catch(err => {
  console.error('数据库初始化失败:', err)
  process.exit(1)
})
