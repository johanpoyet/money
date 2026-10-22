#!/usr/bin/env bash
# Sauvegarde quotidienne chiffrée de la base.
# Installée par l'admin dans /usr/local/sbin/money-backup (propriété root) et lancée par la crontab d'ubuntu
# (heure UTC : 30 2 * * *). Les sauvegardes et leur clé sont hors de portée de l'utilisateur « money ».
set -euo pipefail
umask 077
DEST=/opt/money-backups
STAMP=$(date +%F)
docker exec money-postgres pg_dump -U money -d money --no-owner \
  | gzip \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass file:$DEST/backup.pass \
  > "$DEST/money-$STAMP.sql.gz.enc"
# Garde 30 jours
find "$DEST" -name 'money-*.sql.gz.enc' -mtime +30 -delete
