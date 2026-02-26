#!/bin/bash
# ==========================================
# Xtreme Panel - Deployment Script
# scripts/deploy.sh
# نشر التحديثات على السيرفر تلقائياً
# ==========================================

set -e  # إيقاف السكربت عند أي خطأ

echo "🚀 Starting Xtreme Panel deployment..."

# ==========================================
# متغيرات التكوين
# ==========================================
APP_DIR="/home/xtreme-panel"
BACKEND_DIR="$APP_DIR/backend"
LOG_FILE="$APP_DIR/deploy.log"
GIT_BRANCH="main"

# دالة للتسجيل في الملف والكونسول
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# ==========================================
# الخطوة 1: التحقق من الصلاحيات
# ==========================================
if [ "$EUID" -eq 0 ]; then
  log "⚠️ Running as root - consider using a regular user with sudo"
fi

# ==========================================
# الخطوة 2: سحب أحدث كود من Git
# ==========================================
log "📦 Pulling latest code from Git..."
cd "$APP_DIR"
git fetch origin
git checkout "$GIT_BRANCH"
git pull origin "$GIT_BRANCH"
log "✅ Code updated"

# ==========================================
# الخطوة 3: تثبيت المكاتب (Node.js)
# ==========================================
log "📦 Installing Node.js dependencies..."
cd "$BACKEND_DIR"
npm ci --production --silent  # أسرع من npm install
log "✅ Dependencies installed"

# ==========================================# الخطوة 4: بناء الفرونت إند (لو موجود)
# ==========================================
if [ -d "$APP_DIR/frontend" ]; then
  log "🎨 Building React frontend..."
  cd "$APP_DIR/frontend"
  npm ci --production --silent
  npm run build --silent
  log "✅ Frontend built"
fi

# ==========================================
# الخطوة 5: تحديث قاعدة البيانات (مهاجر)
# ==========================================
# لو عندك ملفات migration، نفذها هنا
# مثال:
# if [ -f "$BACKEND_DIR/migrate.js" ]; then
#   log "🗄️ Running database migrations..."
#   node migrate.js
#   log "✅ Migrations completed"
# fi

# ==========================================
# الخطوة 6: إعادة تشغيل التطبيق بـ PM2
# ==========================================
log "🔄 Restarting application with PM2..."
cd "$BACKEND_DIR"

# التحقق من أن PM2 شغال
if ! pm2 list > /dev/null 2>&1; then
  log "❌ PM2 is not running. Please start PM2 first."
  exit 1
fi

# إعادة التشغيل مع الحفاظ على البيئة
pm2 reload ecosystem.config.js --update-env
pm2 save

# انتظار ثواني عشان نتأكد أن التطبيق شغال
sleep 5

# التحقق من حالة التطبيق
if pm2 list | grep -q "xtreme-panel.*online"; then
  log "✅ Application restarted successfully"
else
  log "❌ Application failed to start. Check logs:"
  pm2 logs xtreme-panel --lines 20
  exit 1
fi

# ==========================================# الخطوة 7: تنظيف الملفات المؤقتة
# ==========================================
log "🧹 Cleaning up temporary files..."
npm cache clean --force > /dev/null 2>&1
find "$BACKEND_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null || true
log "✅ Cleanup completed"

# ==========================================
# الخطوة 8: اختبار سريع للصحة
# ==========================================
log "🏥 Running health check..."
HEALTH_URL="http://localhost:5000/api/health"
if curl -s -f "$HEALTH_URL" > /dev/null; then
  log "✅ Health check passed"
else
  log "⚠️ Health check failed - application may not be responding"
fi

# ==========================================
# النهاية
# ==========================================
log "🎉 Deployment completed successfully!"
echo ""
echo "📊 Application status:"
pm2 list xtreme-panel
echo ""
echo "📝 Logs: tail -f $LOG_FILE"