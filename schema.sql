-- Database Schema for GitHub Profile Analyzer
-- Supports both MySQL and PostgreSQL

-- 1. PROFILES TABLE
-- Stores the high-level analyzed developer information
CREATE TABLE IF NOT EXISTS profiles (
  id INT NOT NULL AUTO_INCREMENT, -- or SERIAL in Postgres
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
);

-- For PostgreSQL compatibility (run if using Neon/Postgres):
-- CREATE TABLE IF NOT EXISTS profiles (
--   id SERIAL PRIMARY KEY,
--   username VARCHAR(100) NOT NULL UNIQUE,
--   name VARCHAR(150),
--   avatar_url TEXT,
--   bio TEXT,
--   public_repos INT DEFAULT 0,
--   public_gists INT DEFAULT 0,
--   followers INT DEFAULT 0,
--   following INT DEFAULT 0,
--   location VARCHAR(150),
--   company VARCHAR(150),
--   blog VARCHAR(255),
--   github_created_at VARCHAR(50),
--   developer_score INT DEFAULT 0,
--   developer_grade VARCHAR(5) DEFAULT 'C',
--   analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- 2. REPOSITORIES TABLE
-- Stores top repositories for analyzed profiles
CREATE TABLE IF NOT EXISTS repositories (
  id INT NOT NULL AUTO_INCREMENT, -- or SERIAL in Postgres
  profile_id INT NOT NULL,
  repo_name VARCHAR(150) NOT NULL,
  stars INT DEFAULT 0,
  forks INT DEFAULT 0,
  language VARCHAR(100),
  html_url TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- For PostgreSQL compatibility (run if using Neon/Postgres):
-- CREATE TABLE IF NOT EXISTS repositories (
--   id SERIAL PRIMARY KEY,
--   profile_id INT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
--   repo_name VARCHAR(150) NOT NULL,
--   stars INT DEFAULT 0,
--   forks INT DEFAULT 0,
--   language VARCHAR(100),
--   html_url TEXT
-- );

-- 3. LANGUAGES TABLE
-- Stores the computed language breakdown (in bytes)
CREATE TABLE IF NOT EXISTS languages (
  id INT NOT NULL AUTO_INCREMENT, -- or SERIAL in Postgres
  profile_id INT NOT NULL,
  language VARCHAR(100) NOT NULL,
  bytes_count INT DEFAULT 0,
  percentage DECIMAL(5,2) DEFAULT 0.00,
  PRIMARY KEY (id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- For PostgreSQL compatibility (run if using Neon/Postgres):
-- CREATE TABLE IF NOT EXISTS languages (
--   id SERIAL PRIMARY KEY,
--   profile_id INT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
--   language VARCHAR(100) NOT NULL,
--   bytes_count BIGINT DEFAULT 0,
--   percentage DECIMAL(5,2) DEFAULT 0.00
-- );
