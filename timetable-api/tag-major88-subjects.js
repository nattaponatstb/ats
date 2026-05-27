// tag-major88-subjects.js — ติด courseTypes: ['ช.พัน'] ให้วิชาในหลักสูตรชั้นนายพัน
require('dotenv').config();
const { getPool } = require('./config/db');

// รายชื่อวิชาทั้งหมดจากไฟล์ Excel หลักสูตรชั้นนายพัน
const MAJOR_BN_SUBJECTS = [
  'การเคลื่อนย้าย',
  'การขนส่งด้วยรถยนต์',
  'การขนส่งทางรถไฟ',
  'การขนส่งทางน้ำ',
  'การขนส่งทางอากาศ',
  'การส่งกำลังและซ่อมบำรุงสิ่งอุปกรณ์สายขนส่ง',
  'ภาษาอังกฤษ',
  'การส่งกำลังบำรุงในเขตหลัง',
  'แนวความคิดพื้นฐานในการจัดงานบริการขนส่ง',
  'การขนส่ง สป. ที่จัดซื้อด้วยวิธี F.M.S',
  'การบริการขนส่งโพ้นทะเล',
  'ทหารราบ',
  'ทหารม้า',
  'ทหารปืนใหญ่',
  'ทหารสารบรรณ',
  'ทหารการเงิน',
  'ทหารช่าง',
  'ทหารสื่อสาร',
  'ทหารสรรพาวุธ',
  'ทหารพลาธิการ',
  'ทหารการข่าว',
  'ทหารสารวัตร',
  'ทหารอากาศ',
  'ทหารเรือ',
  'ทหารแพทย์',
  'ทหารการสัตว์',
  'กิจการวิทยาศาสตร์ของ ทบ.',
  'แผนที่ - เครื่องหมายทหาร',
  'ยุทธวิธี',
  'การบินทหารบก',
  'ปลัดบัญชี',
  'ฝ่ายอำนวยการ',
  'คอมพิวเตอร์',
  'การพัฒนาทักษะดิจิทัล',
  'การบรรยายสรุป/ศัพท์ทหาร/ครูทหาร',
  'ผู้นำหน่วยทหาร',
  'การจัดการฝึก',
  'การป้องกันและปราบปรามการก่อความไม่สงบ',
  'การต่อต้านการก่อการร้าย',
  'ศาสนาและศีลธรรม',
  'การรักษาความปลอดภัย',
  'การปลูกฝังอุดมการณ์และความรักชาติ',
  'กระสุนและวัตถุระเบิดสำหรับหน่วยใช้',
  'การตรวจสอบใบอนุญาตพิเศษ',
  'ระเบียบการเงินส่วนบุคคล',
  'ความมั่นคงและปลอดภัยทางไซเบอร์',
  'การต่อต้านการทุจริต',
  'การฝึกศึกษาและดูงานด้านการขนส่งของพื้นที่กองทัพภาค',
  'พื้นฐานการวิจัย',
  'โรคอุบัติการณ์ใหม่และยาเสพติด',
  'จิตอาสา หน้าที่พลเมือง และปรัชญาเศรษฐกิจพอเพียง',
  'ประวัติศาสตร์ทหาร',
  'กฎหมายที่ทหารควรรู้',
  'ยุทธศาสตร์การพัฒนาระบบราชการไทย',
  'พ.ร.บ. ระเบียบบริหารราชการแผ่นดิน (ฉบับที่ 5)',
  'การบริหารราชการมุ่งเน้นผลสัมฤทธิ์',
  'ระบบงบประมาณแบบมุ่งเน้นผลงาน',
  'Balance Score Card',
  'การประกันคุณภาพการศึกษา',
  'การดำเนินกรรมวิธีเปิด-ปิด',
  'เวลาผู้บังคับบัญชาและเวลาอะไหล่',
];

const TARGET_CT = 'ช.พัน';

async function run() {
  const pool = await getPool();

  // ดึง subjects ปัจจุบัน
  const row = await pool.request().query(`SELECT [value] FROM Settings WHERE [key]='subjects'`);
  if (!row.recordset[0]) { console.error('❌ ไม่พบ subjects ใน Settings'); process.exit(1); }

  const subjects = JSON.parse(row.recordset[0].value || '[]');
  const nameSet  = new Set(MAJOR_BN_SUBJECTS);

  let updated = 0;
  let skipped  = 0;

  for (const s of subjects) {
    if (!nameSet.has(s.name)) { skipped++; continue; }
    if (!s.courseTypes) s.courseTypes = [];
    if (!s.courseTypes.includes(TARGET_CT)) {
      s.courseTypes.push(TARGET_CT);
      updated++;
      console.log(`  ✅ ${s.name}`);
    } else {
      skipped++;
    }
  }

  // บันทึกกลับ
  const json = JSON.stringify(subjects);
  await pool.request()
    .input('v', require('./config/db').sql.NVarChar(-1), json)
    .query(`MERGE Settings AS t
            USING (SELECT 'subjects' AS [key]) AS s ON t.[key]=s.[key]
            WHEN MATCHED     THEN UPDATE SET [value]=@v
            WHEN NOT MATCHED THEN INSERT([key],[value]) VALUES('subjects',@v);`);

  console.log(`\n🎉 อัปเดตแล้ว ${updated} วิชา → courseTypes: ['${TARGET_CT}']`);
  console.log(`   ข้ามแล้ว ${skipped} วิชา (ไม่อยู่ในรายการ หรือมี tag แล้ว)`);
  console.log('   รีเฟรชหน้าเว็บเพื่อดูผล');
  process.exit(0);
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
