/**
 * Authentication Routes
 * routes/auth.js
 * مسارات المصادقة: تسجيل، دخول، إعادة تعيين باسوورد
 */

import express from 'express';
import {
  register,
  login,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRegister, validateLogin } from '../middleware/validation.js';

const router = express.Router();

// 📝 ملاحظة: كل المسارات تبدأ بـ /api/auth

// تسجيل مستخدم جديد
router.post('/register', validateRegister, register);

// تسجيل الدخول
router.post('/login', validateLogin, login);

// تسجيل الخروج (محمي)
router.post('/logout', authenticateToken, logout);

// الحصول على بيانات المستخدم الحالي (محمي)
router.get('/me', authenticateToken, getCurrentUser);

// طلب إعادة تعيين الباسوورد
router.post('/forgot-password', forgotPassword);

// إعادة تعيين الباسوورد فعلياً
router.post('/reset-password', resetPassword);

export default router;