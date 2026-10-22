# CLAUDE.md — Money

Contexte pour les assistants de code qui travaillent sur ce dépôt. À lire avant toute modification.

## Le projet

**Money** est l'app perso de budget de Johan (un seul utilisateur). Chaque matin, elle récupère en **lecture seule** les opérations de son compte Caisse d'Épargne Rhône Alpes via l'API **Enable Banking** (DSP2), les classe automatiquement par **règles**, et affiche ses dépenses en trois familles : charges fixes, vie courante, plaisirs.

- Production : https://money.johanpoyet.fr (PWA installée sur iPhone)
- Langue : **toute l'interface, les messages et les commits sont en français.**
- Dépôt : `github.com/johanpoyet/money` (privé), branche `main` = production.

## Stack

| Rôle | Outil |
|---|---|
| App | Next.js 16 (App Router, Turbopack), React 19, TypeScript strict |
| Style | Tailwind CSS 4 (tokens dans `src/app/globals.css`, `@theme`) |
| Base | PostgreSQL 16 (Docker sur le VPS) + Drizzle ORM / drizzle-kit |
| Banque | Enable Banking API (JWT RS256 signé avec la clé privée de l'app) |
| Auth | Maison : mot de passe scrypt + TOTP (`otpauth`), cookie JWT HS256 (`jose`) |
| Scripts | `tsx` (sync, seed, création du compte) |
| Hébergement | VPS OVH Ubuntu 24.04 : Nginx → PM2 (127.0.0.1:3002), Certbot, Fail2ban |
| CI/CD | GitHub Actions : vérification (types + build) puis déploiement par rsync + SSH |

## Arborescence

```
src/
├── app/
│   ├── page.tsx                  Accueil (solde, anneau fixes/courant/plaisirs, à classer, activité)
│   ├── operations/page.tsx       Liste du mois, filtres (?filtre=fixe|courant|plaisir|a-classer), recherche (?q=)
│   ├── operations/[id]/          Détail + edit-form.tsx (client) : catégorie, règle, note, exclusion
│   ├── budget/page.tsx           Reste à dépenser, jauges par catégorie
│   ├── reglages/                 Banque, synchro manuelle (sync-button.tsx), renouvellement, déconnexion
│   ├── login/page.tsx            Connexion (Server Action)
│   ├── confidentialite/, conditions/   Pages PUBLIQUES exigées par Enable Banking : ne pas supprimer
│   ├── api/bank/connect|callback Consentement bancaire (redirection vers l'app de la banque)
│   ├── api/sync                  POST : synchro manuelle
│   ├── api/transactions/[id]     PATCH : enregistre le classement d'une opération
│   ├── api/logout
│   ├── manifest.ts, layout.tsx, globals.css
├── components/nav.tsx            Barre d'onglets flottante + <Screen> (marges, safe areas)
├── components/ui.tsx             Ring, Gauge, CategoryBadge, TxRow, Legend
├── db/schema.ts, db/index.ts     Schéma Drizzle et client postgres-js
├── lib/
│   ├── enablebanking.ts          Client API (auth, sessions, comptes, soldes, transactions paginées)
│   ├── sync.ts                   runSync() et reapplyRules()
│   ├── categorize.ts             cleanLabel() et matchRule()
│   ├── queries.ts                Totaux du mois, dépenses par catégorie, opérations récentes
│   ├── auth.ts                   Mot de passe, TOTP, cookie de session
│   ├── crypto.ts                 AES-256-GCM pour les secrets stockés en base
│   └── format.ts                 Formats fr-FR (euros, dates)
├── proxy.ts                      (= middleware en Next 16) : tout est privé sauf login, pages légales, manifeste
scripts/   sync.ts (cron), seed.ts (catégories, budgets, règles, relabel), create-admin.ts
drizzle/   migrations SQL générées (ne jamais les éditer à la main)
deploy/    remote-deploy.sh, ecosystem.config.cjs, copies des configs Nginx / Fail2ban / sauvegarde
.github/workflows/deploy.yml
```

## Modèle de données (`src/db/schema.ts`)

- `categories` : `group` ∈ `fixe | courant | plaisir | hors`. `hors` = épargne, virements internes, entrées : **exclus des dépenses**. `monthlyBudget` optionnel.
- `transactions` : `amount` **négatif = débit**, positif = crédit. `rawLabel` = libellé brut de la banque, `label` = version nettoyée. `categoryLocked = true` quand Johan a choisi la catégorie à la main : les règles ne la modifient plus. `yearly = true` : paiement annuel lissé sur 12 mois dans les totaux. `excluded` : ignorée des totaux. Unicité `(accountId, externalId)`.
- `rules` : `pattern` = sous-chaînes séparées par `|`, comparées en majuscules au **libellé brut**. `amount` optionnel (montant exact en valeur absolue). Tri par `priority` croissante, puis règles avec montant d'abord.
- `bankSessions` : `sessionIdEnc` chiffré (AES-256-GCM), `validUntil` (~180 jours).
- `syncRuns` : historique des synchros.

Modifier le schéma : éditer `schema.ts` → `npm run db:generate` → commiter la migration générée. Elle est appliquée automatiquement au déploiement (`drizzle-kit migrate`).

## Commandes

```bash
npm run dev          # dev local
npm run typecheck    # tsc --noEmit (à lancer avant chaque commit)
npm run build        # build de prod (doit passer : la CI le vérifie)
npm run db:generate  # migration après modif du schéma
npm run db:seed      # catégories/règles de départ (idempotent) + recalcul des libellés + réapplication des règles
npm run sync         # synchro manuelle
```

### Développement local

Il n'existe **qu'une seule base : celle de production**. En local, on s'y connecte par un tunnel SSH :

```bash
ssh -N -L 5432:127.0.0.1:5432 vps        # dans un autre terminal
```

⚠️ Toute écriture en local (classement, seed, migration, sync) **modifie les vraies données de Johan**. Ne jamais lancer de requête destructive (DELETE, TRUNCATE, DROP, migration qui supprime une colonne) sans le lui demander explicitement.

## Déploiement

- `git push` sur `main` → GitHub Actions : `npm ci` + typecheck + build, puis rsync vers `/opt/money/app/` (sans `.git`, `node_modules`, `.next`, `.env*`) et `deploy/remote-deploy.sh` sur le VPS (`npm ci`, migrations, build, `pm2 reload money`, contrôle HTTP).
- L'app tourne sous l'utilisateur Linux **`money`, sans sudo**. La clé de déploiement ne donne accès qu'à ce compte.
- Secrets GitHub : `VPS_HOST`, `VPS_USER=money`, `VPS_SSH_KEY`.
- Tout changement de dépendance doit mettre à jour `package-lock.json` (sinon `npm ci` échoue en CI).

## Le serveur (VPS OVH `51.210.180.130`, alias SSH `vps`, utilisateur `ubuntu`)

Il héberge aussi **Planify** (planify.johanpoyet.fr, PM2 de `ubuntu`, port 3000), **johanpoyet.fr**, **budget.johanpoyet.fr** (autre app, `lea-budget`) et un monitoring Grafana/Prometheus en Docker.

```
/opt/money/            (ubuntu:money 750)
├── .env               secrets de l'app (money, 600) — lié depuis app/.env
├── app/               code déployé (money)
├── keys/              enablebanking.pem (money, 600)
└── db/                docker-compose Postgres + pgdata (ubuntu)
/opt/money-backups/    sauvegardes chiffrées + backup.pass (ubuntu, illisible par money)
/usr/local/sbin/money-backup   script de sauvegarde (root), crontab d'ubuntu 2 h 30 UTC
/etc/nginx/sites-available/money.johanpoyet.fr, /etc/nginx/conf.d/money-ratelimit.conf
/etc/fail2ban/jail.d/money.local
```

- Postgres : conteneur `money-postgres`, uniquement sur `127.0.0.1:5432`.
- Synchro : crontab de `money`, 6 h UTC (7 h l'hiver, 8 h l'été à Paris) → `/home/money/sync.log`.
- PM2 de l'app : `sudo -u money -H pm2 status|logs money|restart money`.
- Le serveur est en UTC.

### 🔴 Règles absolues sur le serveur

**Ne jamais rien faire qui puisse casser le serveur, Planify ou les autres sites sans l'accord explicite de Johan.** Lecture seule (logs, statuts, configs) : libre. Tout le reste (apt, redémarrage de service, modif de config Nginx/SSH/UFW/Fail2ban, crontab, suppression) : expliquer ce qui va être fait et le risque, puis attendre son feu vert.

- Nginx : toujours `sudo nginx -t` avant `systemctl reload nginx`. Ne jamais toucher aux blocs des autres sites.
- Changer la *clé* d'une zone `limit_req` existante échoue silencieusement au reload (l'ancienne config reste active) : renommer la zone.
- Fail2ban surveille les 429 de Nginx : ne pas marteler `/login` en test depuis l'IP de Johan (il se ferait bannir de tous ses sites pendant 1 h). Débannir : `sudo fail2ban-client set nginx-limit-req unbanip <IP>`.

