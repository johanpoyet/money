#!/usr/bin/env bash
# Lancé par GitHub Actions sur le VPS (utilisateur « money », sans sudo) après l'envoi du code.
# Ne touche qu'à l'app money : Planify et les autres sites ne sont pas accessibles à cet utilisateur.
set -euo pipefail
cd /opt/money/app

ln -sfn /opt/money/.env .env          # la config reste hors du dossier déployé

echo "▸ Dépendances"
npm ci --no-audit --no-fund --loglevel=error

echo "▸ Migrations de la base"
npx drizzle-kit migrate

echo "▸ Build"
NEXT_TELEMETRY_DISABLED=1 npm run build

echo "▸ Redémarrage"
if pm2 describe money >/dev/null 2>&1; then
  pm2 reload money --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi
pm2 save >/dev/null

echo "▸ Vérification"
for i in $(seq 1 15); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/login || true)
  if [ "$code" = "200" ]; then echo "✓ money répond (200)"; exit 0; fi
  sleep 2
done
echo "✗ money ne répond pas après le déploiement" >&2
pm2 logs money --nostream --lines 30 >&2 || true
exit 1
