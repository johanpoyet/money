import { readFileSync } from "node:fs";
import { importPKCS8, SignJWT } from "jose";

/**
 * Client minimal de l'API Enable Banking (accès aux comptes, lecture seule).
 * Doc : https://enablebanking.com/docs/api/reference/
 */
const API = "https://api.enablebanking.com";

async function token(): Promise<string> {
  const appId = process.env.ENABLE_BANKING_APP_ID;
  const keyPath = process.env.ENABLE_BANKING_KEY_PATH;
  if (!appId || !keyPath) throw new Error("ENABLE_BANKING_APP_ID ou ENABLE_BANKING_KEY_PATH manquant");
  const privateKey = await importPKCS8(readFileSync(keyPath, "utf8"), "RS256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: appId })
    .setIssuer("enablebanking.com")
    .setAudience("api.enablebanking.com")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await token()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Enable Banking ${init.method ?? "GET"} ${path} : ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export type EbAccount = { uid: string; name?: string; account_id?: { iban?: string }; currency?: string };

export type EbTransaction = {
  entry_reference?: string;
  transaction_id?: string;
  transaction_amount: { amount: string; currency: string };
  credit_debit_indicator: "CRDT" | "DBIT";
  booking_date?: string;
  value_date?: string;
  transaction_date?: string;
  status?: string;
  remittance_information?: string[];
  creditor?: { name?: string };
  debtor?: { name?: string };
};

export type EbBalance = { balance_amount: { amount: string; currency: string }; balance_type: string };

export function listAspsps(country = "FR") {
  return call<{ aspsps: { name: string; country: string }[] }>(`/aspsps?country=${country}`);
}

/** Démarre le consentement : renvoie l'URL où valider l'accès dans l'app bancaire. */
export function startAuth(opts: { state: string; redirectUrl: string; validUntil: Date }) {
  return call<{ url: string; authorization_id: string }>("/auth", {
    method: "POST",
    body: JSON.stringify({
      access: { valid_until: opts.validUntil.toISOString() },
      aspsp: {
        name: process.env.ENABLE_BANKING_ASPSP_NAME,
        country: process.env.ENABLE_BANKING_ASPSP_COUNTRY ?? "FR",
      },
      state: opts.state,
      redirect_url: opts.redirectUrl,
      psu_type: "personal",
    }),
  });
}

/** Échange le code reçu au retour de la banque contre une session. */
export function createSession(code: string) {
  return call<{ session_id: string; accounts: EbAccount[]; access: { valid_until: string } }>("/sessions", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function getSession(sessionId: string) {
  return call<{ status: string; accounts: string[]; access: { valid_until: string } }>(`/sessions/${sessionId}`);
}

export function getAccountDetails(uid: string) {
  return call<EbAccount>(`/accounts/${uid}/details`);
}

export function getBalances(uid: string) {
  return call<{ balances: EbBalance[] }>(`/accounts/${uid}/balances`);
}

/** Récupère toutes les pages de transactions depuis une date (YYYY-MM-DD). */
export async function getTransactions(uid: string, dateFrom: string): Promise<EbTransaction[]> {
  const all: EbTransaction[] = [];
  let continuation: string | undefined;
  do {
    const params = new URLSearchParams({ date_from: dateFrom });
    if (continuation) params.set("continuation_key", continuation);
    const page = await call<{ transactions: EbTransaction[]; continuation_key?: string }>(
      `/accounts/${uid}/transactions?${params}`,
    );
    all.push(...page.transactions);
    continuation = page.continuation_key || undefined;
  } while (continuation);
  return all;
}
