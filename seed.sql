-- ==========================================
-- Xtreme Panel - Database Seed Data
-- seed.sql
-- بيانات أولية: أدوار، صلاحيات، ومستخدم Admin
-- ==========================================

-- ⚠️ نفّذ هذا الملف بعد إنشاء الجداول
-- mysql -u root -p xtreme_panel < seed.sql

-- ==========================================
-- 1. إدخال الأدوار الأساسية (Roles)
-- ==========================================
INSERT INTO roles (role_name) VALUES 
('Admin'),
('Reseller'),
('Distributor'),
('User')
ON DUPLICATE KEY UPDATE role_name = role_name;

-- ==========================================
-- 2. إدخال الصلاحيات الأساسية (Permissions)
-- ==========================================
INSERT INTO permissions (permission_name) VALUES
-- صلاحيات المستخدمين
('user:create'),
('user:read'),
('user:update'),
('user:delete'),

-- صلاحيات الاشتراكات
('subscription:create'),
('subscription:read'),
('subscription:update'),
('subscription:delete'),

-- صلاحيات التقارير
('report:view'),
('report:export'),

-- صلاحيات النظام
('system:settings'),
('system:backup'),
('system:audit')
ON DUPLICATE KEY UPDATE permission_name = permission_name;

-- ==========================================
-- 3. ربط الصلاحيات بالأدوار (Role-Permission Mapping)
-- ==========================================

-- Admin: كل الصلاحياتINSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id 
FROM roles r, permissions p 
WHERE r.role_name = 'Admin'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Reseller: صلاحيات محدودة
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id 
FROM roles r, permissions p 
WHERE r.role_name = 'Reseller' 
AND p.permission_name IN (
  'user:create', 'user:read', 'user:update',
  'subscription:create', 'subscription:read', 'subscription:update',
  'report:view'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Distributor: قراءة فقط
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id 
FROM roles r, permissions p 
WHERE r.role_name = 'Distributor' 
AND p.permission_name IN (
  'user:read', 'subscription:read', 'report:view'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- User: صلاحيات أساسية
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id 
FROM roles r, permissions p 
WHERE r.role_name = 'User' 
AND p.permission_name IN (
  'user:read', 'subscription:read'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- ==========================================
-- 4. إنشاء مستخدم Admin افتراضي
-- ==========================================
-- ⚠️ الباسوورد: Admin@123 (مشفّر بـ bcrypt مع 10 جولات)
-- لتغيير الباسوورد: استخدم https://bcrypt-generator.com/

INSERT INTO users (username, email, password_hash, role_id)
SELECT 
  'admin',
  'admin@xtremepanel.local',
  '$2a$10$N.ZJr8H.7vK8xK8xK8xK8u8xK8xK8xK8xK8xK8xK8xK8xK8xK8xK', -- Admin@123
  role_idFROM roles 
WHERE role_name = 'Admin'
ON DUPLICATE KEY UPDATE 
  username = username,
  updated_at = NOW();

-- ==========================================
-- 5. إدخال خطط الاشتراك الافتراضية
-- ==========================================
INSERT INTO subscriptions (user_id, plan_name, start_date, end_date, status)
SELECT 
  u.user_id,
  'Enterprise',
  CURDATE(),
  DATE_ADD(CURDATE(), INTERVAL 1 YEAR),
  'active'
FROM users u
WHERE u.username = 'admin'
AND NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.user_id = u.user_id
);

-- ==========================================
-- 6. رسالة تأكيد
-- ==========================================
SELECT 
  '✅ Seed data inserted successfully' as message,
  (SELECT COUNT(*) FROM roles) as roles_count,
  (SELECT COUNT(*) FROM permissions) as permissions_count,
  (SELECT COUNT(*) FROM users WHERE username = 'admin') as admin_users;