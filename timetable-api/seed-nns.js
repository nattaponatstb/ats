// seed-nns.js — เพิ่มรายวิชาหลักสูตร นนส. + ติด courseTypes: ['นนส.']
require('dotenv').config();
const { sql, getPool } = require('./config/db');

const TARGET_CT = 'นนส.';

const NNS_SUBJECTS = [
  // ── 1.1 วิชาหลัก ────────────────────────────────────────────────────────
  { name: 'การจัดส่วนราชการและการเคลื่อนย้าย',                                                     totalHours: 125 },
  { name: 'การขนส่งด้วยรถยนต์',                                                                    totalHours: 110 },
  { name: 'การขนส่งทางรถไฟ',                                                                       totalHours:  65 },
  { name: 'การขนส่งทางน้ำ',                                                                        totalHours:  65 },
  { name: 'การขนส่งทางอากาศ',                                                                      totalHours:  65 },
  { name: 'ภาษาอังกฤษเบื้องต้น',                                                                   totalHours:  40 },
  { name: 'การส่งกำลังบำรุง สป. สายขนส่ง',                                                         totalHours:  40 },
  { name: 'การใช้แบบพิมพ์สายขนส่ง',                                                                totalHours:  40 },
  // ── 1.1.1.9 ทฤษฎีการขับรถยนต์ทหาร (sub-items) ──────────────────────────
  { name: 'ความรู้เบื้องต้นไม่เกี่ยวกับเครื่องกล',                                                  totalHours:  25 },
  { name: 'ความรู้เบื้องต้นเกี่ยวกับเครื่องกล',                                                     totalHours:  20 },
  { name: 'หลักการฝึกพลขับรถ',                                                                     totalHours: 200 },
  { name: 'หลักการฝึกปรนนิบัติบำรุง การใช้แบบพิมพ์ในการปรนนิบัติบำรุงและการควบคุมการบรรทุก',      totalHours:  16 },
  { name: 'หลักการบรรทุกและความรับผิดชอบของพลขับต่อสิ่งบรรทุกบนยานพาหนะ',                         totalHours:  10 },
  { name: 'การทดสอบการขับขี่รถยนต์',                                                               totalHours:  24 },
  // ── 1.1.1.10 ทฤษฎีการขับเรือยนต์บรรทุก (sub-items) ─────────────────────
  { name: 'ความรู้เบื้องต้นเกี่ยวกับเรือ',                                                          totalHours:   4 },
  { name: 'การซ่อมบำรุงเรือ',                                                                      totalHours:   6 },
  { name: 'การปรนนิบัติบำรุงในหน้าที่ของเจ้าหน้าที่ประจำเรือ',                                     totalHours:   4 },
  { name: 'หลักการฝึกขับเรือบรรทุกยนต์',                                                           totalHours:  70 },
  // ── 1.2 วิชารอง ─────────────────────────────────────────────────────────
  { name: 'คอมพิวเตอร์เบื้องต้น',                                                                  totalHours:  40 },
  { name: 'การรักษาความปลอดภัย',                                                                   totalHours:   7 },
  { name: 'การป้องกันและปราบปรามการก่อความไม่สงบ',                                                  totalHours:   7 },
  { name: 'การปลูกฝังอุดมการณ์และความรักชาติ',                                                     totalHours:   7 },
  { name: 'การต่อต้านการก่อการร้าย',                                                                totalHours:   7 },
  { name: 'ครูทหารและการฝึกที่เน้นผลการปฏิบัติ',                                                   totalHours:   7 },
  { name: 'การจัดการฝึก',                                                                          totalHours:   7 },
  { name: 'การจัดและการดำเนินงานของฝ่ายอำนวยการ',                                                  totalHours:  12 },
  // ── 1.3 วิชาประกอบ ──────────────────────────────────────────────────────
  { name: 'ความมั่นคงปลอดภัยทางไซเบอร์',                                                          totalHours:   2 },
  { name: 'การใช้สื่อสังคมออนไลน์อย่างสร้างสรรค์และปลอดภัย',                                      totalHours:   2 },
  { name: 'ระเบียบการเงินส่วนบุคคล',                                                               totalHours:   4 },
  { name: 'การศาสนา ศีลธรรม และจริยธรรม',                                                          totalHours:   4 },
  { name: 'จิตอาสา และหน้าที่พลเมือง',                                                             totalHours:   2 },
  { name: 'ตามรอยพระราชดำรัสปรัชญาเศรษฐกิจพอเพียง',                                               totalHours:   2 },
  { name: 'กฎหมายที่ทหารควรรู้',                                                                   totalHours:   4 },
  { name: 'ประวัติศาสตร์ทหาร',                                                                     totalHours:   2 },
  { name: 'การบรรยายสรุป/ศัพท์ทหาร/การอ่านคำควบกล้ำ',                                             totalHours:   4 },
  { name: 'การประกันคุณภาพการศึกษา',                                                               totalHours:   2 },
  { name: 'การต่อต้านการทุจริต',                                                                   totalHours:   4 },
  { name: 'การพัฒนาทักษะดิจิทัล',                                                                  totalHours:   4 },
  { name: 'การปฐมพยาบาลเบื้องต้น',                                                                 totalHours:   4 },
  // ── 2 ภาคปฏิบัติ ─────────────────────────────────────────────────────────
  { name: 'การฝึกภาคสนามทางการขนส่ง',                                                              totalHours:  35 },
  { name: 'การฝึกทบทวนและฝึกหน้าที่ครูทหาร',                                                       totalHours: 104 },
  { name: 'การดูงานและฝึกปฏิบัติงานทางทหารขนส่ง',                                                  totalHours:  77 },
  // ── 3 เบ็ดเตล็ด ──────────────────────────────────────────────────────────
  { name: 'การดำเนินกรรมวิธีเปิด-ปิด',                                                             totalHours:   8 },
  { name: 'เวลาผู้บังคับบัญชา',                                                                    totalHours:  37 },
  { name: 'การอบรมวินัยทหาร',                                                                      totalHours:  50 },
  { name: 'มวยไทยขั้นพื้นฐาน',                                                                    totalHours:  10 },
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

  for (const s of NNS_SUBJECTS) {
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
