// routes/settings.js — ค่าตั้งต้นระบบ (ชื่อโรงเรียน ฯลฯ)
const router = require('express').Router();
const { sql, getPool } = require('../config/db');
const { requireWrite, adminOnly } = require('../middleware/auth');

router.use(requireWrite);

// GET /api/settings — ดึงค่าทั้งหมด
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT [key],[value] FROM Settings');
    // แปลงเป็น object { key: value, ... }
    const obj = {};
    result.recordset.forEach(r => { obj[r.key] = r.value; });
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/settings — บันทึกค่าหลายรายการพร้อมกัน (admin only)
// body: { schoolName: "...", ... }
router.put('/', adminOnly, async (req, res) => {
  const entries = Object.entries(req.body);
  if (!entries.length) return res.status(400).json({ error: 'ไม่มีข้อมูลที่จะบันทึก' });

  try {
    const pool = await getPool();
    for (const [key, value] of entries) {
      await pool.request()
        .input('key',   sql.NVarChar(100), key)
        .input('value', sql.NVarChar(sql.MAX), value != null ? String(value) : null)
        .query(`MERGE Settings AS t
                USING (SELECT @key AS [key]) AS s ON t.[key] = s.[key]
                WHEN MATCHED THEN UPDATE SET [value] = @value
                WHEN NOT MATCHED THEN INSERT([key],[value]) VALUES(@key,@value);`);
    }
    res.json({ message: 'บันทึกการตั้งค่าสำเร็จ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
