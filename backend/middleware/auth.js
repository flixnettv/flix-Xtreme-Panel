/**
 * Authentication & Authorization Middleware
 * middleware/auth.js
 * التحقق من التوكن والصلاحيات
 */

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Middleware: التحقق من وجود وصحة JWT Token
 * يُستخدم لحماية المسارات التي تتطلب تسجيل دخول
 */
export const authenticateToken = (req, res, next) => {
  // قراءة التوكن من الهيدر: Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // الجزء الثاني بعد "Bearer"

  // لو مفيش توكن
  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied', 
      message: 'No authentication token provided' 
    });
  }

  try {
    // التحقق من التوكن وفك تشفيره
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // إضافة بيانات المستخدم للطلب عشان تستخدم في الكونترولر
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    };
    
    next(); // المتابعة للخطوة التالية
  } catch (error) {
    // لو التوكن منتهي أو غير صالح
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired', 
        message: 'Please login again' 
      });
    }
    return res.status(403).json({ 
      error: 'Invalid token',       message: 'Authentication failed' 
    });
  }
};

/**
 * Middleware: التحقق من الصلاحيات (Role-Based Access Control)
 * يُستخدم بعد authenticateToken للتحقق من صلاحية المستخدم
 * @param {...string} roles - الأدوار المسموح لها بالدخول
 * @example authorizeRoles('Admin', 'Reseller')
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // لو مفيش user في الطلب (ده مش متوقع لو authenticateToken اشتغل)
    if (!req.user || !req.user.role) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'User role not found' 
      });
    }

    // لو دور المستخدم مش في القائمة المسموحة
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: `Role '${req.user.role}' is not authorized for this action` 
      });
    }

    next(); // الصلاحية موجودة، اكمل
  };
};

/**
 * Middleware: التحقق الاختياري من التوكن
 * يُستخدم للمسارات اللي ممكن تشتغل مع أو بدون تسجيل دخول
 * لو التوكن موجود وصحيح، هيضيف بيانات المستخدم
 * لو مفيش توكن أو غلط، يكمل عادي (req.user = null)
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role      };
    } catch (error) {
      // تجاهل الأخطاء عشان ده تحقق اختياري
      req.user = null;
    }
  } else {
    req.user = null;
  }
  
  next();
};