// seed-senior-e.js — เพิ่มรายวิชาหลักสูตรอาวุโส E + ติด courseTypes: ['อาวุโสE']
require('dotenv').config();
const { sql, getPool } = require('./config/db');

const TARGET_CT = 'อาวุโสE';

// ── รายวิชาทั้งหมดจากข้อมูลหลักสูตรอาวุโส E ─────────────────────────────────
const SENIOR_E_SUBJECTS = [
  // ── การเตรียมความพร้อม ───────────────────────────────────────────────────
  { name: 'การเตรียมความพร้อมของผู้เข้ารับการฝึกอบรม (ฝึกอบรม รร.ขส.ขส.ทบ.)',    totalHours:  8 },
  { name: 'ความรู้พื้นฐานอีเลิร์นนิ่ง (Principle of E-Learning)',                  totalHours:  1 },
  { name: 'ความรู้พื้นฐานคอมพิวเตอร์ และอินเตอร์เน็ต',                             totalHours:  1 },
  { name: 'ระบบการจัดการเรียนรู้ (Learning Management System)',                    totalHours:  2 },
  { name: 'โปรแกรมที่จำเป็นสำหรับการเรียนออนไลน์และการใช้สื่อการเรียน',            totalHours:  2 },
  { name: 'การฝึกเตรียมความพร้อมของผู้เข้าเรียนออนไลน์',                           totalHours:  2 },
  // ── วิชาหลัก (สอนผ่านสื่ออิเล็กทรอนิกส์) ────────────────────────────────
  { name: 'การจัดการเคลื่อนย้าย',                                                  totalHours: 48 },
  { name: 'การขนส่งด้วยรถยนต์',                                                    totalHours: 56 },
  { name: 'การขนส่งทางรถไฟ',                                                       totalHours: 40 },
  { name: 'การขนส่งทางน้ำ',                                                        totalHours: 40 },
  { name: 'การขนส่งทางอากาศ',                                                      totalHours: 40 },
  { name: 'การส่งกำลัง สป. สาย ขส.',                                               totalHours: 16 },
  { name: 'การซ่อมบำรุง สป. สาย ขส.',                                              totalHours: 16 },
  { name: 'การใช้แบบพิมพ์สายขนส่ง',                                                totalHours: 16 },
  { name: 'ภาษาอังกฤษ',                                                             totalHours: 16 },
  // ── วิชารอง ────────────────────────────────────────────────────────────────
  { name: 'ฝ่ายอำนวยการ',                                                           totalHours: 16 },
  { name: 'การบินทหารบก',                                                           totalHours:  4 },
  { name: 'ทหารราบ',                                                                totalHours:  4 },
  { name: 'ทหารม้า',                                                                totalHours:  4 },
  { name: 'ทหารปืนใหญ่',                                                            totalHours:  4 },
  { name: 'ทหารช่าง',                                                               totalHours:  4 },
  { name: 'ทหารสื่อสาร',                                                            totalHours:  3 },
  { name: 'ทหารพลาธิการ',                                                           totalHours:  3 },
  { name: 'ทหารแพทย์',                                                              totalHours:  3 },
  { name: 'ทหารสารวัตร',                                                            totalHours:  3 },
  { name: 'อาวุธศึกษา',                                                             totalHours:  4 },
  { name: 'ระเบียบงานสารบรรณ',                                                     totalHours:  4 },
  { name: 'ระเบียบการเงิน',                                                         totalHours:  4 },
  { name: 'ระเบียบการเงินส่วนบุคคล',                                                totalHours:  3 },
  // ── วิชาประกอบ ─────────────────────────────────────────────────────────────
  { name: 'การพัฒนาทักษะดิจิทัล',                                                  totalHours:  4 },
  { name: 'แผนที่และเครื่องหมายทางทหาร',                                            totalHours:  4 },
  { name: 'การป้องกันและปราบปรามการก่อความไม่สงบ',                                   totalHours:  4 },
  { name: 'ศาสนาและศีลธรรม',                                                        totalHours:  4 },
  { name: 'การรักษาความปลอดภัย',                                                    totalHours:  4 },
  { name: 'การต่อต้านการก่อการร้าย',                                                 totalHours:  4 },
  { name: 'จิตอาสา และค่านิยมหลัก 12 ประการ',                                       totalHours:  2 },
  { name: 'ตามรอยพระราชดำรัสปรัชญาเศรษฐกิจพอเพียง',                                totalHours:  2 },
  { name: 'การปลูกฝังอุดมการณ์รักชาติ',                                             totalHours:  2 },
  // ── วิชาหลัก (การศึกษาที่ รร.ขส.ขส.ทบ.) ─────────────────────────────────
  { name: 'การวางแผนการเคลื่อนย้ายและการขนส่ง',                                    totalHours: 80 },
  { name: 'การฝึกออกคำสั่งการเคลื่อนย้าย',                                          totalHours: 20 },
  { name: 'ฝึกการขอใช้ยานพาหนะเพื่อการขนส่ง',                                      totalHours: 30 },
  { name: 'ฝึกการรับ-ส่งสิ่งอุปกรณ์',                                               totalHours: 30 },
  // ── ภาคปฏิบัติ ─────────────────────────────────────────────────────────────
  { name: 'การจัดการฝึก',                                                           totalHours:  8 },
  { name: 'การฝึกภาคปฏิบัติทางการขนส่ง',                                            totalHours: 24 },
  // ── เบ็ดเตล็ด ──────────────────────────────────────────────────────────────
  { name: 'การพัฒนาระบบราชการแนวใหม่',                                              totalHours:  6 },
  { name: 'โรคอุบัติการณ์ใหม่และยาเสพติด',                                          totalHours:  2 },
  { name: 'สิทธิมนุษยชนขั้นพื้นฐาน และระเบียบสำนักนายกรัฐมนตรีฯ',                  totalHours:  2 },
  { name: 'ประวัติศาสตร์ทหาร',                                                      totalHours:  2 },
  { name: 'กฎหมายที่ทหารควรทราบ',                                                   totalHours:  2 },
  { name: 'การดำเนินกรรมวิธีเปิด-ปิด',                                              totalHours:  8 },
  { name: 'เวลาอะไหล่และเวลาผู้บังคับบัญชา',                                        totalHours:  7 },
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

async function run() {
  const pool = await getPool();

  // ── 1. โหลด subjects ปัจจุบัน ──────────────────────────────────────────────
  const settRow = await pool.request().query(
    `SELECT [value] FROM Settings WHERE [key] = 'subjects'`
  );
  const existing = settRow.recordset[0]
    ? JSON.parse(settRow.recordset[0].value || '[]')
    : [];

  const nameMap = new Map(existing.map(s => [s.name, s]));

  let added  = 0;
  let tagged = 0;
  let skip   = 0;

  // ── 2. Merge ──────────────────────────────────────────────────────────────
  for (const s of SENIOR_E_SUBJECTS) {
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
      const newObj = {
        id: uid(),
        name: s.name,
        totalHours: s.totalHours,
        group: '',
        courseTypes: [TARGET_CT],
      };
      existing.push(newObj);
      nameMap.set(s.name, newObj);
      added++;
      console.log(`  ✅ new  → ${s.name}`);
    }
  }

  // ── 3. บันทึกกลับ ──────────────────────────────────────────────────────────
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

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
