// seed-captain.js — เพิ่มรายวิชาหลักสูตรชั้นนายร้อย + ติด courseTypes: ['ช.ร้อย']
require('dotenv').config();
const { sql, getPool } = require('./config/db');

const TARGET_CT = 'ช.ร้อย';

// ── รายวิชาทั้งหมดจากไฟล์ Excel หลักสูตรชั้นนายร้อย ──────────────────────
const CAPTAIN_SUBJECTS = [
  // ภาคทฤษฎี — วิชาหลัก
  { name: 'การเคลื่อนย้าย',                                                                         totalHours: 58 },
  { name: 'การขนส่งทางรถยนต์',                                                                      totalHours: 55 },
  { name: 'การขนส่งทางรถไฟ',                                                                        totalHours: 40 },
  { name: 'การขนส่งทางน้ำ',                                                                         totalHours: 40 },
  { name: 'การขนส่งทางอากาศ',                                                                       totalHours: 40 },
  { name: 'การส่งกำลังและซ่อมบำรุงสิ่งอุปกรณ์สายขนส่ง',                                            totalHours: 20 },
  { name: 'ภาษาอังกฤษ',                                                                             totalHours: 20 },
  // ภาคทฤษฎี — วิชารอง (การทหาร)
  { name: 'ทหารราบ',                                                                                totalHours:  4 },
  { name: 'ทหารม้า',                                                                                totalHours:  4 },
  { name: 'ทหารปืนใหญ่',                                                                            totalHours:  4 },
  { name: 'ทหารช่าง',                                                                               totalHours:  4 },
  { name: 'ทหารสื่อสาร',                                                                            totalHours:  3 },
  { name: 'ทหารสรรพาวุธ',                                                                           totalHours:  3 },
  { name: 'ทหารพลาธิการ',                                                                           totalHours:  3 },
  { name: 'ทหารสารบรรณ',                                                                            totalHours:  3 },
  { name: 'ทหารการเงิน',                                                                            totalHours:  3 },
  { name: 'ทหารสารวัตร',                                                                            totalHours:  3 },
  { name: 'ทหารแพทย์',                                                                              totalHours:  3 },
  // ภาคทฤษฎี — วิชารอง (อื่นๆ)
  { name: 'ฝ่ายอำนวยการ',                                                                           totalHours: 12 },
  { name: 'แผนที่และเครื่องหมายทางทหาร',                                                            totalHours:  4 },
  { name: 'การบินทหารบก',                                                                           totalHours:  4 },
  { name: 'ปลัดบัญชี',                                                                              totalHours:  4 },
  { name: 'ผู้นำหน่วยทหาร',                                                                         totalHours:  4 },
  { name: 'การบรรยายสรุป/ศัพท์ทหาร/ครูทหาร และการฝึกที่เน้นผลการปฏิบัติ',                          totalHours:  4 },
  // ภาคทฤษฎี — วิชาประกอบ
  { name: 'คอมพิวเตอร์และการพัฒนาทักษะดิจิทัล',                                                     totalHours:  7 },
  { name: 'การศาสนาศีลธรรมและจริยธรรม',                                                             totalHours:  4 },
  { name: 'การป้องกันและปราบปรามการก่อความไม่สงบ',                                                   totalHours:  3 },
  { name: 'การจัดการฝึก',                                                                           totalHours:  4 },
  { name: 'การรักษาความปลอดภัย',                                                                    totalHours:  4 },
  { name: 'การต่อต้านการก่อการร้าย',                                                                 totalHours:  3 },
  { name: 'การปลูกฝังอุดมการณ์ความรักชาติ',                                                         totalHours:  4 },
  { name: 'กระสุนและวัตถุระเบิดสำหรับหน่วยใช้',                                                     totalHours:  4 },
  { name: 'การพัฒนาระบบการต่อสู้เบ็ดเสร็จ',                                                         totalHours:  4 },
  { name: 'การเงินส่วนบุคคล',                                                                       totalHours:  2 },
  { name: 'การต่อต้านการทุจริต',                                                                    totalHours:  2 },
  // ภาคปฏิบัติ
  { name: 'การฝึกภาคปฏิบัติทางการขนส่ง',                                                            totalHours: 21 },
  // เบ็ดเตล็ด
  { name: 'พื้นฐานการวิจัย',                                                                        totalHours:  2 },
  { name: 'โรคอุบัติการณ์ใหม่และยาเสพติด',                                                          totalHours:  2 },
  { name: 'กฎหมายที่ทหารควรรู้',                                                                    totalHours:  2 },
  { name: 'ประวัติศาสตร์ทหาร',                                                                      totalHours:  2 },
  { name: 'ยุทธศาสตร์การพัฒนาระบบราชการไทย',                                                        totalHours:  2 },
  { name: 'พ.ร.บ. ระเบียบบริหารราชการแผ่นดิน (ฉบับที่ 5) และ พ.ร.ฎ. บริหารกิจการบ้านเมืองที่ดี', totalHours:  2 },
  { name: 'การบริหารราชการมุ่งเน้นผลสัมฤทธิ์',                                                     totalHours:  2 },
  { name: 'ระบบงบประมาณแบบมุ่งเน้นผลงาน',                                                           totalHours:  2 },
  { name: 'Balance Score Card',                                                                      totalHours:  2 },
  { name: 'การประกันคุณภาพการศึกษา',                                                                totalHours:  2 },
  { name: 'จิตอาสา หน้าที่พลเมือง และตามรอยพระราชดำรัสปรัชญาเศรษฐกิจพอเพียง',                      totalHours:  2 },
  { name: 'ความมั่นคงทางไซเบอร์ และการใช้สื่อสังคมออนไลน์อย่างสร้างสรรค์และปลอดภัย',                totalHours:  2 },
  { name: 'การฝึกมวยไทยขั้นพื้นฐาน',                                                               totalHours: 20 },
  { name: 'การดำเนินกรรมวิธีเปิด-ปิด',                                                              totalHours:  8 },
  { name: 'เวลาอะไหล่และเวลาผู้บังคับบัญชา',                                                        totalHours:  7 },
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

  const nameMap = new Map(existing.map(s => [s.name, s])); // name → subject obj

  let added   = 0;
  let tagged  = 0;
  let skipped = 0;

  // ── 2. Merge ─────────────────────────────────────────────────────────────
  for (const s of CAPTAIN_SUBJECTS) {
    if (nameMap.has(s.name)) {
      // มีอยู่แล้ว → ติด tag ถ้ายังไม่มี
      const obj = nameMap.get(s.name);
      if (!obj.courseTypes) obj.courseTypes = [];
      if (!obj.courseTypes.includes(TARGET_CT)) {
        obj.courseTypes.push(TARGET_CT);
        tagged++;
        console.log(`  🏷️  tag  → ${s.name}`);
      } else {
        skipped++;
      }
    } else {
      // ไม่มี → สร้างใหม่
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

  // ── 3. บันทึกกลับ ─────────────────────────────────────────────────────────
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
  console.log(`   ⏭️  ข้ามแล้ว       : ${skipped} วิชา`);
  console.log(`   📚 รวมทั้งหมด     : ${existing.length} วิชา`);
  console.log('   รีเฟรชหน้าเว็บเพื่อดูผล');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
