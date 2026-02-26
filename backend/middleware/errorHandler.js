/**
 * Centralized Error Handler Middleware
 * middleware/errorHandler.js
 * معالجة موحدة للأخطاء في كل التطبيق
 */

/**
 * معالج الأخطاء المركزي
 * يلتقط أي خطأ في التطبيق ويرد برد آمن ومنظم
 */
export const errorHandler = (err, req, res, next) => {
  // تسجيل الخطأ في الكونسول (للمطورين)
  console.error('❌ Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // أخطاء MySQL (مثل تكرار الإيميل)
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Resource already exists (duplicate entry)'
    });
  }

  // أخطاء التحقق من المدخلات (express-validator)
  if (err.errors && Array.isArray(err.errors)) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors
    });
  }

  // أخطاء JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid token format'
    });
  }

  // أخطاء الاتصال بقاعدة البيانات
  if (err.code === 'PROTOCOL_CONNECTION_LOST' || 
      err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Database connection error'
    });
  }

  // الرد الافتراضي لأي خطأ آخر
  // ⚠️ مهم: متعرضش تفاصيل الخطأ الحقيقية للمستخدم (أمان)
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Something went wrong. Please try again later.'
  });
};

/**
 * Middleware للتعامل مع الأخطاء في الدوال غير المتزامنة (async/await)
 * يُستخدم عشان متحتاجش try/catch في كل مكان
 * @param {Function} fn - الدالة غير المتزامنة
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};