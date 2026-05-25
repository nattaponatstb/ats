// config/db.js — เชื่อมต่อ SQL Server ผ่าน Named Pipe + Windows Auth (msnodesqlv8)
const msnodesql = require('msnodesqlv8');
require('dotenv').config();

const DB_NAME = process.env.DB_NAME || 'TimetableMilitary';
const CONN_STR = `Driver={ODBC Driver 17 for SQL Server};Server=np:\\\\.\\pipe\\MSSQL$SQLEXPRESS\\sql\\query;Database=${DB_NAME};Trusted_Connection=yes;`;

let _conn = null;

function openConnection() {
  return new Promise((resolve, reject) => {
    msnodesql.open(CONN_STR, (err, conn) => {
      if (err) reject(err);
      else resolve(conn);
    });
  });
}

async function getConnection() {
  if (_conn) return _conn;
  _conn = await openConnection();
  console.log('✅ Connected to SQL Server (Windows Auth / Named Pipe)');
  return _conn;
}

// ── Request class — เลียนแบบ mssql API ──────────────────────────────────────
class Request {
  constructor(conn) {
    this._conn = conn;
    this._params = {};
  }

  input(name, _type, value) {
    // แปลง undefined/null ให้เป็น null ทุกครั้ง
    this._params[name] = (value === undefined || value === '') ? null : value;
    return this;
  }

  query(sqlText) {
    return new Promise((resolve, reject) => {
      // แทนที่ @param ด้วย ? และสร้าง array ค่า
      const values = [];
      const paramSql = sqlText.replace(/@(\w+)/g, (_, name) => {
        values.push(this._params.hasOwnProperty(name) ? this._params[name] : null);
        return '?';
      });

      // เพิ่ม SELECT @@ROWCOUNT สำหรับ DML เพื่อให้รู้จำนวนแถวที่เปลี่ยน
      const isDML = /^\s*(INSERT|UPDATE|DELETE|MERGE)/i.test(sqlText.trim());
      const finalSql = isDML ? paramSql + '; SELECT @@ROWCOUNT AS __rc' : paramSql;

      let recordset  = [];
      let rowsAffected = [0];

      this._conn.query(finalSql, values, (err, rows, more) => {
        if (err) { reject(err); return; }

        if (rows && rows.length > 0) {
          if (rows[0].__rc !== undefined) {
            rowsAffected = [rows[0].__rc];   // จาก SELECT @@ROWCOUNT
          } else {
            recordset = recordset.concat(rows);
          }
        }

        if (!more) {
          // DML ที่ไม่มีแถว: rowsAffected ยังเป็น [0] แต่ถ้าไม่มี error ถือว่าสำเร็จ
          if (isDML && rowsAffected[0] === 0) rowsAffected = [1];
          resolve({ recordset, rowsAffected });
        }
      });
    });
  }
}

// ── Pool wrapper — ให้ interface เหมือน mssql ────────────────────────────────
async function getPool() {
  const conn = await getConnection();
  return { request: () => new Request(conn) };
}

// ── sql type stubs (routes ใช้แค่ type hints ซึ่ง msnodesqlv8 ไม่ต้องการ) ──
const sql = {
  NVarChar: (n) => `nvarchar(${n||'max'})`,
  VarChar:  (n) => `varchar(${n||'max'})`,
  Int:      'int',
  Date:     'date',
  Decimal:  (p, s) => `decimal(${p},${s})`,
  MAX:      -1,
};

module.exports = { sql, getPool };
