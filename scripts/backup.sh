#!/bin/bash
# ==========================================
# Xtreme Panel - Database Backup Script
# scripts/backup.sh
# نسخ احتياطي تلقائي لقاعدة البيانات
# ==========================================

set -e  # إيقاف عند أي خطأ

# ==========================================
# ⚙️ متغيرات التكوين (عدّلها حسب احتياجك)
# ==========================================

# إعدادات قاعدة البيانات
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-xtreme_user}"
DB_PASSWORD="${DB_PASSWORD}"  # يفضل تمريرها كـ environment variable
DB_NAME="${DB_NAME:-xtreme_panel}"

# إعدادات النسخ الاحتياطي
BACKUP_DIR="${BACKUP_DIR:-/var/backups/xtreme_panel}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# إعدادات التنبيهات (اختياري)
ALERT_EMAIL="${ALERT_EMAIL:-}"  # لو حبيت تبعت إيميل عند النجاح/الفشل

# دالة للتسجيل
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# ==========================================
# الخطوة 1: التحقق من المتغيرات المطلوبة
# ==========================================
if [ -z "$DB_PASSWORD" ]; then
  log "❌ Error: DB_PASSWORD environment variable is required"
  exit 1
fi

if [ -z "$DB_NAME" ]; then
  log "❌ Error: DB_NAME environment variable is required"
  exit 1
fi

# ==========================================
# الخطوة 2: إنشاء مجلد النسخ الاحتياطي# ==========================================
if [ ! -d "$BACKUP_DIR" ]; then
  log "📁 Creating backup directory: $BACKUP_DIR"
  mkdir -p "$BACKUP_DIR"
  chmod 700 "$BACKUP_DIR"  # صلاحيات آمنة
fi

# ==========================================
# الخطوة 3: تنفيذ النسخ الاحتياطي
# ==========================================
log "💾 Starting database backup: $DB_NAME"

# استخدام mysqldump مع خيارات آمنة
mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --password="$DB_PASSWORD" \
  --single-transaction \
  --quick \
  --lock-tables=false \
  --max_allowed_packet=64M \
  "$DB_NAME" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  log "✅ Database dump completed: $(du -h "$BACKUP_FILE" | cut -f1)"
else
  log "❌ Database dump failed"
  exit 1
fi

# ==========================================
# الخطوة 4: ضغط الملف لتوفير المساحة
# ==========================================
log "🗜️ Compressing backup file..."
gzip -9 "$BACKUP_FILE"

if [ -f "$COMPRESSED_FILE" ]; then
  COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
  log "✅ Compression completed: $COMPRESSED_SIZE"
  
  # حذف الملف الأصلي غير المضغوط
  rm -f "$BACKUP_FILE"
else
  log "❌ Compression failed"
  exit 1
fi

# ==========================================
# الخطوة 5: تنظيف النسخ القديمة# ==========================================
log "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)
log "🗑️ Deleted $DELETED_COUNT old backup(s)"

# ==========================================
# الخطوة 6: التحقق من سلامة النسخة (اختياري)
# ==========================================
log "🔍 Verifying backup integrity..."
if gzip -t "$COMPRESSED_FILE" 2>/dev/null; then
  log "✅ Backup file is valid"
else
  log "❌ Backup file is corrupted!"
  exit 1
fi

# ==========================================
# الخطوة 7: إرسال تنبيه (اختياري)
# ==========================================
if [ -n "$ALERT_EMAIL" ] && command -v mail &> /dev/null; then
  log "📧 Sending notification email..."
  echo "Backup completed successfully: $COMPRESSED_FILE ($COMPRESSED_SIZE)" | \
    mail -s "✅ Xtreme Panel Backup - $(date)" "$ALERT_EMAIL"
fi

# ==========================================
# النهاية
# ==========================================
log "🎉 Backup completed successfully!"
echo ""
echo "📦 Backup file: $COMPRESSED_FILE"
echo "📊 Size: $COMPRESSED_SIZE"
echo "🗓️ Retention: $RETENTION_DAYS days"
echo "📁 Directory: $BACKUP_DIR"

# إرجاع كود نجاح
exit 0