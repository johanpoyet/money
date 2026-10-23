// Synchro bancaire : lancée chaque matin par une tâche planifiée Dokploy (npm run sync).
import "dotenv/config";

async function main() {
  const { runSync } = await import("../src/lib/sync");
  const { inserted } = await runSync();
  console.log(`[sync] ${new Date().toISOString()} : ${inserted} nouvelle(s) opération(s)`);
  process.exit(0);
}

main().catch((e) => {
  console.error(`[sync] échec : ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
