import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __moneySql: ReturnType<typeof postgres> | undefined;
}

// postgres-js n'ouvre la connexion qu'à la première requête : le build passe même sans base.
globalThis.__moneySql ??= postgres(process.env.DATABASE_URL ?? "postgres://localhost/money", {
  max: 5,
});

export const db = drizzle(globalThis.__moneySql, { schema });
export { schema };
