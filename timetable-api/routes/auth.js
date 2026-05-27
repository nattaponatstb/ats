// routes/auth.js — Login / User Management (PostgreSQL)
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { sql, getPool } = require('../config/db');
const { authMiddleware, adminOnly, superAdminOnly } = require('../middleware/auth');

async function logActivity(pool, userId, username, action, detail, ip) {
  try {
    await pool.request()
      .input('user_id',  sql.Int,           userId   || null)
      .input('username', sql.NVarChar(50),  username || '')
      .input('action',   sql.NVarChar(100), action)
      .input('detail',   sql.NVarChar(500), detail   || '')
      .input('ip',       sql.NVarChar(50),  ip       || '')
      .query(`INSERT INTO activity_log(user_id,username,action,detail,ip)
              VALUES(@user_id,@username,@action,@detail,@ip)`);
  } catch (e) { console.error('logActivity error:', e.message); }
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
  if (!username || !password)
    return res.status(400).json({ error: 'กรุณากรอก username และ password' });

  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('username', sql.NVarChar(50), username)
      .query('SELECT id, username, password, role, full_name FROM users WHERE username = @username');

    const user = result.recordset[0];
    if (!user) {
      await logActivity(pool, null, username, 'LOGIN_FAIL', 'ไม่พบผู้ใช้', ip);
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      await logActivity(pool, user.id, username, 'LOGIN_FAIL', 'รหัสผ่านไม่ถูกต้อง', ip);
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    await logActivity(pool, user.id, username, 'LOGIN_OK', 'เข้าสู่ระบบสำเร็จ', ip);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name } });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/password
router.put('/password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword)
    return res.status(400).json({ error: 'กรุณากรอกรหัสผ่านเก่าและใหม่' });
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });

  try {
    const pool = await getPool();
    const row  = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query('SELECT password FROM users WHERE id = @id');
    const match = await bcrypt.compare(oldPassword, row.recordset[0].password);
    if (!match) return res.status(401).json({ error: 'รหัสผ่านเก่าไม่ถูกต้อง' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.request()
      .input('id', sql.Int,          req.user.id)
      .input('pw', sql.NVarChar(255), hashed)
      .query('UPDATE users SET password = @pw, updated_at = NOW() WHERE id = @id');

    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    await logActivity(pool, req.user.id, req.user.username, 'CHANGE_PASSWORD', 'เปลี่ยนรหัสผ่านตัวเอง', ip);
    res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/auth/users
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const pool   = await getPool();
    const result = await pool.request().query(
      'SELECT id, username, role, full_name, created_at, updated_at FROM users ORDER BY id'
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/auth/users
router.post('/users', authMiddleware, adminOnly, superAdminOnly, async (req, res) => {
  const { username, password, role, full_name } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'กรุณากรอก username และ password' });
  if (password.length < 6)    return res.status(400).json({ error: 'password ต้องมีอย่างน้อย 6 ตัวอักษร' });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const pool   = await getPool();
    await pool.request()
      .input('username',  sql.NVarChar(50),  username)
      .input('password',  sql.NVarChar(255), hashed)
      .input('role',      sql.NVarChar(20),  role || 'admin')
      .input('full_name', sql.NVarChar(100), full_name || null)
      .query('INSERT INTO users(username,password,role,full_name) VALUES(@username,@password,@role,@full_name)');

    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    await logActivity(pool, req.user.id, req.user.username, 'CREATE_USER', `สร้างผู้ใช้ ${username}`, ip);
    res.status(201).json({ message: 'สร้างผู้ใช้สำเร็จ' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'username นี้ถูกใช้แล้ว' });
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/auth/users/:id
router.put('/users/:id', authMiddleware, adminOnly, superAdminOnly, async (req, res) => {
  const { full_name } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('id',        sql.Int,           req.params.id)
      .input('full_name', sql.NVarChar(100), full_name || null)
      .query('UPDATE users SET full_name = @full_name, updated_at = NOW() WHERE id = @id');
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    await logActivity(pool, req.user.id, req.user.username, 'EDIT_USER', `แก้ไข user id=${req.params.id}`, ip);
    res.json({ message: 'แก้ไขข้อมูลสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/auth/users/:id/reset-password
router.put('/users/:id/reset-password', authMiddleware, adminOnly, superAdminOnly, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });

  try {
    const pool   = await getPool();
    const target = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT username FROM users WHERE id = @id');
    if (!target.recordset.length) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.request()
      .input('id', sql.Int,           req.params.id)
      .input('pw', sql.NVarChar(255), hashed)
      .query('UPDATE users SET password = @pw, updated_at = NOW() WHERE id = @id');

    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    await logActivity(pool, req.user.id, req.user.username, 'RESET_PASSWORD', `รีเซตรหัสผ่านของ ${target.recordset[0].username}`, ip);
    res.json({ message: `รีเซตรหัสผ่านของ ${target.recordset[0].username} สำเร็จ` });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', authMiddleware, adminOnly, superAdminOnly, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'ไม่สามารถลบบัญชีตัวเองได้' });
  try {
    const pool   = await getPool();
    const target = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT username FROM users WHERE id = @id');
    if (!target.recordset.length) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });

    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM users WHERE id = @id');

    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    await logActivity(pool, req.user.id, req.user.username, 'DELETE_USER', `ลบผู้ใช้ ${target.recordset[0].username}`, ip);
    res.json({ message: 'ลบผู้ใช้สำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/auth/logs
router.get('/logs', authMiddleware, adminOnly, superAdminOnly, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, 500);
  try {
    const pool   = await getPool();
    const result = await pool.request().query(
      `SELECT id, username, action, detail, ip, created_at
       FROM activity_log ORDER BY created_at DESC LIMIT ${limit}`
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
