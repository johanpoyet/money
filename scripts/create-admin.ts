/**
 * Crée (ou remplace) le compte unique : demande le mot de passe sans l'afficher,
 * écrit ADMIN_PASSWORD_HASH et ADMIN_TOTP_SECRET dans le .env, puis affiche le QR code TOTP.
 * Usage (sur le VPS) : cd /opt/money/app && npm run admin:create
 */
import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import * as OTPAuth from "otpauth";

const ENV_FILE = process.env.ENV_FILE ?? ".env";

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (ch: string) => {
      if (ch === "\r" || ch === "\n" || ch === "\u0004") {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.off("data", onData);
        process.stdout.write("\n");
        resolve(value);
      } else if (ch === "\u0003") {
        process.exit(1);
      } else if (ch === "\u007f") {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

function setEnv(content: string, key: string, value: string) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  return re.test(content) ? content.replace(re, () => line) : `${content.trimEnd()}\n${line}\n`;
}

async function main() {
  const password = await ask("Mot de passe (12 caractères minimum) : ");
  if (password.length < 12) throw new Error("Mot de passe trop court");
  const confirm = await ask("Confirme le mot de passe : ");
  if (confirm !== password) throw new Error("Les deux mots de passe ne correspondent pas");

  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({ issuer: "Money", label: "johan", secret, digits: 6, period: 30 });

  const path = realpathSync(ENV_FILE);
  let env = readFileSync(path, "utf8");
  // Les « $ » sont échappés : Next.js interprète $XXX comme une variable dans les fichiers .env.
  env = setEnv(env, "ADMIN_PASSWORD_HASH", `scrypt\\$${salt.toString("hex")}\\$${hash.toString("hex")}`);
  env = setEnv(env, "ADMIN_TOTP_SECRET", secret.base32);
  writeFileSync(path, env, { mode: 0o600 });

  console.log(`\nCompte enregistré dans ${path}.`);
  console.log("Ajoute ce compte dans ton app d'authentification (scanne le QR code ou colle le lien) :\n");
  try {
    const qr = await import("qrcode-terminal");
    qr.default.generate(totp.toString(), { small: true });
  } catch {
    /* qrcode-terminal absent : le lien suffit */
  }
  console.log(totp.toString());
  console.log("\nRedémarre ensuite l'app : pm2 restart money");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
