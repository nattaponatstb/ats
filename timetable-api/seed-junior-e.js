// seed-junior-e.js — เพิ่มรายวิชาหลักสูตรชั้นต้น E + ติด courseTypes: ['ช.ต้นE']
require('dotenv').config();
const { sql, getPool } = require('./config/db');

const TARGET_CT = 'ช.ต้นE';

const JUNIOR_E_SUBJECTS = [
  // ── ปฐมนิเทศ ─────────────────────────────────────────────────────────────
  { name: 'การฝึกเตรียมความพร้อมของผู้เรียน (ฝึกอบรม ณ รร.ขส.ขส.ทบ.)',         totalHours:  8 },
  // ── 2.1 วิชาหลัก (สอนผ่านสื่ออิเล็กทรอนิกส์) ───────────────────────────
  { name: 'การเคลื่อนย้าย',                                                     totalHours: 40 },
  { name: 'การขนส่งด้วยรถยนต์',                                                 totalHours: 48 },
  { name: 'การขนส่งทางรถไฟ',                                                    totalHours: 24 },
  { name: 'การขนส่งทางน้ำ',                                                     totalHours: 24 },
  { name: 'การขนส่งทางอากาศ',                                                   totalHours: 24 },
  { name: 'ภาษาอังกฤษ',                                                         totalHours: 16 },
  { name: 'การใช้แบบพิมพ์สายขนส่ง',                                             totalHours: 16 },
  { name: 'การส่งกำลังบำรุง สป. สายขนส่ง',                                      totalHours: 16 },
  // ── 2.1 วิชารอง ─────────────────────────────────────────────────────────
  { name: 'การจัดการฝึก',                                                       totalHours:  4 },
  { name: 'ครูทหารและการฝึกที่เน้นผลการปฏิบัติ',                                totalHours:  2 },
  { name: 'ฝ่ายอำนวยการ',                                                       totalHours:  6 },
  { name: 'การศาสนาและศีลธรรม',                                                  totalHours:  2 },
  { name: 'การป้องกันและปราบปรามการก่อความไม่สงบ',                               totalHours:  2 },
  { name: 'ผู้นำหน่วยทหาร',                                                     totalHours:  4 },
  // ── 2.1 วิชาประกอบ ──────────────────────────────────────────────────────
  { name: 'การพัฒนาทักษะดิจิทัล',                                               totalHours:  4 },
  { name: 'การปลูกฝังอุดมการณ์และความรักชาติ',                                  totalHours:  2 },
  { name: 'ระเบียบการเงินส่วนบุคคล',                                             totalHours:  2 },
  { name: 'กฎหมายที่ทหารควรทราบ',                                               totalHours:  2 },
  // ── 2.2 วิชาหลัก (การฝึกอบรมที่ รร.ขส.ขส.ทบ.) ──────────────────────────
  { name: 'การวางแผนการเคลื่อนย้ายและการขนส่ง',                                 totalHours: 40 },
  // ── 3 ภาคปฏิบัติ ─────────────────────────────────────────────────────────
  { name: 'การฝึกภาคสนามทางการขนส่ง',                                           totalHours: 40 },
  // ── 4 เบ็ดเตล็ด ──────────────────────────────────────────────────────────
  { name: 'จิตอาสาพระราชทาน และค่านิยมหลัก 12 ประการ',                          totalHours:  2 },
  { name: 'ตามรอยพระราชดำรัสปรัชญาเศรษฐกิจพอเพียง',                            totalHours:  2 },
  { name: 'โรคอุบัติการณ์ใหม่และยาเสพติด',                                      totalHours:  2 },
  { name: 'ประวัติศาสตร์ทหาร',                                                  totalHours:  2 },
  { name: 'การดำเนินกรรมวิธีเปิด-ปิด',                                          totalHours:  8 },
  { name: 'เวลาอะไหล่และเวลาผู้บังคับบัญชา',                                    totalHours:  5 },
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

async function run() {
  const pool = await getPool();

  const settRow = await pool.request().query(
    `SELECT [value] FROM Settings WHERE [key] = 'subjects'`
  );
  const existing = settRow.recordset[0]
    ? JSON.parse(settRow.recordset[0].value || '[]')
    : [];

  const nameMap = new Map(existing.map(s => [s.name, s]));
  let added = 0, tagged = 0, skip = 0;

  for (const s of JUNIOR_E_SUBJECTS) {
    if (nameMap.has(s.name)) {
      const obj = nameMap.get(s.name);
      if (!obj.courseTypes) obj.courseTypes = [];
      if (!obj.courseTypes.includes(TARGET_CT)) {
        obj.courseTypes.push(TARGET_CT);
        tagged++;
        console.log(`  🏷️  tag  → ${s.name}`);
      } else {
        skip++;
      }
    } else {
      const newObj = { id: uid(), name: s.name, totalHours: s.totalHours, group: '', courseTypes: [TARGET_CT] };
      existing.push(newObj);
      nameMap.set(s.name, newObj);
      added++;
      console.log(`  ✅ new  → ${s.name}`);
    }
  }

  const json = JSON.stringify(existing);
  await pool.request()
    .input('v', sql.NVarChar(sql.MAX), json)
    .query(`MERGE Settings AS t
            USING (SELECT 'subjects' AS [key]) AS s ON t.[key] = s.[key]
            WHEN MATCHED     THEN UPDATE SET [value] = @v
            WHEN NOT MATCHED THEN INSERT([key],[value]) VALUES('subjects', @v);`);

  console.log(`\n🎉 เสร็จสิ้น!`);
  console.log(`   ✅ เพิ่มวิชาใหม่  : ${added}  วิชา`);
  console.log(`   🏷️  ติด tag        : ${tagged} วิชา`);
  console.log(`   ⏭️  ข้ามแล้ว       : ${skip} วิชา`);
  console.log(`   📚 รวมทั้งหมด     : ${existing.length} วิชา`);
  console.log('   รีเฟรชหน้าเว็บเพื่อดูผล');
  process.exit(0);
}

run().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
