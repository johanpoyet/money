#!/usr/bin/env bash
# Sauvegarde quotidienne chiffrée de la base (crontab, heure UTC : 30 2 * * * /opt/money/app/deploy/backup.sh)
# Chiffrement symétrique avec la phrase de passe de /opt/money/keys/backup.pass (chmod 600).
set -euo pipefail
umask 077
DEST=/opt/money/backups
STAMP=$(date +%F)
docker exec money-postgres pg_dump -U money -d money --no-owner \
  | gzip \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass file:/opt/money/keys/backup.pass \
  > "$DEST/money-$STAMP.sql.gz.enc"
# Garde 30 jours
find "$DEST" -name 'money-*.sql.gz.enc' -mtime +30 -delete
