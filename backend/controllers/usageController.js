/**
 * Usage Tracking Controller
 * controllers/usageController.js
 * تسجيل وتحليل استخدام المستخدمين للنظام
 */

import db from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// ==========================================
// تسجيل حدث استخدام جديد
// POST /api/usage/log
// ==========================================
export const logUsage = asyncHandler(async (req, res) => {
  const { user_id, action, metadata, ip_address } = req.body;

  // تسجيل في usage_logs
  const [result] = await db.execute(
    `INSERT INTO usage_logs (user_id, action, metadata, ip_address) 
     VALUES (?, ?, ?, ?)`,
    [user_id, action, metadata ? JSON.stringify(metadata) : null, ip_address || req.ip]
  );

  res.status(201).json({
    message: 'Usage logged successfully',
    log_id: result.insertId
  });
});

// ==========================================
// جلب سجل استخدام مستخدم معين
// GET /api/usage/user/:userId?limit=50
// ==========================================
export const getUserUsageLogs = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);

  const [logs] = await db.execute(
    `SELECT log_id, action, metadata, action_time, ip_address 
     FROM usage_logs 
     WHERE user_id = ? 
     ORDER BY action_time DESC 
     LIMIT ?`,
    [userId, limit]
  );

  // فك تشفير metadata لو موجود
  const parsedLogs = logs.map(log => ({
    ...log,
    meta log.metadata ? JSON.parse(log.metadata) : null  }));

  res.json({ logs: parsedLogs });
});

// ==========================================
// إحصائيات الاستخدام العامة (Admin only)
// GET /api/usage/statistics?period=7d
// ==========================================
export const getUsageStatistics = asyncHandler(async (req, res) => {
  const period = req.query.period || '7d'; // 7d, 30d, 90d
  let interval;

  switch(period) {
    case '7d': interval = '7 DAY'; break;
    case '30d': interval = '30 DAY'; break;
    case '90d': interval = '90 DAY'; break;
    default: interval = '7 DAY';
  }

  // إجمالي عدد الأحداث
  const [total] = await db.execute(
    `SELECT COUNT(*) as count FROM usage_logs WHERE action_time >= DATE_SUB(NOW(), INTERVAL ${interval})`
  );

  // الأحداث حسب النوع
  const [byAction] = await db.execute(
    `SELECT action, COUNT(*) as count 
     FROM usage_logs 
     WHERE action_time >= DATE_SUB(NOW(), INTERVAL ${interval})
     GROUP BY action 
     ORDER BY count DESC 
     LIMIT 10`
  );

  // المستخدمين الأكثر نشاطاً
  const [topUsers] = await db.execute(
    `SELECT u.username, COUNT(ul.log_id) as actions 
     FROM usage_logs ul 
     JOIN users u ON ul.user_id = u.user_id 
     WHERE ul.action_time >= DATE_SUB(NOW(), INTERVAL ${interval})
     GROUP BY ul.user_id 
     ORDER BY actions DESC 
     LIMIT 10`
  );

  res.json({
    period,
    statistics: {
      total_actions: total[0].count,      by_action: byAction,
      top_users: topUsers
    }
  });
});