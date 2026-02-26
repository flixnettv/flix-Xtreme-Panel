/**
 * Authentication Controller
 * controllers/authController.js
 * منطق عمليات التسجيل، الدخول، وإدارة الحساب
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import db from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import dotenv from 'dotenv';

dotenv.config();

// ==========================================
// تسجيل مستخدم جديد
// POST /api/auth/register
// ==========================================
export const register = asyncHandler(async (req, res) => {
  // التحقق من أخطاء التحقق المسبق
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { username, email, password, role } = req.body;

  // 1. التحقق من عدم وجود المستخدم مسبقاً
  const [existingUsers] = await db.execute(
    'SELECT user_id FROM users WHERE email = ? OR username = ?',
    [email, username]
  );

  if (existingUsers.length > 0) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'User with this email or username already exists'
    });
  }

  // 2. تشفير الباسوورد (bcrypt مع 10 جولات)
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // 3. إدخال المستخدم الجديد في القاعدة
  const [result] = await db.execute(    `INSERT INTO users (username, email, password_hash, role_id) 
     VALUES (?, ?, ?, (SELECT role_id FROM roles WHERE role_name = ? LIMIT 1))`,
    [username, email, passwordHash, role]
  );

  // 4. تسجيل العملية في audit_trail
  await db.execute(
    'INSERT INTO audit_trail (user_id, action_performed, details) VALUES (?, ?, ?)',
    [result.insertId, 'user_registered', `New user registered: ${email}`]
  );

  // 5. الرد الناجح (بدون إرجاع الباسوورد!)
  res.status(201).json({
    message: 'User registered successfully',
    user_id: result.insertId,
    username,
    email,
    role
  });
});

// ==========================================
// تسجيل الدخول وإنشاء JWT Token
// POST /api/auth/login
// ==========================================
export const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { email, password } = req.body;

  // 1. جلب بيانات المستخدم مع الدور
  const [users] = await db.execute(
    `SELECT u.user_id, u.username, u.email, u.password_hash, r.role_name 
     FROM users u 
     JOIN roles r ON u.role_id = r.role_id 
     WHERE u.email = ?`,
    [email]
  );

  // 2. التحقق من وجود المستخدم وصحة الباسوورد
  if (users.length === 0) {
    // رسالة عامة عشان متكشفش لو الإيميل موجود ولا لأ (أمان)
    return res.status(401).json({
      error: 'Authentication failed',      message: 'Invalid email or password'
    });
  }

  const user = users[0];
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid email or password'
    });
  }

  // 3. إنشاء JWT Token
  const tokenPayload = {
    id: user.user_id,
    username: user.username,
    role: user.role_name
  };

  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'xtreme-panel',
    audience: 'xtreme-panel-users'
  });

  // 4. تسجيل عملية الدخول
  await db.execute(
    'INSERT INTO usage_logs (user_id, action, ip_address) VALUES (?, ?, ?)',
    [user.user_id, 'user_login', req.ip]
  );

  // 5. الرد مع التوكن وبيانات المستخدم (بدون الباسوورد)
  res.json({
    message: 'Login successful',
    token,
    user: {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role_name
    }
  });
});

// ==========================================
// تسجيل الخروج (إلغاء التوكن - اختياري)
// POST /api/auth/logout
// ==========================================export const logout = asyncHandler(async (req, res) => {
  // ملاحظة: JWT stateless، فإلغاء التوكن يحتاج blacklist أو short expiry
  // هنا بنسجل الخروج في logs فقط

  if (req.user && req.user.id) {
    await db.execute(
      'INSERT INTO usage_logs (user_id, action) VALUES (?, ?)',
      [req.user.id, 'user_logout']
    );
  }

  res.json({ message: 'Logged out successfully' });
});

// ==========================================
// الحصول على بيانات المستخدم الحالي
// GET /api/auth/me (محمي)
// ==========================================
export const getCurrentUser = asyncHandler(async (req, res) => {
  // req.user مضاف من middleware authenticateToken

  const [users] = await db.execute(
    `SELECT u.user_id, u.username, u.email, u.created_at, r.role_name 
     FROM users u 
     JOIN roles r ON u.role_id = r.role_id 
     WHERE u.user_id = ?`,
    [req.user.id]
  );

  if (users.length === 0) {
    return res.status(404).json({
      error: 'Not found',
      message: 'User not found'
    });
  }

  res.json({ user: users[0] });
});

// ==========================================
// طلب إعادة تعيين الباسوورد (Forgot Password)
// POST /api/auth/forgot-password
// ==========================================
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // 1. التحقق من وجود المستخدم
  const [users] = await db.execute(
    'SELECT user_id, email FROM users WHERE email = ?',
    [email]  );

  // 2. حتى لو مفيش يوزر، نرد بنفس الرسالة عشان منع enumeration attack
  if (users.length === 0) {
    return res.json({
      message: 'If this email exists, a reset link has been sent'
    });
  }

  const user = users[0];

  // 3. إنشاء توكن إعادة تعيين (صلاحيته 15 دقيقة فقط)
  const resetToken = jwt.sign(
    { id: user.user_id, type: 'password_reset' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  // 4. حفظ التوكن في القاعدة (اختياري لكن مفضل)
  await db.execute(
    'UPDATE users SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE user_id = ?',
    [resetToken, user.user_id]
  );

  // 5. إرسال الإيميل (هنا بنطبع في الكونسول للتجربة)
  // في الإنتاج: استخدم Nodemailer أو خدمة مثل SendGrid
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  console.log(`📧 Password reset link for ${email}:`);
  console.log(resetLink);

  // 6. تسجيل العملية
  await db.execute(
    'INSERT INTO audit_trail (user_id, action_performed) VALUES (?, ?)',
    [user.user_id, 'password_reset_requested']
  );

  res.json({
    message: 'If this email exists, a reset link has been sent'
  });
});

// ==========================================
// إعادة تعيين الباسوورد فعلياً
// POST /api/auth/reset-password
// ==========================================
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  // 1. التحقق من التوكن  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // التأكد إن ده توكن إعادة تعيين مش توكن عادي
    if (decoded.type !== 'password_reset') {
      throw new Error('Invalid token type');
    }
  } catch (error) {
    return res.status(400).json({
      error: 'Invalid or expired token',
      message: 'Password reset token is invalid or has expired'
    });
  }

  // 2. التحقق من أن التوكن لسه صالح في القاعدة
  const [users] = await db.execute(
    'SELECT user_id, reset_token, reset_token_expires FROM users WHERE user_id = ?',
    [decoded.id]
  );

  if (users.length === 0 || users[0].reset_token !== token) {
    return res.status(400).json({
      error: 'Invalid token',
      message: 'Reset token not found or already used'
    });
  }

  if (new Date() > new Date(users[0].reset_token_expires)) {
    return res.status(400).json({
      error: 'Token expired',
      message: 'Reset token has expired'
    });
  }

  // 3. تشفير الباسوورد الجديد وتحديثه
  const passwordHash = await bcrypt.hash(newPassword, 10);
  
  await db.execute(
    `UPDATE users 
     SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() 
     WHERE user_id = ?`,
    [passwordHash, decoded.id]
  );

  // 4. تسجيل العملية
  await db.execute(
    'INSERT INTO audit_trail (user_id, action_performed) VALUES (?, ?)',
    [decoded.id, 'password_reset_completed']
  );
  res.json({
    message: 'Password has been reset successfully'
  });
});