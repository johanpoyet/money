"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function run() {
    setState("busy");
    const res = await fetch("/api/sync", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setState("idle");
      setMsg(`${data.inserted ?? 0} nouvelle(s) opération(s)`);
      router.refresh();
    } else {
      setState("error");
      setMsg(data.error ?? "La synchro a échoué");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={run}
        disabled={state === "busy"}
        className="h-11 rounded-[14px] border border-line bg-surface-2 text-sm font-semibold disabled:opacity-60"
      >
        {state === "busy" ? "Synchronisation…" : "Synchroniser maintenant"}
      </button>
      {msg && <span className={`text-xs ${state === "error" ? "text-over" : "text-muted"}`}>{msg}</span>}
    </div>
  );
}
