/**
 * Xtreme Panel - Server Entry Point
 * نقطة دخول تطبيق Express
 * مُحسّن للسيرفرات محدودة الموارد (1GB RAM)
 */

import express from 'express';
import helmet from 'helmet';           // حماية برؤوس HTTP الآمنة
import cors from 'cors';               // السماح بالطلبات من نطاقات مختلفة
import bodyParser from 'body-parser';  // تحليل جسم الطلبات JSON
import dotenv from 'dotenv';           // تحميل متغيرات البيئة من ملف .env
import db from './config/database.js'; // اتصال قاعدة البيانات
import { errorHandler } from './middleware/errorHandler.js'; // معالجة الأخطاء

// تحميل متغيرات البيئة
dotenv.config();

// إنشاء تطبيق Express
const app = express();

// ==========================================
// Middleware - الطبقات الوسيطة
// ==========================================

// إضافة رؤوس أمان HTTP
app.use(helmet());

// السماح بـ CORS (للفرونت إند أو التطبيقات الخارجية)
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // يمكن تحديده للفرونت إند فقط
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// تحليل الطلبات JSON و URL-encoded
app.use(bodyParser.json({ limit: '1mb' })); // تحديد حجم الطلب لتوفير الرام
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

// ==========================================
// Database Connection - اتصال قاعدة البيانات
// ==========================================

// التحقق من اتصال قاعدة البيانات عند بدء التشغيل
db.getConnection()
  .then((connection) => {
    console.log('✅ Database connected successfully');
    connection.release(); // إعادة الاتصال للـ Pool
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);    process.exit(1); // إيقاف التطبيق لو فشل الاتصال
  });

// ==========================================
// Routes - المسارات
// ==========================================

// مسار اختباري للتأكد أن السيرفر شغال
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// مسارات المصادقة (تسجيل، دخول، إلخ)
import authRoutes from './routes/auth.js';
app.use('/api/auth', authRoutes);

// مسارات الـ APIs الأخرى (مستخدمين، اشتراكات، إلخ)
import apiRoutes from './routes/index.js';
app.use('/api', apiRoutes);

// ==========================================
// Error Handling - معالجة الأخطاء
// ==========================================

// مسار للطلبات غير الموجودة (404)
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// استخدام معالج الأخطاء المركزي
app.use(errorHandler);

// ==========================================
// Graceful Shutdown - الإغلاق الآمن
// ==========================================

// التعامل مع إشارات الإغلاق (لإيقاف نظيف)
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received: Closing server gracefully...');
  server.close(() => {
    db.end((err) => {
      if (err) console.error('❌ Error closing DB pool:', err);
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received: Closing server gracefully...');  server.close(() => {
    db.end((err) => {
      if (err) console.error('❌ Error closing DB pool:', err);
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
});

// ==========================================
// Start Server - تشغيل السيرفر
// ==========================================

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// التعامل مع أخطاء تشغيل السيرفر
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', err.message);
  }
  process.exit(1);
});