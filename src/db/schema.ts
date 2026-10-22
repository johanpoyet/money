import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Les trois familles de la DA Nuit, plus « hors budget » (épargne, virements internes, entrées). */
export const categoryGroup = pgEnum("category_group", ["fixe", "courant", "plaisir", "hors"]);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  group: categoryGroup("group").notNull(),
  /** Exclue des totaux de dépenses (épargne, virements internes, entrées). */
  excluded: boolean("excluded").notNull().default(false),
  /** Plafond mensuel en euros, null = pas de budget. */
  monthlyBudget: numeric("monthly_budget", { precision: 10, scale: 2 }),
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  /** Identifiant du compte chez Enable Banking. */
  externalId: text("external_id").notNull().unique(),
  name: text("name").notNull(),
  iban: text("iban"),
  currency: text("currency").notNull().default("EUR"),
  balance: numeric("balance", { precision: 12, scale: 2 }),
  balanceAt: timestamp("balance_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    /** Référence fournie par la banque, ou empreinte calculée si absente. */
    externalId: text("external_id").notNull(),
    bookingDate: date("booking_date").notNull(),
    /** Négatif = débit, positif = crédit. */
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("EUR"),
    rawLabel: text("raw_label").notNull(),
    label: text("label").notNull(),
    status: text("status").notNull().default("BOOK"),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    /** true quand l'utilisateur a choisi la catégorie à la main : les règles ne la changent plus. */
    categoryLocked: boolean("category_locked").notNull().default(false),
    /** Paiement annuel lissé sur 12 mois dans les totaux. */
    yearly: boolean("yearly").notNull().default(false),
    excluded: boolean("excluded").notNull().default(false),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("transactions_account_external_idx").on(t.accountId, t.externalId)],
);

export const rules = pgTable("rules", {
  id: serial("id").primaryKey(),
  /** Texte recherché dans le libellé brut, insensible à la casse. Plusieurs motifs séparés par « | ». */
  pattern: text("pattern").notNull(),
  /** Montant exact optionnel (valeur absolue), pour distinguer par exemple le loyer d'un autre virement. */
  amount: numeric("amount", { precision: 12, scale: 2 }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  yearly: boolean("yearly").notNull().default(false),
  priority: integer("priority").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Consentement bancaire (valable ~180 jours). L'identifiant de session est chiffré. */
export const bankSessions = pgTable("bank_sessions", {
  id: serial("id").primaryKey(),
  aspspName: text("aspsp_name").notNull(),
  sessionIdEnc: text("session_id_enc").notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const syncRuns = pgTable("sync_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  ok: boolean("ok"),
  inserted: integer("inserted").notNull().default(0),
  error: text("error"),
});

export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Rule = typeof rules.$inferSelect;
