/**
 * Audit Trail Controller (Admin Only)
 * controllers/auditController.js
 * سجل التدقيق لتتبع كل الإجراءات المهمة في النظام
 */

import db from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// ==========================================
// جلب كل سجلات التدقيق (مع فلاتر)
// GET /api/audit?user_id=123&action=login&limit=50
// ==========================================
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { user_id, action, start_date, end_date } = req.query;
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);

  let query = `
    SELECT a.audit_id, a.user_id, u.username, a.action_performed, 
           a.details, a.ip_address, a.action_time 
    FROM audit_trail a 
    LEFT JOIN users u ON a.user_id = u.user_id 
    WHERE 1=1
  `;
  const params = [];

  if (user_id) {
    query += ' AND a.user_id = ?';
    params.push(user_id);
  }
  if (action) {
    query += ' AND a.action_performed = ?';
    params.push(action);
  }
  if (start_date) {
    query += ' AND a.action_time >= ?';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND a.action_time <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY a.action_time DESC LIMIT ?';
  params.push(limit);

  const [logs] = await db.execute(query, params);

  res.json({
    audit_logs: logs,    count: logs.length
  });
});

// ==========================================
// تسجيل حدث تدقيق جديد (يُستخدم داخلياً)
// POST /api/audit (محمي بـ Admin)
// ==========================================
export const logAuditEvent = asyncHandler(async (req, res) => {
  const { user_id, action_performed, details, ip_address } = req.body;

  const [result] = await db.execute(
    `INSERT INTO audit_trail (user_id, action_performed, details, ip_address) 
     VALUES (?, ?, ?, ?)`,
    [user_id, action_performed, details, ip_address || req.ip]
  );

  res.status(201).json({
    message: 'Audit event logged',
    audit_id: result.insertId
  });
});

// ==========================================
// تصدير سجلات التدقيق (CSV) - Admin only
// GET /api/audit/export?format=csv
// ==========================================
export const exportAuditLogs = asyncHandler(async (req, res) => {
  const format = req.query.format || 'csv';
  
  const [logs] = await db.execute(
    `SELECT a.action_time, u.username, a.action_performed, a.details, a.ip_address 
     FROM audit_trail a 
     LEFT JOIN users u ON a.user_id = u.user_id 
     ORDER BY a.action_time DESC 
     LIMIT 1000`
  );

  if (format === 'csv') {
    // إنشاء CSV بسيط
    const headers = ['Timestamp', 'Username', 'Action', 'Details', 'IP Address'];
    const rows = logs.map(log => [
      log.action_time,
      log.username || 'N/A',
      log.action_performed,
      log.details || '',
      log.ip_address || ''
    ]);

    const csvContent = [      headers.join(','),
      ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit_export.csv"');
    res.send(csvContent);
  } else {
    res.json({ audit_logs: logs });
  }
});