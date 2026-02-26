/**
 * Input Validation Middleware using express-validator
 * middleware/validation.js
 * التحقق من صحة المدخلات وتنظيفها قبل المعالجة
 */

import { body, validationResult } from 'express-validator';

/**
 * دالة مساعدة: إرجاع أخطاء التحقق في شكل موحد
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// ==========================================
// قواعد التحقق للتسجيل (Register)
// ==========================================
export const validateRegister = [
  // اسم المستخدم: 3-50 حرف، أحرف وأرقام فقط
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .escape(), // منع XSS

  // الإيميل: تنسيق صحيح وتطبيع
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email is too long'),

  // الباسوورد: 6 أحرف على الأقل، حرف كبير، رقم، رمز خاص
  body('password')
    .trim()    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must include uppercase, lowercase, number, and special character'),

  // الدور: يجب أن يكون من القائمة المحددة
  body('role')
    .optional()
    .isIn(['Admin', 'Reseller', 'Distributor', 'User'])
    .withMessage('Invalid role specified')
    .default('User'), // القيمة الافتراضية لو مش محدد

  // معالجة الأخطاء
  handleValidationErrors
];

// ==========================================
// قواعد التحقق لتسجيل الدخول (Login)
// ==========================================
export const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

// ==========================================
// قواعد التحقق لتحديث المستخدم (Admin only)
// ==========================================
export const validateUpdateUser = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Invalid username format')
    .escape(),

  body('email')
    .optional()
    .trim()    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('role')
    .optional()
    .isIn(['Admin', 'Reseller', 'Distributor', 'User'])
    .withMessage('Invalid role'),

  body('password')
    .optional()
    .trim()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),

  handleValidationErrors
];

// ==========================================
// قواعد التحقق للاشتراكات (Subscriptions)
// ==========================================
export const validateSubscription = [
  body('user_id')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),

  body('plan_name')
    .trim()
    .isIn(['Free', 'Basic', 'Pro', 'Enterprise'])
    .withMessage('Invalid plan name'),

  body('start_date')
    .isISO8601()
    .withMessage('Start date must be in ISO format (YYYY-MM-DD)'),

  body('end_date')
    .isISO8601()
    .withMessage('End date must be in ISO format (YYYY-MM-DD)'),

  body('status')
    .optional()
    .isIn(['active', 'inactive', 'expired', 'cancelled'])
    .withMessage('Invalid status value'),

  handleValidationErrors
];

// ==========================================
// قواعد التحقق لتسجيل الاستخدام (Usage Logs)
// ==========================================export const validateUsageLog = [
  body('user_id')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),

  body('action')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Action description is required')
    .escape(),

  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be a valid JSON object'),

  handleValidationErrors
];