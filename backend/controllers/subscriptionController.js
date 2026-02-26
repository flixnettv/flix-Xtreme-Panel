/**
 * Subscription Management Controller
 * controllers/subscriptionController.js
 * إدارة خطط الاشتراك والدفع
 */

import db from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// ==========================================
// جلب جميع الاشتراكات
// GET /api/subscriptions
// ==========================================
export const getAllSubscriptions = asyncHandler(async (req, res) => {
  const [subscriptions] = await db.execute(
    `SELECT s.*, u.username, u.email 
     FROM subscriptions s 
     JOIN users u ON s.user_id = u.user_id 
     ORDER BY s.start_date DESC`
  );

  res.json({ subscriptions });
});

// ==========================================
// إنشاء اشتراك جديد
// POST /api/subscriptions
// ==========================================
export const createSubscription = asyncHandler(async (req, res) => {
  const { user_id, plan_name, start_date, end_date, status = 'active' } = req.body;

  // التحقق من وجود المستخدم
  const [users] = await db.execute('SELECT user_id FROM users WHERE user_id = ?', [user_id]);
  if (users.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  // التحقق من أن end_date بعد start_date
  if (new Date(end_date) <= new Date(start_date)) {
    return res.status(400).json({ error: 'End date must be after start date' });
  }

  const [result] = await db.execute(
    `INSERT INTO subscriptions (user_id, plan_name, start_date, end_date, status) 
     VALUES (?, ?, ?, ?, ?)`,
    [user_id, plan_name, start_date, end_date, status]
  );

  // تسجيل في audit
  await db.execute(    'INSERT INTO audit_trail (user_id, action_performed, details) VALUES (?, ?, ?)',
    [user_id, 'subscription_created', `Plan: ${plan_name}`]
  );

  res.status(201).json({
    message: 'Subscription created successfully',
    subscription_id: result.insertId
  });
});

// ==========================================
// تحديث اشتراك موجود
// PUT /api/subscriptions/:id
// ==========================================
export const updateSubscription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { plan_name, start_date, end_date, status } = req.body;

  // التحقق من وجود الاشتراك
  const [subs] = await db.execute('SELECT subscription_id, user_id FROM subscriptions WHERE subscription_id = ?', [id]);
  if (subs.length === 0) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  const updates = [];
  const values = [];

  if (plan_name) { updates.push('plan_name = ?'); values.push(plan_name); }
  if (start_date) { updates.push('start_date = ?'); values.push(start_date); }
  if (end_date) { updates.push('end_date = ?'); values.push(end_date); }
  if (status) { updates.push('status = ?'); values.push(status); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);
  await db.execute(`UPDATE subscriptions SET ${updates.join(', ')} WHERE subscription_id = ?`, values);

  res.json({ message: 'Subscription updated successfully' });
});

// ==========================================
// جلب اشتراكات مستخدم معين
// GET /api/subscriptions/user/:userId
// ==========================================
export const getUserSubscriptions = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const [subscriptions] = await db.execute(    `SELECT * FROM subscriptions WHERE user_id = ? ORDER BY start_date DESC`,
    [userId]
  );

  res.json({ subscriptions });
});

// ==========================================
// جلب الاشتراكات التي على وشك الانتهاء
// GET /api/subscriptions/expiring?days=7
// ==========================================
export const getExpiringSubscriptions = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 7;

  const [subscriptions] = await db.execute(
    `SELECT s.*, u.username, u.email 
     FROM subscriptions s 
     JOIN users u ON s.user_id = u.user_id 
     WHERE s.status = 'active' 
     AND s.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
     ORDER BY s.end_date ASC`,
    [days]
  );

  res.json({ 
    subscriptions,
    message: `Subscriptions expiring within ${days} days`
  });
});