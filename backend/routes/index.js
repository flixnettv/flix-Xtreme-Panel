/**
 * Main API Routes Aggregator
 * routes/index.js
 * تجميع كل مسارات الـ API وتطبيق الحماية بالصلاحيات
 */

import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/userController.js';
import {
  getAllSubscriptions,
  createSubscription,
  updateSubscription,
  getUserSubscriptions,
  getExpiringSubscriptions
} from '../controllers/subscriptionController.js';
import {
  logUsage,
  getUserUsageLogs,
  getUsageStatistics
} from '../controllers/usageController.js';
import {
  getAuditLogs,
  logAuditEvent,
  exportAuditLogs
} from '../controllers/auditController.js';

const router = express.Router();

// ==========================================
// User Management Routes (Admin Only)
// ==========================================
router.get('/users', 
  authenticateToken, 
  authorizeRoles('Admin'), 
  getAllUsers
);

router.get('/users/:id', 
  authenticateToken, 
  authorizeRoles('Admin'), 
  getUserById
);
router.post('/users', 
  authenticateToken, 
  authorizeRoles('Admin'), 
  createUser
);

router.put('/users/:id', 
  authenticateToken, 
  authorizeRoles('Admin'), 
  updateUser
);

router.delete('/users/:id', 
  authenticateToken, 
  authorizeRoles('Admin'), 
  deleteUser
);

// ==========================================
// Subscription Routes
// ==========================================
// للجميع (محمي بتوكن): عرض الاشتراكات
router.get('/subscriptions', 
  authenticateToken, 
  getAllSubscriptions
);

// Admin/Reseller: إنشاء اشتراك
router.post('/subscriptions', 
  authenticateToken, 
  authorizeRoles('Admin', 'Reseller'), 
  createSubscription
);

// Admin/Reseller: تحديث اشتراك
router.put('/subscriptions/:id', 
  authenticateToken, 
  authorizeRoles('Admin', 'Reseller'), 
  updateSubscription
);

// المستخدم يرى اشتراكاته فقط
router.get('/subscriptions/user/:userId', 
  authenticateToken, 
  getUserSubscriptions
);

// Admin: عرض الاشتراكات على وشك الانتهاء
router.get('/subscriptions/expiring', 
  authenticateToken,   authorizeRoles('Admin'), 
  getExpiringSubscriptions
);

// ==========================================
// Usage Tracking Routes
// ==========================================
// تسجيل حدث استخدام (لأي مستخدم مسجل)
router.post('/usage', 
  authenticateToken, 
  logUsage
);

// عرض استخدامات مستخدم معين (له أو للـ Admin)
router.get('/usage/:userId', 
  authenticateToken, 
  getUserUsageLogs
);

// إحصائيات عامة (Admin only)
router.get('/usage/statistics', 
  authenticateToken, 
  authorizeRoles('Admin'), 
  getUsageStatistics
);

// ==========================================
// Audit Trail Routes (Admin Only)
// ==========================================
router.get('/audit', 
  authenticateToken, 
  authorizeRoles('Admin'), 
  getAuditLogs
);

router.post('/audit', 
  authenticateToken, 
  authorizeRoles('Admin'), 
  logAuditEvent
);

router.get('/audit/export', 
  authenticateToken, 
  authorizeRoles('Admin'), 
  exportAuditLogs
);

export default router;