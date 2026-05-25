// server.js — จุดเริ่มต้น Express Server
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ─── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'null',        // เปิดไฟล์ HTML ตรงๆ (file://)
    '*',           // อนุญาตทุก origin ใน dev — จำกัดใน production
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Static: serve ไฟล์ HTML จาก parent folder ─────────────
app.use(express.static(path.join(__dirname, '..')));

// ─── Routes ─────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/courses',  require('./routes/courses'));
app.use('/api/entries',  require('./routes/entries'));
app.use('/api/settings', require('./routes/settings'));

// ─── Health check ────────────────────────────────────────────
app.get('/api/ping', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── 404 ─────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'ไม่พบ endpoint นี้' }));

// ─── Error handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
});

// ─── Auto-migration แล้วค่อย Start ──────────────────────────
async function addColumnIfMissing(pool, table, column, definition) {
  const chk = await pool.request().query(
    `SELECT COUNT(1) AS n FROM sys.columns
     WHERE object_id = OBJECT_ID(N'${table}') AND name = N'${column}'`
  );
  const exists = chk.recordset[0] && chk.recordset[0].n > 0;
  if (!exists) {
    await pool.request().query(
      `ALTER TABLE ${table} ADD ${column} ${definition}`
    );
    console.log(`✅ Migration: เพิ่ม column ${column} ใน ${table} เรียบร้อย`);
  } else {
    console.log(`✅ Migration: ${column} column พร้อมแล้ว`);
  }
}

async function runMigrations() {
  const { getPool } = require('./config/db');
  const pool = await getPool();

  await addColumnIfMissing(pool, 'Courses', 'is_public',   'BIT NOT NULL DEFAULT 0');
  await addColumnIfMissing(pool, 'Courses', 'year',        'INT NULL');
  await addColumnIfMissing(pool, 'Courses', 'course_type', 'NVARCHAR(50) NULL');

  // สร้างตาราง ActivityLog ถ้ายังไม่มี
  const chkLog = await pool.request().query(
    `SELECT COUNT(1) AS n FROM sys.tables WHERE name = N'ActivityLog'`
  );
  if (!chkLog.recordset[0].n) {
    await pool.request().query(`
      CREATE TABLE ActivityLog (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        user_id     INT           NULL,
        username    NVARCHAR(50)  NOT NULL DEFAULT '',
        action      NVARCHAR(100) NOT NULL,
        detail      NVARCHAR(500) NULL,
        ip          NVARCHAR(50)  NULL,
        created_at  DATETIME      NOT NULL DEFAULT GETDATE()
      )
    `);
    console.log('✅ Migration: สร้างตาราง ActivityLog เรียบร้อย');
  } else {
    console.log('✅ Migration: ActivityLog table พร้อมแล้ว');
  }
}

const PORT = process.env.PORT || 3000;

runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 Timetable Military API`);
      console.log(`   http://localhost:${PORT}`);
      console.log(`   http://localhost:${PORT}/api/ping`);
      console.log(`   http://localhost:${PORT}/timetable_military.html\n`);
    });
  })
  .catch(err => {
    console.error('❌ Migration failed:', err.message);
    console.log('⚠️  Starting server anyway (is_public column may be missing)...');
    app.listen(PORT, () => {
      console.log(`\n🚀 Timetable Military API (migration skipped)`);
      console.log(`   http://localhost:${PORT}\n`);
    });
  });
