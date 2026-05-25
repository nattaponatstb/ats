// routes/entries.js — CRUD รายการสอน (lesson + holiday)
const router = require('express').Router();
const { sql, getPool } = require('../config/db');
const { requireWrite } = require('../middleware/auth');

router.use(requireWrite);

// GET /api/entries?course_id=xxx[&week=n]
router.get('/', async (req, res) => {
  const { course_id, week } = req.query;
  if (!course_id) return res.status(400).json({ error: 'กรุณาระบุ course_id' });

  try {
    const pool = await getPool();
    const req2 = pool.request().input('course_id', sql.NVarChar(50), course_id);
    let query = `SELECT * FROM Entries WHERE course_id = @course_id`;
    if (week) {
      req2.input('week', sql.Int, parseInt(week));
      query += ` AND week = @week`;
    }
    query += ` ORDER BY entry_date, start_time`;
    const result = await req2.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/entries/:id
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar(50), req.params.id)
      .query('SELECT * FROM Entries WHERE id = @id');
    if (!result.recordset.length) return res.status(404).json({ error: 'ไม่พบรายการ' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/entries — สร้างรายการสอนหรือวันหยุด
router.post('/', async (req, res) => {
  const {
    id, course_id, type, entry_date, week,
    start_time, end_time, subject,
    teacher1, teacher2, teacher3,
    rank1, rank2, rank3,
    method, location, evidence, uniform, notes,
    cum_hours, total_hours, label
  } = req.body;

  if (!id || !course_id) return res.status(400).json({ error: 'กรุณาระบุ id และ course_id' });

  try {
    const pool = await getPool();
    await pool.request()
      .input('id',          sql.NVarChar(50),   id)
      .input('course_id',   sql.NVarChar(50),   course_id)
      .input('type',        sql.NVarChar(20),   type        || 'lesson')
      .input('entry_date',  sql.Date,           entry_date  || null)
      .input('week',        sql.Int,            week        || null)
      .input('start_time',  sql.NVarChar(10),   start_time  || null)
      .input('end_time',    sql.NVarChar(10),   end_time    || null)
      .input('subject',     sql.NVarChar(255),  subject     || null)
      .input('teacher1',    sql.NVarChar(100),  teacher1    || null)
      .input('teacher2',    sql.NVarChar(100),  teacher2    || null)
      .input('teacher3',    sql.NVarChar(100),  teacher3    || null)
      .input('rank1',       sql.NVarChar(50),   rank1       || null)
      .input('rank2',       sql.NVarChar(50),   rank2       || null)
      .input('rank3',       sql.NVarChar(50),   rank3       || null)
      .input('method',      sql.NVarChar(100),  method      || null)
      .input('location',    sql.NVarChar(100),  location    || null)
      .input('evidence',    sql.NVarChar(100),  evidence    || null)
      .input('uniform',     sql.NVarChar(100),  uniform     || null)
      .input('notes',       sql.NVarChar(500),  notes       || null)
      .input('cum_hours',   sql.Decimal(6,1),   cum_hours   || null)
      .input('total_hours', sql.Decimal(6,1),   total_hours || null)
      .input('label',       sql.NVarChar(255),  label       || null)
      .query(`INSERT INTO Entries(id,course_id,type,entry_date,week,
                start_time,end_time,subject,teacher1,teacher2,teacher3,
                rank1,rank2,rank3,method,location,evidence,uniform,notes,
                cum_hours,total_hours,label)
              VALUES(@id,@course_id,@type,@entry_date,@week,
                @start_time,@end_time,@subject,@teacher1,@teacher2,@teacher3,
                @rank1,@rank2,@rank3,@method,@location,@evidence,@uniform,@notes,
                @cum_hours,@total_hours,@label)`);
    res.status(201).json({ message: 'บันทึกรายการสำเร็จ', id });
  } catch (err) {
    if (err.number === 2627) return res.status(409).json({ error: 'ID นี้ถูกใช้แล้ว' });
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/entries/:id — อัปเดตรายการ
router.put('/:id', async (req, res) => {
  const {
    type, entry_date, week,
    start_time, end_time, subject,
    teacher1, teacher2, teacher3,
    rank1, rank2, rank3,
    method, location, evidence, uniform, notes,
    cum_hours, total_hours, label
  } = req.body;

  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('id',          sql.NVarChar(50),   req.params.id)
      .input('type',        sql.NVarChar(20),   type        || 'lesson')
      .input('entry_date',  sql.Date,           entry_date  || null)
      .input('week',        sql.Int,            week        || null)
      .input('start_time',  sql.NVarChar(10),   start_time  || null)
      .input('end_time',    sql.NVarChar(10),   end_time    || null)
      .input('subject',     sql.NVarChar(255),  subject     || null)
      .input('teacher1',    sql.NVarChar(100),  teacher1    || null)
      .input('teacher2',    sql.NVarChar(100),  teacher2    || null)
      .input('teacher3',    sql.NVarChar(100),  teacher3    || null)
      .input('rank1',       sql.NVarChar(50),   rank1       || null)
      .input('rank2',       sql.NVarChar(50),   rank2       || null)
      .input('rank3',       sql.NVarChar(50),   rank3       || null)
      .input('method',      sql.NVarChar(100),  method      || null)
      .input('location',    sql.NVarChar(100),  location    || null)
      .input('evidence',    sql.NVarChar(100),  evidence    || null)
      .input('uniform',     sql.NVarChar(100),  uniform     || null)
      .input('notes',       sql.NVarChar(500),  notes       || null)
      .input('cum_hours',   sql.Decimal(6,1),   cum_hours   || null)
      .input('total_hours', sql.Decimal(6,1),   total_hours || null)
      .input('label',       sql.NVarChar(255),  label       || null)
      .query(`UPDATE Entries SET
                type=@type, entry_date=@entry_date, week=@week,
                start_time=@start_time, end_time=@end_time, subject=@subject,
                teacher1=@teacher1, teacher2=@teacher2, teacher3=@teacher3,
                rank1=@rank1, rank2=@rank2, rank3=@rank3,
                method=@method, location=@location, evidence=@evidence,
                uniform=@uniform, notes=@notes, cum_hours=@cum_hours,
                total_hours=@total_hours, label=@label
              WHERE id=@id`);
    if (!r.rowsAffected[0]) return res.status(404).json({ error: 'ไม่พบรายการ' });
    res.json({ message: 'อัปเดตสำเร็จ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/entries/:id
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('id', sql.NVarChar(50), req.params.id)
      .query('DELETE FROM Entries WHERE id = @id');
    if (!r.rowsAffected[0]) return res.status(404).json({ error: 'ไม่พบรายการ' });
    res.json({ message: 'ลบรายการสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/entries?course_id=xxx — ลบรายการทั้งหมดของหลักสูตร
router.delete('/', async (req, res) => {
  const { course_id } = req.query;
  if (!course_id) return res.status(400).json({ error: 'กรุณาระบุ course_id' });
  try {
    const pool = await getPool();
    await pool.request()
      .input('course_id', sql.NVarChar(50), course_id)
      .query('DELETE FROM Entries WHERE course_id = @course_id');
    res.json({ message: 'ลบรายการทั้งหมดสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
