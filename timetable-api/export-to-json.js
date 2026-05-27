// export-to-json.js — ดึงข้อมูลทั้งหมดจาก SQL Server แล้วบันทึกเป็น JSON
// สำหรับนำเข้าใน GitHub Pages ผ่านปุ่ม "📥 นำเข้าข้อมูล"
//
// วิธีใช้: node export-to-json.js
require('dotenv').config();
const fs      = require('fs');
const path    = require('path');

// ใช้ config db เดิม (msnodesqlv8 / SQL Server)
const msnodesql = require('msnodesqlv8');

const DB_NAME = process.env.DB_NAME || 'TimetableMilitary';
const CONN_STR = `Driver={ODBC Driver 17 for SQL Server};Server=np:\\\\.\\pipe\\MSSQL$SQLEXPRESS\\sql\\query;Database=${DB_NAME};Trusted_Connection=yes;`;

function query(conn, sql) {
  return new Promise((resolve, reject) => {
    const rows = [];
    conn.query(sql, [], (err, res, more) => {
      if (err) return reject(err);
      if (res) rows.push(...res);
      if (!more) resolve(rows);
    });
  });
}

async function main() {
  console.log('🔌 กำลังเชื่อมต่อ SQL Server...');

  const conn = await new Promise((resolve, reject) =>
    msnodesql.open(CONN_STR, (err, c) => err ? reject(err) : resolve(c))
  );
  console.log('✅ เชื่อมต่อสำเร็จ');

  // ── 1. Settings ──────────────────────────────────────────────────────────
  console.log('📦 กำลังดึง Settings...');
  const settRows = await query(conn, 'SELECT [key],[value] FROM Settings');
  const settings = {};
  settRows.forEach(r => { settings[r.key] = r.value; });

  // ── 2. Courses ───────────────────────────────────────────────────────────
  console.log('📚 กำลังดึง Courses...');
  let courses = [];
  try {
    courses = await query(conn,
      `SELECT id, name, run_number, year, start_date, end_date, total_hours,
              course_type, is_public, signer_label, signer_rank, signer_name,
              signer_pos1, signer_pos2, signer_date, created_at, updated_at
       FROM Courses ORDER BY year DESC, start_date DESC, created_at DESC`
    );
    // แปลง date → string ISO (YYYY-MM-DD)
    courses = courses.map(c => ({
      ...c,
      start_date:  c.start_date ? new Date(c.start_date).toISOString().split('T')[0] : null,
      end_date:    c.end_date   ? new Date(c.end_date).toISOString().split('T')[0]   : null,
      created_at:  c.created_at ? new Date(c.created_at).toISOString() : null,
      updated_at:  c.updated_at ? new Date(c.updated_at).toISOString() : null,
      is_public:   c.is_public ? 1 : 0,
    }));
  } catch (e) {
    console.warn('⚠️  ดึง Courses ไม่สำเร็จ:', e.message);
  }

  // ── 3. Entries ───────────────────────────────────────────────────────────
  console.log('📋 กำลังดึง Entries...');
  let entries = [];
  try {
    entries = await query(conn,
      `SELECT id, course_id, type, entry_date, week,
              start_time, end_time, subject,
              teacher1, teacher2, teacher3,
              rank1, rank2, rank3,
              method, location, evidence, uniform, notes,
              cum_hours, total_hours, label, created_at, updated_at
       FROM Entries ORDER BY entry_date, start_time`
    );
    entries = entries.map(e => ({
      ...e,
      entry_date: e.entry_date ? new Date(e.entry_date).toISOString().split('T')[0] : null,
      created_at: e.created_at ? new Date(e.created_at).toISOString() : null,
      updated_at: e.updated_at ? new Date(e.updated_at).toISOString() : null,
    }));
  } catch (e) {
    console.warn('⚠️  ดึง Entries ไม่สำเร็จ:', e.message);
  }

  conn.close();

  // ── 4. สร้างไฟล์ JSON ────────────────────────────────────────────────────
  const output = {
    version:    1,
    exportedAt: new Date().toISOString(),
    settings,
    courses,
    entries,
  };

  const filename = `timetable-export-${new Date().toISOString().slice(0,10)}.json`;
  const filepath  = path.join(__dirname, '..', filename);
  fs.writeFileSync(filepath, JSON.stringify(output, null, 2), 'utf8');

  console.log('\n🎉 Export สำเร็จ!');
  console.log(`   📁 ไฟล์ : ${filepath}`);
  console.log(`   📚 Courses  : ${courses.length} หลักสูตร`);
  console.log(`   📋 Entries  : ${entries.length} รายการ`);
  console.log(`   ⚙️  Settings : ${Object.keys(settings).length} รายการ`);
  console.log('\n📌 ขั้นตอนถัดไป:');
  console.log('   1. เปิด https://nattaponatstb.github.io/ats/');
  console.log('   2. Login → ⚙️ ตั้งค่า');
  console.log('   3. กด "📥 นำเข้าข้อมูล (JSON)"');
  console.log(`   4. เลือกไฟล์ ${filename}`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
