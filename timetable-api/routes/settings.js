// routes/settings.js — ค่าตั้งต้นระบบ (PostgreSQL)
const router = require('express').Router();
const { sql, getPool } = require('../config/db');
const { requireWrite, adminOnly } = require('../middleware/auth');

router.use(requireWrite);

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const pool   = await getPool();
    const result = await pool.request().query('SELECT key, value FROM settings');
    const obj    = {};
    result.recordset.forEach(r => { obj[r.key] = r.value; });
    res.json(obj);
  } catch (err) {
    console.error('GET /settings error:', err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/settings
router.put('/', adminOnly, async (req, res) => {
  const entries = Object.entries(req.body);
  if (!entries.length) return res.status(400).json({ error: 'ไม่มีข้อมูลที่จะบันทึก' });

  try {
    const pool = await getPool();
    for (const [key, value] of entries) {
      await pool.request()
        .input('k', sql.NVarChar(100),     key)
        .input('v', sql.NVarChar(sql.MAX), value != null ? String(value) : null)
        .query(`INSERT INTO settings(key, value) VALUES(@k, @v)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`);
    }
    res.json({ message: 'บันทึกการตั้งค่าสำเร็จ' });
  } catch (err) {
    console.error('PUT /settings error:', err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
