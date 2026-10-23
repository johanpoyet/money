"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Cat = { id: number; name: string; group: "fixe" | "courant" | "plaisir" | "hors" };

const SELECTED: Record<Cat["group"], string> = {
  fixe: "border-2 border-fixe bg-fixe-soft",
  courant: "border-2 border-courant bg-courant-soft",
  plaisir: "border-2 border-plaisir bg-plaisir-soft",
  hors: "border-2 border-plus bg-plus-soft",
};

const GROUP_LABELS: Record<Cat["group"], string> = {
  fixe: "Fixe",
  courant: "Vie courante",
  plaisir: "Plaisir",
  hors: "Hors budget",
};

export function EditForm(props: {
  id: number;
  categoryId: number | null;
  categories: Cat[];
  suggestedPattern: string;
  note: string;
  excluded: boolean;
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<number | null>(props.categoryId);
  const [rule, setRule] = useState(props.categoryId === null);
  const [pattern, setPattern] = useState(props.suggestedPattern);
  const [note, setNote] = useState(props.note);
  const [excluded, setExcluded] = useState(props.excluded);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [categories, setCategories] = useState(props.categories);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState<Cat["group"]>("courant");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);

  async function createCategory() {
    setCreateBusy(true);
    setCreateError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, group: newGroup }),
    });
    setCreateBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setCreateError(data?.error ?? "La création a échoué. Réessaie.");
      return;
    }
    const created = (await res.json()) as Cat;
    setCategories((cs) => [...cs, created]);
    setCategoryId(created.id);
    setCreating(false);
    setNewName("");
  }

  async function save() {
    setState("saving");
    const res = await fetch(`/api/transactions/${props.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, rule, pattern, note, excluded }),
    });
    if (!res.ok) {
      setState("error");
      return;
    }
    router.push("/operations");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col">
        <legend className="mb-2.5 text-[13px] font-bold text-muted">Catégorie</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const active = c.id === categoryId;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => setCategoryId(c.id)}
                className={`flex h-10 items-center rounded-[14px] px-3.5 text-[13px] font-semibold ${
                  active ? SELECTED[c.group] : "border border-line"
                }`}
              >
                {c.name}
                {active ? " ✓" : ""}
              </button>
            );
          })}
          {!creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex h-10 items-center rounded-[14px] border border-dashed border-line px-3.5 text-[13px] font-semibold text-muted"
            >
              + Nouvelle
            </button>
          )}
        </div>

        {creating && (
          <div className="mt-3 flex flex-col gap-3 rounded-[22px] bg-surface p-4">
            <label htmlFor="new-category" className="sr-only">
              Nom de la catégorie
            </label>
            <input
              id="new-category"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom de la catégorie"
              maxLength={40}
              autoFocus
              className="h-11 rounded-xl border border-line bg-bg px-3 text-[15px]"
            />
            <div className="flex flex-wrap gap-2">
              {(Object.keys(GROUP_LABELS) as Cat["group"][]).map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={g === newGroup}
                  onClick={() => setNewGroup(g)}
                  className={`flex h-10 items-center rounded-[14px] px-3.5 text-[13px] font-semibold ${
                    g === newGroup ? SELECTED[g] : "border border-line"
                  }`}
                >
                  {GROUP_LABELS[g]}
                </button>
              ))}
            </div>
            {createError && <p className="text-sm text-over">{createError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setCreateError(null);
                }}
                className="h-11 grow rounded-[14px] border border-line text-sm font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={createCategory}
                disabled={createBusy || newName.trim() === ""}
                className="h-11 grow rounded-[14px] bg-ink text-sm font-bold text-bg disabled:opacity-50"
              >
                {createBusy ? "Création…" : "Créer"}
              </button>
            </div>
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-3 rounded-[22px] bg-surface p-4">
        <label className="flex items-center gap-3 text-sm">
          <span className="grow">
            <b>Toujours classer ainsi</b>
            <br />
            <span className="text-muted">Crée une règle pour les libellés qui contiennent :</span>
          </span>
          <input type="checkbox" checked={rule} onChange={(e) => setRule(e.target.checked)} className="size-6 accent-fixe" />
        </label>
        <label htmlFor="pattern" className="sr-only">
          Motif de la règle
        </label>
        <input
          id="pattern"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          disabled={!rule}
          className="num h-11 rounded-xl border border-line bg-bg px-3 text-sm disabled:opacity-50"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="note" className="text-[13px] font-bold text-muted">
          Note
        </label>
        <input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ajouter une note"
          className="h-12 rounded-2xl border border-line bg-surface px-4 text-[15px]"
        />
      </div>

      <label className="flex items-center justify-between rounded-[18px] bg-surface px-4 py-3.5 text-sm font-semibold">
        Exclure du budget
        <input type="checkbox" checked={excluded} onChange={(e) => setExcluded(e.target.checked)} className="size-6 accent-fixe" />
      </label>

      {state === "error" && <p className="text-sm text-over">L&apos;enregistrement a échoué. Réessaie.</p>}

      <div className="sticky bottom-0 -mx-5 bg-bg/90 px-5 pt-3 backdrop-blur" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <button
          type="button"
          onClick={save}
          disabled={state === "saving" || categoryId === null}
          className="h-[52px] w-full rounded-[18px] bg-ink text-sm font-bold text-bg disabled:opacity-50"
        >
          {state === "saving" ? "Enregistrement…" : categoryId === null ? "Choisis une catégorie" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
