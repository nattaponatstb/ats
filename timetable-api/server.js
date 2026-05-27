// server.js — Express Server (PostgreSQL / Railway ready)
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const bcrypt  = require('bcryptjs');

const app = express();

// ─── CORS ────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // อนุญาต: null (file://), localhost, GitHub Pages, หรือ origin ที่กำหนดใน env
    if (!origin || origin === 'null') return cb(null, true);
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return cb(null, true);
    if (origin.includes('github.io')) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (process.env.NODE_ENV !== 'production') return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Static files ────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..')));

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/courses',  require('./routes/courses'));
app.use('/api/entries',  require('./routes/entries'));
app.use('/api/settings', require('./routes/settings'));

// ─── Health check ─────────────────────────────────────────────
app.get('/api/ping', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── 404 / Error ──────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'ไม่พบ endpoint นี้' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
});

// ─── Auto-setup tables + default admin ───────────────────────
async function runMigrations() {
  const { pool } = require('./config/db');

  // สร้าง tables ถ้ายังไม่มี
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key   VARCHAR(100) NOT NULL PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL       PRIMARY KEY,
      username   VARCHAR(50)  NOT NULL UNIQUE,
      password   VARCHAR(255) NOT NULL,
      role       VARCHAR(20)  NOT NULL DEFAULT 'user',
      full_name  VARCHAR(100),
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS courses (
      id           VARCHAR(50)  NOT NULL PRIMARY KEY,
      name         VARCHAR(255) NOT NULL,
      run_number   VARCHAR(50),
      year         INTEGER,
      start_date   DATE,
      end_date     DATE,
      total_hours  INTEGER,
      course_type  VARCHAR(50),
      is_public    BOOLEAN      NOT NULL DEFAULT FALSE,
      signer_label VARCHAR(100),
      signer_rank  VARCHAR(50),
      signer_name  VARCHAR(100),
      signer_pos1  VARCHAR(255),
      signer_pos2  VARCHAR(255),
      signer_date  VARCHAR(50),
      created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS entries (
      id          VARCHAR(50)  NOT NULL PRIMARY KEY,
      course_id   VARCHAR(50)  NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      type        VARCHAR(20)  NOT NULL DEFAULT 'lesson',
      entry_date  DATE,
      week        INTEGER,
      start_time  VARCHAR(10),
      end_time    VARCHAR(10),
      subject     VARCHAR(255),
      teacher1    VARCHAR(100),
      teacher2    VARCHAR(100),
      teacher3    VARCHAR(100),
      rank1       VARCHAR(50),
      rank2       VARCHAR(50),
      rank3       VARCHAR(50),
      method      VARCHAR(100),
      location    VARCHAR(100),
      evidence    VARCHAR(100),
      uniform     VARCHAR(100),
      notes       VARCHAR(500),
      cum_hours   DECIMAL(6,1),
      total_hours DECIMAL(6,1),
      label       VARCHAR(255),
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_entries_course_date ON entries(course_id, entry_date);

    CREATE TABLE IF NOT EXISTS activity_log (
      id         SERIAL       PRIMARY KEY,
      user_id    INTEGER,
      username   VARCHAR(50)  NOT NULL DEFAULT '',
      action     VARCHAR(100) NOT NULL,
      detail     VARCHAR(500) NOT NULL DEFAULT '',
      ip         VARCHAR(50)  NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✅ Tables ready');

  // สร้าง admin1 ถ้ายังไม่มี user ใดเลย
  const { rows } = await pool.query('SELECT COUNT(1) AS n FROM users');
  if (parseInt(rows[0].n) === 0) {
    const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin1234', 10);
    await pool.query(
      `INSERT INTO users(username, password, role, full_name)
       VALUES('admin1', $1, 'admin', 'ผู้ดูแลระบบ') ON CONFLICT DO NOTHING`,
      [hashed]
    );
    console.log('✅ Default admin1 created (password: ' + (process.env.ADMIN_PASSWORD || 'admin1234') + ')');
  }

  // default settings
  await pool.query(`
    INSERT INTO settings(key, value)
    VALUES ('schoolName', 'โรงเรียนทหารขนส่ง กรมการขนส่งทหารบก')
    ON CONFLICT (key) DO NOTHING
  `);
}

const PORT = process.env.PORT || 3000;

runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 Timetable Military API (PostgreSQL)`);
      console.log(`   http://localhost:${PORT}/api/ping`);
      console.log(`   http://localhost:${PORT}/timetable_military.html\n`);
    });
  })
  .catch(err => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  });