## Conventions de code

- TypeScript strict, imports avec l'alias `@/`.
- **Server Components par défaut.** Les pages qui lisent la base exportent `export const dynamic = "force-dynamic"`.
- **Pour les écritures depuis l'UI, utiliser des routes API (`fetch`) plutôt que des Server Actions.** Une page restée ouverte dans la PWA garde d'anciens identifiants d'action après un redéploiement et l'enregistrement échoue silencieusement. (Seule la page de connexion utilise une Server Action.)
- Toute nouvelle route est protégée automatiquement par `src/proxy.ts`. Une page publique doit être ajoutée explicitement au `matcher`.
- Montants : `numeric` en base (chaînes côté JS) → `Number()` pour calculer, formats via `lib/format.ts` (`euros`, `eurosCents`, `signed`), avec un vrai signe moins (`−`).
- Dates en `YYYY-MM-DD` (`date` Postgres) ; affichage en `fr-FR`, fuseau Europe/Paris.

### Design « Nuit » (DA validée, à respecter)

- Couleurs (tokens Tailwind) : `bg` #11131B, `surface` #1A1D28, `surface-2` #232736, `line` #2C3142, `ink` #ECEEF5, `muted` #9AA0B4 ; familles `fixe` #8B9CFF, `courant` #F2B46B, `plaisir` #E7799A ; `plus` #6FD3A5 (entrées), `over` #FF7A6B (dépassement) ; variantes `*-soft` pour les pastilles.
- Une catégorie hérite **toujours** de la couleur de sa famille.
- Polices : Manrope (texte), **DM Mono pour tous les montants** (classe `.num`).
- Rayons : 12 (icônes), 18 (cartes), 22 (blocs), pilules. Pas d'ombres. Zones tactiles ≥ 44 px.
- Mobile d'abord (max-width 480 px). **Respecter les safe areas iOS** (`env(safe-area-inset-*)`) : en mode PWA, un bouton sous la barre d'état n'est pas cliquable. Utiliser `<Screen>` pour les écrans à onglets.

