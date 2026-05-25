// config/db.js — PostgreSQL via pg (ใช้ได้บน Railway, Render, Supabase ฯลฯ)
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('connect', () => console.log('✅ Connected to PostgreSQL'));
pool.on('error',  (err) => console.error('❌ PostgreSQL error:', err.message));

// ── Request class — mimics mssql/msnodesqlv8 interface ───────────────────────
class Request {
  constructor() { this._params = {}; }

  input(name, typeOrValue, value) {
    // รองรับทั้ง input(name, type, value) และ input(name, value)
    const val = (value !== undefined) ? value : typeOrValue;
    this._params[name] = (val === undefined || val === '') ? null : val;
    return this;
  }

  async query(sqlText) {
    const values = [];
    const seen   = {};   // param name → $N index
    let   idx    = 0;

    // แปลง @paramName → $N (ตัวเดิมซ้ำใช้ index เดิม)
    const pgSql = sqlText.replace(/@(\w+)/g, (_, name) => {
      if (!(name in seen)) {
        seen[name] = ++idx;
        values.push((name in this._params) ? this._params[name] : null);
      }
      return '$' + seen[name];
    });

    const result = await pool.query(pgSql, values);
    return {
      recordset:    result.rows,
      rowsAffected: [result.rowCount],
    };
  }
}

async function getPool() {
  return { request: () => new Request() };
}

// sql type stubs — ใช้แค่ compatibility ไม่มีผลจริงใน pg
const sql = {
  NVarChar: () => null,
  VarChar:  () => null,
  Int:      null,
  Date:     null,
  Decimal:  () => null,
  MAX:      -1,
};

module.exports = { sql, getPool, pool };
