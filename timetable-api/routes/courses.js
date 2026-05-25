// routes/courses.js — CRUD หลักสูตร
const router = require('express').Router();
const { sql, getPool } = require('../config/db');
const { requireWrite } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

router.use(requireWrite);

// ── helper: ตรวจว่า request มี token ที่ valid หรือไม่ ──────
function isAuthenticated(req) {
  const h = req.headers['authorization'];
  if (!h) return false;
  try {
    const token = h.startsWith('Bearer ') ? h.slice(7) : h;
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch { return false; }
}

// GET /api/courses
// • มี token → คืนทุกหลักสูตร
// • ไม่มี token (public) → คืนเฉพาะ is_public = 1
router.get('/', async (req, res) => {
  try {
    const authed = isAuthenticated(req);
    const pool   = await getPool();

    let result;
    try {
      // พยายาม query พร้อม is_public, year columns
      const where = authed ? '' : 'WHERE is_public = 1';
      result = await pool.request().query(
        `SELECT id, name, run_number, year, start_date, end_date, total_hours,
                course_type, signer_label, signer_rank, signer_name,
                signer_pos1, signer_pos2, signer_date,
                is_public, created_at, updated_at
         FROM Courses ${where}
         ORDER BY year DESC, start_date DESC, created_at DESC`
      );
    } catch {
      // fallback: columns อาจยังไม่มี → ดึงทั้งหมด ไม่กรอง
      result = await pool.request().query(
        `SELECT id, name, run_number, start_date, end_date, total_hours,
                signer_label, signer_rank, signer_name,
                signer_pos1, signer_pos2, signer_date,
                0 AS is_public, NULL AS year, created_at, updated_at
         FROM Courses
         ORDER BY start_date DESC, created_at DESC`
      );
    }

    res.json(result.recordset);
  } catch (err) {
    console.error('GET /courses error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/courses/:id
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar(50), req.params.id)
      .query(`SELECT * FROM Courses WHERE id = @id`);
    if (!result.recordset.length)
      return res.status(404).json({ error: 'ไม่พบหลักสูตร' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// helper: ตรวจสอบและสร้าง is_public column ถ้ายังไม่มี (2 queries แยกกัน)
async function ensureIsPublicColumn(pool) {
  const chk = await pool.request().query(
    `SELECT COUNT(1) AS n FROM sys.columns
     WHERE object_id = OBJECT_ID(N'Courses') AND name = N'is_public'`
  );
  const exists = chk.recordset[0] && chk.recordset[0].n > 0;
  if (!exists) {
    await pool.request().query(
      `ALTER TABLE Courses ADD is_public BIT NOT NULL DEFAULT 0`
    );
    console.log('✅ ensureIsPublicColumn: สร้าง column is_public แล้ว');
  }
}

// PATCH /api/courses/:id/visibility — toggle สาธารณะ (requireWrite จัดการ auth แล้ว)
router.patch('/:id/visibility', async (req, res) => {
  try {
    const pool = await getPool();

    // ตรวจสอบและสร้าง column ถ้ายังไม่มี (safety net)
    await ensureIsPublicColumn(pool);

    // toggle: 0→1, 1→0
    await pool.request()
      .input('id', sql.NVarChar(50), req.params.id)
      .query(`UPDATE Courses
              SET is_public = CASE WHEN is_public = 1 THEN 0 ELSE 1 END
              WHERE id = @id`);

    // อ่านค่าใหม่
    const r = await pool.request()
      .input('id', sql.NVarChar(50), req.params.id)
      .query(`SELECT is_public FROM Courses WHERE id = @id`);

    if (!r.recordset.length)
      return res.status(404).json({ error: 'ไม่พบหลักสูตร' });

    res.json({ is_public: r.recordset[0].is_public });
  } catch (err) {
    console.error('PATCH visibility error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// POST /api/courses — สร้างหลักสูตรใหม่
router.post('/', async (req, res) => {
  const {
    id, name, run_number, year, start_date, end_date, total_hours, course_type,
    signer_label, signer_rank, signer_name, signer_pos1, signer_pos2, signer_date
  } = req.body;

  if (!id || !name)
    return res.status(400).json({ error: 'กรุณาระบุ id และชื่อหลักสูตร' });

  try {
    const pool = await getPool();
    await pool.request()
      .input('id',           sql.NVarChar(50),  id)
      .input('name',         sql.NVarChar(255), name)
      .input('run_number',   sql.NVarChar(50),  run_number   || null)
      .input('year',         sql.Int,           year         || null)
      .input('start_date',   sql.Date,          start_date   || null)
      .input('end_date',     sql.Date,          end_date     || null)
      .input('total_hours',  sql.Int,           total_hours  || null)
      .input('course_type',  sql.NVarChar(50),  course_type  || null)
      .input('signer_label', sql.NVarChar(100), signer_label || null)
      .input('signer_rank',  sql.NVarChar(50),  signer_rank  || null)
      .input('signer_name',  sql.NVarChar(100), signer_name  || null)
      .input('signer_pos1',  sql.NVarChar(255), signer_pos1  || null)
      .input('signer_pos2',  sql.NVarChar(255), signer_pos2  || null)
      .input('signer_date',  sql.NVarChar(50),  signer_date  || null)
      .query(`INSERT INTO Courses
                (id,name,run_number,year,start_date,end_date,total_hours,course_type,
                 signer_label,signer_rank,signer_name,signer_pos1,signer_pos2,signer_date)
              VALUES
                (@id,@name,@run_number,@year,@start_date,@end_date,@total_hours,@course_type,
                 @signer_label,@signer_rank,@signer_name,@signer_pos1,@signer_pos2,@signer_date)`);
    res.status(201).json({ message: 'สร้างหลักสูตรสำเร็จ', id });
  } catch (err) {
    if (err.number === 2627)
      return res.status(409).json({ error: 'ID นี้ถูกใช้แล้ว' });
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/courses/:id — อัปเดตหลักสูตร
router.put('/:id', async (req, res) => {
  const {
    name, run_number, year, start_date, end_date, total_hours, course_type,
    signer_label, signer_rank, signer_name, signer_pos1, signer_pos2, signer_date
  } = req.body;

  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('id',           sql.NVarChar(50),  req.params.id)
      .input('name',         sql.NVarChar(255), name         || null)
      .input('run_number',   sql.NVarChar(50),  run_number   || null)
      .input('year',         sql.Int,           year         || null)
      .input('start_date',   sql.Date,          start_date   || null)
      .input('end_date',     sql.Date,          end_date     || null)
      .input('total_hours',  sql.Int,           total_hours  || null)
      .input('course_type',  sql.NVarChar(50),  course_type  || null)
      .input('signer_label', sql.NVarChar(100), signer_label || null)
      .input('signer_rank',  sql.NVarChar(50),  signer_rank  || null)
      .input('signer_name',  sql.NVarChar(100), signer_name  || null)
      .input('signer_pos1',  sql.NVarChar(255), signer_pos1  || null)
      .input('signer_pos2',  sql.NVarChar(255), signer_pos2  || null)
      .input('signer_date',  sql.NVarChar(50),  signer_date  || null)
      .query(`UPDATE Courses SET
                name=@name, run_number=@run_number, year=@year,
                start_date=@start_date, end_date=@end_date, total_hours=@total_hours,
                course_type=@course_type,
                signer_label=@signer_label, signer_rank=@signer_rank, signer_name=@signer_name,
                signer_pos1=@signer_pos1, signer_pos2=@signer_pos2, signer_date=@signer_date
              WHERE id=@id`);
    if (!r.rowsAffected[0])
      return res.status(404).json({ error: 'ไม่พบหลักสูตร' });
    res.json({ message: 'อัปเดตสำเร็จ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/courses/:id
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('id', sql.NVarChar(50), req.params.id)
      .query('DELETE FROM Courses WHERE id = @id');
    if (!r.rowsAffected[0])
      return res.status(404).json({ error: 'ไม่พบหลักสูตร' });
    res.json({ message: 'ลบหลักสูตรสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
