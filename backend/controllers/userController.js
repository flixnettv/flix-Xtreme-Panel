/**
 * User Management Controller (Admin Only)
 * controllers/userController.js
 * عمليات CRUD للمستخدمين - متاحة للـ Admin فقط
 */

import bcrypt from 'bcryptjs';
import db from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// ==========================================
// جلب جميع المستخدمين (مع pagination)
// GET /api/users?page=1&limit=20
// ==========================================
export const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100); // حد أقصى 100 عشان الأداء
  const offset = (page - 1) * limit;

  const [users] = await db.execute(
    `SELECT u.user_id, u.username, u.email, u.created_at, r.role_name 
     FROM users u 
     JOIN roles r ON u.role_id = r.role_id 
     ORDER BY u.created_at DESC 
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  const [total] = await db.execute('SELECT COUNT(*) as count FROM users');

  res.json({
    users,
    pagination: {
      current_page: page,
      per_page: limit,
      total_items: total[0].count,
      total_pages: Math.ceil(total[0].count / limit)
    }
  });
});

// ==========================================
// جلب مستخدم محدد بالـ ID
// GET /api/users/:id
// ==========================================
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [users] = await db.execute(
    `SELECT u.user_id, u.username, u.email, u.created_at, u.updated_at, r.role_name      FROM users u 
     JOIN roles r ON u.role_id = r.role_id 
     WHERE u.user_id = ?`,
    [id]
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
// إنشاء مستخدم جديد (Admin فقط)
// POST /api/users
// ==========================================
export const createUser = asyncHandler(async (req, res) => {
  const { username, email, password, role } = req.body;

  // التحقق من التكرار
  const [existing] = await db.execute(
    'SELECT user_id FROM users WHERE email = ? OR username = ?',
    [email, username]
  );

  if (existing.length > 0) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'User already exists'
    });
  }

  // تشفير الباسوورد
  const passwordHash = await bcrypt.hash(password, 10);

  // الحصول على role_id من اسم الدور
  const [roles] = await db.execute(
    'SELECT role_id FROM roles WHERE role_name = ?',
    [role]
  );

  if (roles.length === 0) {
    return res.status(400).json({
      error: 'Invalid role',
      message: 'Specified role does not exist'
    });  }

  const [result] = await db.execute(
    'INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
    [username, email, passwordHash, roles[0].role_id]
  );

  // تسجيل في audit
  await db.execute(
    'INSERT INTO audit_trail (user_id, action_performed, performed_by) VALUES (?, ?, ?)',
    [result.insertId, 'user_created_by_admin', req.user.id]
  );

  res.status(201).json({
    message: 'User created successfully',
    user_id: result.insertId
  });
});

// ==========================================
// تحديث مستخدم موجود
// PUT /api/users/:id
// ==========================================
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { username, email, role, password } = req.body;

  // التحقق من وجود المستخدم
  const [users] = await db.execute('SELECT user_id FROM users WHERE user_id = ?', [id]);
  if (users.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  // بناء جملة التحديث ديناميكياً (عشان الحقول الاختيارية)
  const updates = [];
  const values = [];

  if (username) {
    updates.push('username = ?');
    values.push(username);
  }
  if (email) {
    updates.push('email = ?');
    values.push(email);
  }
  if (password) {
    updates.push('password_hash = ?');
    values.push(await bcrypt.hash(password, 10));
  }
  if (role) {    const [roles] = await db.execute('SELECT role_id FROM roles WHERE role_name = ?', [role]);
    if (roles.length > 0) {
      updates.push('role_id = ?');
      values.push(roles[0].role_id);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push('updated_at = NOW()');
  values.push(id);

  await db.execute(
    `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`,
    values
  );

  // تسجيل في audit
  await db.execute(
    'INSERT INTO audit_trail (user_id, action_performed, performed_by) VALUES (?, ?, ?)',
    [id, 'user_updated_by_admin', req.user.id]
  );

  res.json({ message: 'User updated successfully' });
});

// ==========================================
// حذف مستخدم (Soft Delete مفضل)
// DELETE /api/users/:id
// ==========================================
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ⚠️ ملاحظة: في الإنتاج، يفضل عمل Soft Delete (تحديد status = 'deleted')
  // مش حذف فعلي عشان تحافظ على الـ referential integrity

  // التحقق من وجود المستخدم
  const [users] = await db.execute('SELECT user_id FROM users WHERE user_id = ?', [id]);
  if (users.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  // حذف فعلي (استخدم بحذر)
  await db.execute('DELETE FROM users WHERE user_id = ?', [id]);

  // تسجيل في audit
  await db.execute(
    'INSERT INTO audit_trail (user_id, action_performed, performed_by, details) VALUES (?, ?, ?, ?)',    [id, 'user_deleted_by_admin', req.user.id, 'Hard delete performed']
  );

  res.json({ message: 'User deleted successfully' });
});