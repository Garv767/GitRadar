const mysql = require('mysql2/promise');
const { Pool } = require('pg');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

let pool;
let dialect = 'mysql';

if (isPostgres) {
  dialect = 'postgres';
  console.log('🔌 DB: Detected PostgreSQL/Neon connection string.');
  pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });
} else {
  dialect = 'mysql';
  console.log('🔌 DB: Detected MySQL connection string / fallback.');
  // Parse simple connection string or build from individual config
  if (dbUrl) {
    pool = mysql.createPool(dbUrl);
  } else {
    // Fallback default mysql settings
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'reporadar',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
}

// Unified query wrapper
async function query(text, params) {
  if (isPostgres) {
    // pg uses $1, $2 instead of ?
    // Let's replace ? with $1, $2, etc. automatically
    let index = 1;
    const pgText = text.replace(/\?/g, () => `$${index++}`);
    const res = await pool.query(pgText, params);
    return res.rows;
  } else {
    const [rows] = await pool.execute(text, params);
    return rows;
  }
}

// Initialize tables automatically
async function initDatabase() {
  try {
    console.log(`🛠️ DB: Initializing schema for ${dialect.toUpperCase()}...`);
    if (isPostgres) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS profiles (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) NOT NULL UNIQUE,
          name VARCHAR(150),
          avatar_url TEXT,
          bio TEXT,
          public_repos INT DEFAULT 0,
          public_gists INT DEFAULT 0,
          followers INT DEFAULT 0,
          following INT DEFAULT 0,
          location VARCHAR(150),
          company VARCHAR(150),
          blog VARCHAR(255),
          github_created_at VARCHAR(50),
          developer_score INT DEFAULT 0,
          developer_grade VARCHAR(5) DEFAULT 'C',
          analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS repositories (
          id SERIAL PRIMARY KEY,
          profile_id INT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          repo_name VARCHAR(150) NOT NULL,
          stars INT DEFAULT 0,
          forks INT DEFAULT 0,
          language VARCHAR(100),
          html_url TEXT
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS languages (
          id SERIAL PRIMARY KEY,
          profile_id INT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          language VARCHAR(100) NOT NULL,
          bytes_count BIGINT DEFAULT 0,
          percentage DECIMAL(5,2) DEFAULT 0.00
        )
      `);
    } else {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS profiles (
          id INT NOT NULL AUTO_INCREMENT,
          username VARCHAR(100) NOT NULL UNIQUE,
          name VARCHAR(150),
          avatar_url TEXT,
          bio TEXT,
          public_repos INT DEFAULT 0,
          public_gists INT DEFAULT 0,
          followers INT DEFAULT 0,
          following INT DEFAULT 0,
          location VARCHAR(150),
          company VARCHAR(150),
          blog VARCHAR(255),
          github_created_at VARCHAR(50),
          developer_score INT DEFAULT 0,
          developer_grade VARCHAR(5) DEFAULT 'C',
          analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        )
      `);

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS repositories (
          id INT NOT NULL AUTO_INCREMENT,
          profile_id INT NOT NULL,
          repo_name VARCHAR(150) NOT NULL,
          stars INT DEFAULT 0,
          forks INT DEFAULT 0,
          language VARCHAR(100),
          html_url TEXT,
          PRIMARY KEY (id),
          FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
        )
      `);

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS languages (
          id INT NOT NULL AUTO_INCREMENT,
          profile_id INT NOT NULL,
          language VARCHAR(100) NOT NULL,
          bytes_count INT DEFAULT 0,
          percentage DECIMAL(5,2) DEFAULT 0.00,
          PRIMARY KEY (id),
          FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
        )
      `);
    }
    console.log('✅ DB: Schema initialized successfully.');
  } catch (error) {
    console.error('❌ DB: Error initializing schema:', error);
  }
}

module.exports = {
  query,
  initDatabase,
  dialect,
  isPostgres
};
