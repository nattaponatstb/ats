require('dotenv').config();
const { getPool } = require('./config/db');
async function run() {
  const pool = await getPool();
  const r = await pool.request().query("SELECT [key], LEN([value]) as vlen FROM Settings ORDER BY [key]");
  console.log('Settings keys:');
  r.recordset.forEach(x => console.log(' ', x.key, '→ length:', x.vlen));

  const r2 = await pool.request().query("SELECT [value] FROM Settings WHERE [key]='subjects'");
  const subs = JSON.parse(r2.recordset[0]?.value || '[]');
  console.log('\nTotal subjects:', subs.length);

  const byType = {};
  subs.forEach(s => {
    (s.courseTypes||['(ไม่ระบุ)']).forEach(ct => {
      byType[ct] = (byType[ct]||0) + 1;
    });
    if (!(s.courseTypes||[]).length) byType['(ไม่ระบุ)'] = (byType['(ไม่ระบุ)']||0)+1;
  });
  console.log('\nวิชาแยกตาม courseType:');
  Object.entries(byType).sort().forEach(([k,v]) => console.log(' ', k, ':', v, 'วิชา'));
}
run().catch(e => console.error(e.message));
