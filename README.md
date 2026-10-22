# Money

App perso de budget : synchro quotidienne (lecture seule) des comptes Caisse d'Épargne via Enable Banking, classement automatique par règles, DA « Nuit ».

## Stack

- Next.js 16 (App Router, PWA), TypeScript, Tailwind 4
- PostgreSQL 16 (Docker sur le VPS, `127.0.0.1:5432`) + Drizzle ORM
- Enable Banking (accès aux comptes DSP2, mode gratuit pour ses propres comptes)
- Connexion à un seul compte : mot de passe (scrypt) + TOTP, cookie signé
- VPS OVH : Nginx → PM2 (port 3002), Certbot, sauvegarde quotidienne chiffrée

## Où sont les données (VPS)

```
/opt/money/
├── .env              secrets (chmod 600), lié depuis app/.env
├── app/              code déployé
├── db/               docker-compose Postgres + pgdata/ + .env (mot de passe de la base)
├── keys/             enablebanking.pem, backup.pass (chmod 600)
└── backups/          dumps quotidiens chiffrés (30 jours)
```

Jamais stockés : tes identifiants bancaires. L'identifiant de session Enable Banking est chiffré en AES-256-GCM.

## Démarrer en local

```bash
npm install
cp .env.example .env            # remplir DATABASE_URL, ENCRYPTION_KEY, SESSION_SECRET
ssh -N -L 5432:127.0.0.1:5432 vps   # tunnel vers la base du VPS (dans un autre onglet)
npm run db:migrate
npm run db:seed
npm run admin:create -- "un long mot de passe"   # copier les 2 lignes dans .env
npm run dev
```

## Mise en place Enable Banking (une fois)

1. Créer un compte sur enablebanking.com, puis une application en mode **Restricted production**.
2. Redirect URL : `https://money.johanpoyet.fr/api/bank/callback`.
3. Télécharger la clé privée générée → `/opt/money/keys/enablebanking.pem` (chmod 600), noter l'**Application ID** → `ENABLE_BANKING_APP_ID`.
4. Lier ton compte Caisse d'Épargne dans le tableau de bord Enable Banking (exigé en mode restreint).
5. Dans l'app : Réglages → Connecter ma banque.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run db:generate` | génère une migration après modification de `src/db/schema.ts` |
| `npm run db:migrate` | applique les migrations |
| `npm run db:seed` | catégories, budgets et règles de départ |
| `npm run sync` | synchro manuelle |
| `npm run admin:create -- "…"` | hash du mot de passe + secret TOTP |

## Production (VPS)

- L'app tourne sous l'utilisateur **`money`** (sans sudo) : PM2 `money` (127.0.0.1:3002), crontab de synchro, clé de déploiement GitHub Actions. Une fuite de la clé de déploiement ne donne accès qu'à l'app, pas au reste du serveur.
- Nginx `money.johanpoyet.fr` → 127.0.0.1:3002, HTTPS Let's Encrypt, HSTS, limite de tentatives sur `/login`, Fail2ban.
- Crontab de `money` (UTC) : synchro à 6 h (7 h l'hiver, 8 h l'été à Paris) → `/opt/money/sync.log`.
- Sauvegarde (crontab d'ubuntu, 2 h 30 UTC) : `/usr/local/sbin/money-backup` → `/opt/money-backups/` (illisible par `money`).
- Restaurer : `openssl enc -d -aes-256-cbc -pbkdf2 -pass file:/opt/money-backups/backup.pass -in money-AAAA-MM-JJ.sql.gz.enc | gunzip | docker exec -i money-postgres psql -U money -d money`
- Compte de connexion : `sudo -u money -H bash -c "cd /opt/money/app && npm run admin:create"` puis `sudo -u money -H pm2 restart money`.
- Secrets GitHub Actions : `VPS_HOST`, `VPS_USER=money`, `VPS_SSH_KEY`.