## Pièges connus

- **`$` dans `.env`** : Next.js interprète `$XXX` comme une variable. Le hash du mot de passe (`scrypt$sel$hash`) doit être écrit `scrypt\$sel\$hash` (c'est ce que fait `npm run admin:create`).
- **Libellés bancaires** : l'API ne renvoie pas les mêmes libellés que l'app Caisse d'Épargne (ex. loyer = `VIR SEPA ISABELLE ET FREDERIC`, frais = `* OFFRE CONFORT`, cartes = `CB XXX FACT 181026 874237******9`). Écrire les règles sur le **libellé brut** ; `cleanLabel()` retire les préfixes (CB, PRLV, VIR INST…), la date de facture et le numéro de carte masqué.
- Les opérations « en cours » sont relues sur 7 jours à chaque synchro (`OVERLAP_DAYS`). Première synchro : 90 jours.
- Le consentement bancaire expire au bout de ~180 jours : l'app l'affiche dans Réglages 14 jours avant.
- Enable Banking en mode « Restricted production » : seuls les comptes liés par Johan dans leur tableau de bord sont accessibles.

## Git

- Commits en français, au format conventionnel : `feat:`, `fix:`, `chore:`, `docs:`, `ci:`, `refactor:`, avec un scope si utile (`feat(sync): …`).
- Un commit par changement logique.
- **Ne jamais mentionner Claude ni un outil d'IA dans les commits ou les PR** : pas de `Co-Authored-By`, pas de « Generated with … », pas de signature.
- Ne jamais commiter de secret (`.env`, `.pem`, clés). Le `.gitignore` les exclut déjà.
- Ne pas pousser sur `main` sans que Johan l'ait demandé : un push = un déploiement en production.
