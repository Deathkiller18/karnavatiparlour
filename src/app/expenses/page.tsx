"use client";
import { useState } from "react";
import { addExpense, deleteExpense, listExpenses, sum } from "@/lib/db";
import { monthRange, num, parseYmd, rs, ymd } from "@/lib/format";
import { EXPENSE_CATS, useDateFmt, useL, useLabel } from "@/lib/i18n";
import { useData } from "@/lib/useData";
import { attempt, Empty, ErrorNote, Field, Title } from "@/components/ui";

export default function ExpensesPage() {
  const L = useL();
  const label = useLabel();
  const fmt = useDateFmt();
  const d = new Date();
  const { from, to } = monthRange(d.getFullYear(), d.getMonth());
  const { data, error, reload } = useData(() => listExpenses(from, to), [from, to]);
  const [cat, setCat] = useState("other");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(ymd());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (num(amount) <= 0) return;
    setBusy(true);
    setErr("");
    try {
      await addExpense({ exp_date: date, category: cat, amount: num(amount), note: note.trim() });
      setAmount("");
      setNote("");
      reload();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }
  async function remove(id: string) {
    if (!confirm(L("આ ખર્ચ કાઢી નાખવો?", "Delete this expense?"))) return;
    if (await attempt(() => deleteExpense(id))) reload();
  }

  return (
    <div>
      <h1 className="mt-2 font-display text-2xl font-bold text-maroon">{L("દુકાનનો ખર્ચ", "Shop expenses")}</h1>
      <form onSubmit={submit} className="card mt-3 space-y-3 p-3">
        <div className="-mx-1 flex flex-wrap gap-2 px-1">
          {Object.keys(EXPENSE_CATS).map((c) => (
            <button type="button" key={c} className={`chip ${cat === c ? "chip-on" : ""}`} onClick={() => setCat(c)}>
              {label(EXPENSE_CATS, c)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={L("રકમ ₹", "Amount ₹")}>
            <input className="input tnum" type="number" inputMode="decimal" min="0" step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label={L("તારીખ", "Date")}>
            <input className="input" type="date" max={ymd()} value={date} onChange={(e) => setDate(e.target.value || ymd())} />
          </Field>
        </div>
        <Field label={L("નોંધ", "Note")}>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <ErrorNote msg={err} />
        <button className="btn-primary w-full" disabled={busy}>
          + {L("ખર્ચ નોંધો", "Add expense")}
        </button>
      </form>

      <ErrorNote msg={error} />
      <Title right={data && <span className="tnum font-display text-lg font-bold text-red-700">{rs(sum(data, (e) => e.amount))}</span>}>
        {L("આ મહિનાનો ખર્ચ", "This month's expenses")}
      </Title>
      {!data ? null : data.length === 0 ? (
        <Empty>{L("આ મહિને હજી કોઈ ખર્ચ નથી", "No expenses yet this month")}</Empty>
      ) : (
        <ul className="card divide-y divide-sand">
          {data.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{label(EXPENSE_CATS, e.category)}</div>
                <div className="text-xs text-muted">
                  {fmt(parseYmd(e.exp_date), { day: "numeric", month: "short" })}
                  {e.note && ` • ${e.note}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="tnum font-semibold">{rs(e.amount)}</span>
                <button onClick={() => remove(e.id)} aria-label={L("કાઢો", "Delete")} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-cream">
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
