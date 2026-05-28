// middleware/auth.js — ตรวจสอบ JWT Token
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'ไม่พบ Token กรุณาเข้าสู่ระบบ' });

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ' });
  }
}

// GET: สาธารณะ (ไม่ต้อง login)
// POST / PUT / DELETE: ต้อง login
function requireWrite(req, res, next) {
  if (req.method === 'GET') return next();
  return authMiddleware(req, res, next);
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin')
    return res.status(403).json({ error: 'สิทธิ์ไม่เพียงพอ (ต้องการสิทธิ์ Admin)' });
  next();
}

// เฉพาะ Super Admin เท่านั้น
function superAdminOnly(req, res, next) {
  if (req.user?.role !== 'superadmin' && req.user?.username !== 'admin1')
    return res.status(403).json({ error: 'สิทธิ์นี้สำหรับ Super Admin เท่านั้น' });
  next();
}

module.exports = { authMiddleware, requireWrite, adminOnly, superAdminOnly };
