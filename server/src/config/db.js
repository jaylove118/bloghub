import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../.env', import.meta.url) });

async function ensureTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) NOT NULL,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN role ENUM('user','admin') NOT NULL DEFAULT 'user' AFTER github`)
    } catch (_) {
      // Column already exists (MySQL doesn't support IF NOT EXISTS for ADD COLUMN)
    }
  } catch (err) {
    console.error('[DB] Failed to create tables:', err.message)
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bloghub',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 10000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

export default pool
export { ensureTables };
