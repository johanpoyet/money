// PM2 sur le VPS : l'app sur le port 3002 (3000 = Planify, 3001 = Grafana).
// Next lit /opt/money/app/.env, qui est un lien vers /opt/money/.env (hors du dossier déployé).
// La synchro et la sauvegarde passent par la crontab d'ubuntu (voir README).
module.exports = {
  apps: [
    {
      name: "money",
      cwd: "/opt/money/app",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3002 -H 127.0.0.1",
      env: { NODE_ENV: "production", TZ: "Europe/Paris" },
      max_memory_restart: "400M",
    },
  ],
};
