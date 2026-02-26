/**
 * Database Connection Pool Configuration
 * إعدادات مجموعة اتصالات MySQL - مُحسّنة لـ 1GB RAM
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// إنشاء مجموعة اتصالات (Connection Pool)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  // ⚠️ تحسينات للرام المحدود (1GB)
  waitForConnections: true,    // انتظار لو كل الاتصالات مشغولة
  connectionLimit: 5,          // الحد الأقصى للاتصالات المتزامنة (مهم جداً)
  queueLimit: 0,               // عدد غير محدود من الطلبات في الانتظار
  
  // تحسينات أداء إضافية
  enableKeepAlive: true,       // الحفاظ على الاتصال نشط
  keepAliveInitialDelay: 0,    // بدون تأخير في KeepAlive
  
  // إعدادات MySQL المحددة
  charset: 'utf8mb4',          // دعم كامل للعربية والإيموجي
  timezone: 'Z',               // استخدام UTC للتوقيت
  dateStrings: false,          // إرجاع التواريخ كـ Date objects
});

// دالة لاختبار الاتصال (اختيارية)
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database pool test successful');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database pool test failed:', error.message);
    return false;
  }
};

export default pool;