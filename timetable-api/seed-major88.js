// seed-major88.js — สร้างหลักสูตรชั้นนายพัน รุ่นที่ 88 + รายวิชา
require('dotenv').config();
const { sql, getPool } = require('./config/db');

// ─── รายวิชาทั้งหมดจากไฟล์ Excel ───────────────────────────────────────────
const NEW_SUBJECTS = [
  // ภาคทฤษฎี — วิชาหลัก
  { name: 'การเคลื่อนย้าย',                                       totalHours: 60 },
  { name: 'การขนส่งด้วยรถยนต์',                                    totalHours: 90 },
  { name: 'การขนส่งทางรถไฟ',                                       totalHours: 42 },
  { name: 'การขนส่งทางน้ำ',                                        totalHours: 42 },
  { name: 'การขนส่งทางอากาศ',                                      totalHours: 42 },
  { name: 'การส่งกำลังและซ่อมบำรุงสิ่งอุปกรณ์สายขนส่ง',            totalHours: 21 },
  { name: 'ภาษาอังกฤษ',                                            totalHours: 20 },
  { name: 'การส่งกำลังบำรุงในเขตหลัง',                             totalHours: 10 },
  { name: 'แนวความคิดพื้นฐานในการจัดงานบริการขนส่ง',               totalHours: 10 },
  { name: 'การขนส่ง สป. ที่จัดซื้อด้วยวิธี F.M.S',                 totalHours: 10 },
  { name: 'การบริการขนส่งโพ้นทะเล',                                totalHours: 10 },
  // ภาคทฤษฎี — วิชารอง (การทหาร)
  { name: 'ทหารราบ',                                               totalHours:  7 },
  { name: 'ทหารม้า',                                               totalHours:  7 },
  { name: 'ทหารปืนใหญ่',                                           totalHours:  7 },
  { name: 'ทหารสารบรรณ',                                           totalHours:  4 },
  { name: 'ทหารการเงิน',                                           totalHours:  4 },
  { name: 'ทหารช่าง',                                              totalHours:  4 },
  { name: 'ทหารสื่อสาร',                                           totalHours:  4 },
  { name: 'ทหารสรรพาวุธ',                                          totalHours:  4 },
  { name: 'ทหารพลาธิการ',                                          totalHours:  4 },
  { name: 'ทหารการข่าว',                                           totalHours:  4 },
  { name: 'ทหารสารวัตร',                                           totalHours:  4 },
  { name: 'ทหารอากาศ',                                             totalHours:  3 },
  { name: 'ทหารเรือ',                                              totalHours:  3 },
  { name: 'ทหารแพทย์',                                             totalHours:  3 },
  { name: 'ทหารการสัตว์',                                          totalHours:  3 },
  { name: 'กิจการวิทยาศาสตร์ของ ทบ.',                              totalHours:  3 },
  // ภาคทฤษฎี — วิชารอง (อื่นๆ)
  { name: 'แผนที่ - เครื่องหมายทหาร',                              totalHours:  4 },
  { name: 'ยุทธวิธี',                                              totalHours:  4 },
  { name: 'การบินทหารบก',                                          totalHours:  4 },
  { name: 'ปลัดบัญชี',                                             totalHours:  4 },
  { name: 'ฝ่ายอำนวยการ',                                          totalHours: 12 },
  // ภาคทฤษฎี — วิชาประกอบ
  { name: 'คอมพิวเตอร์',                                           totalHours:  8 },
  { name: 'การพัฒนาทักษะดิจิทัล',                                  totalHours:  2 },
  { name: 'การบรรยายสรุป/ศัพท์ทหาร/ครูทหาร',                       totalHours:  2 },
  { name: 'ผู้นำหน่วยทหาร',                                        totalHours:  4 },
  { name: 'การจัดการฝึก',                                          totalHours:  4 },
  { name: 'การป้องกันและปราบปรามการก่อความไม่สงบ',                  totalHours:  4 },
  { name: 'การต่อต้านการก่อการร้าย',                               totalHours:  4 },
  { name: 'ศาสนาและศีลธรรม',                                       totalHours:  4 },
  { name: 'การรักษาความปลอดภัย',                                   totalHours:  4 },
  { name: 'การปลูกฝังอุดมการณ์และความรักชาติ',                     totalHours:  4 },
  { name: 'กระสุนและวัตถุระเบิดสำหรับหน่วยใช้',                    totalHours:  4 },
  { name: 'การตรวจสอบใบอนุญาตพิเศษ',                              totalHours:  3 },
  { name: 'ระเบียบการเงินส่วนบุคคล',                               totalHours:  2 },
  { name: 'ความมั่นคงและปลอดภัยทางไซเบอร์',                        totalHours:  2 },
  { name: 'การต่อต้านการทุจริต',                                   totalHours:  2 },
  // ภาคปฏิบัติ
  { name: 'การฝึกศึกษาและดูงานด้านการขนส่งของพื้นที่กองทัพภาค',    totalHours: 49 },
  // เบ็ดเตล็ด
  { name: 'พื้นฐานการวิจัย',                                       totalHours:  2 },
  { name: 'โรคอุบัติการณ์ใหม่และยาเสพติด',                         totalHours:  2 },
  { name: 'จิตอาสา หน้าที่พลเมือง และปรัชญาเศรษฐกิจพอเพียง',       totalHours:  2 },
  { name: 'ประวัติศาสตร์ทหาร',                                     totalHours:  2 },
  { name: 'กฎหมายที่ทหารควรรู้',                                   totalHours:  2 },
  { name: 'ยุทธศาสตร์การพัฒนาระบบราชการไทย',                       totalHours:  2 },
  { name: 'พ.ร.บ. ระเบียบบริหารราชการแผ่นดิน (ฉบับที่ 5)',          totalHours:  2 },
  { name: 'การบริหารราชการมุ่งเน้นผลสัมฤทธิ์',                     totalHours:  2 },
  { name: 'ระบบงบประมาณแบบมุ่งเน้นผลงาน',                          totalHours:  2 },
  { name: 'Balance Score Card',                                     totalHours:  2 },
  { name: 'การประกันคุณภาพการศึกษา',                               totalHours:  2 },
  { name: 'การดำเนินกรรมวิธีเปิด-ปิด',                             totalHours:  8 },
  { name: 'เวลาผู้บังคับบัญชาและเวลาอะไหล่',                        totalHours:  8 },
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

async function run() {
  const pool = await getPool();

  // ─── 1. ดึง settings เดิม ───────────────────────────────────────────────
  const settRow = await pool.request().query(
    `SELECT [value] FROM Settings WHERE [key] = 'subjects'`
  );
  const existing = settRow.recordset[0]
    ? JSON.parse(settRow.recordset[0].value || '[]')
    : [];

  const existingNames = new Set(existing.map(s => s.name));

  // ─── 2. Merge — ไม่เพิ่มซ้ำ ─────────────────────────────────────────────
  let added = 0;
  for (const s of NEW_SUBJECTS) {
    if (!existingNames.has(s.name)) {
      existing.push({ id: uid(), name: s.name, totalHours: s.totalHours, subjects: [] });
      existingNames.add(s.name);
      added++;
    }
  }

  // ─── 3. บันทึก subjects กลับ ─────────────────────────────────────────────
  const json = JSON.stringify(existing);
  await pool.request()
    .input('v', sql.NVarChar(sql.MAX), json)
    .query(`MERGE Settings AS t
            USING (SELECT 'subjects' AS [key]) AS s ON t.[key] = s.[key]
            WHEN MATCHED THEN UPDATE SET [value] = @v
            WHEN NOT MATCHED THEN INSERT([key],[value]) VALUES('subjects',@v);`);
  console.log(`✅ รายวิชา: เพิ่มใหม่ ${added} วิชา (มีอยู่แล้ว ${existing.length - added} วิชา, รวม ${existing.length} วิชา)`);

  // ─── 4. สร้างหลักสูตร ───────────────────────────────────────────────────
  const COURSE_ID = 'major-bn-88';
  const chkCourse = await pool.request()
    .input('id', sql.NVarChar(50), COURSE_ID)
    .query(`SELECT COUNT(1) AS n FROM Courses WHERE id=@id`);

  if (chkCourse.recordset[0].n > 0) {
    await pool.request()
      .input('id',          sql.NVarChar(50),  COURSE_ID)
      .input('name',        sql.NVarChar(255), 'หลักสูตรชั้นนายพัน')
      .input('run_number',  sql.NVarChar(50),  '88')
      .input('total_hours', sql.Int,           595)
      .query(`UPDATE Courses SET name=@name, run_number=@run_number,
              total_hours=@total_hours, updated_at=GETDATE() WHERE id=@id`);
    console.log('✅ หลักสูตรชั้นนายพัน รุ่นที่ 88 — อัปเดตเรียบร้อย');
  } else {
    await pool.request()
      .input('id',          sql.NVarChar(50),  COURSE_ID)
      .input('name',        sql.NVarChar(255), 'หลักสูตรชั้นนายพัน')
      .input('run_number',  sql.NVarChar(50),  '88')
      .input('total_hours', sql.Int,           595)
      .query(`INSERT INTO Courses(id,name,run_number,total_hours)
              VALUES(@id,@name,@run_number,@total_hours)`);
    console.log('✅ หลักสูตรชั้นนายพัน รุ่นที่ 88 — สร้างเรียบร้อย');
  }

  console.log('\n🎉 เสร็จสิ้น! รีเฟรชหน้าเว็บเพื่อดูข้อมูล');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
