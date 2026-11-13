"use client";
import { useMemo, useState } from "react";
import {
  createSale,
  listProducts,
  stockState,
  type CartLine,
  type PaymentMode,
} from "@/lib/db";
import { num, qtyStr, round2, rs, ymd } from "@/lib/format";
import { PAY, UNITS, useL, useLabel } from "@/lib/i18n";
import { useData } from "@/lib/useData";
import { Empty, ErrorNote, Field, Sheet } from "@/components/ui";

type Line = { id: string; qty: string; price: string };

export default function SalePage() {
  const L = useL();
  const label = useLabel();
  const { data: products, error, reload } = useData(listProducts, []);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [cart, setCart] = useState<Line[]>([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [date, setDate] = useState(ymd());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");

  const cats = useMemo(
    () => [...new Set((products ?? []).map((p) => p.category).filter(Boolean))].sort(),
    [products],
  );
  const shown = (products ?? []).filter(
    (p) => (!cat || p.category === cat) && p.name.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const lines: CartLine[] = cart.flatMap((l) => {
    const product = byId.get(l.id);
    return product ? [{ product, qty: num(l.qty), price: num(l.price) }] : [];
  });
  const total = round2(lines.reduce((t, l) => t + l.qty * l.price, 0));
  const count = cart.length;

  function tap(id: string) {
    setDone("");
    const p = byId.get(id)!;
    setCart((c) =>
      c.some((l) => l.id === id)
        ? c.map((l) => (l.id === id ? { ...l, qty: String(num(l.qty) + 1) } : l))
        : [...c, { id, qty: "1", price: String(p.sell_price) }],
    );
  }
  const patch = (id: string, v: Partial<Line>) =>
    setCart((c) => c.map((l) => (l.id === id ? { ...l, ...v } : l)));
  const step = (id: string, by: number) =>
    setCart((c) =>
      c.flatMap((l) => {
        if (l.id !== id) return [l];
        const n = round2(num(l.qty) + by);
        return n > 0 ? [{ ...l, qty: String(n) }] : [];
      }),
    );

  async function saveBill() {
    const valid = lines.filter((l) => l.qty > 0);
    if (!valid.length) return;
    if (mode === "udhar" && !note.trim()) {
      setErr(L("ઉધાર માટે ગ્રાહકનું નામ લખો", "Enter the customer's name for credit"));
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await createSale(valid, mode, date, note.trim());
      setDone(`${L("વેચાણ નોંધાઈ ગયું", "Sale saved")} — ${rs(total)}`);
      setCart([]);
      setNote("");
      setMode("cash");
      setOpen(false);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  if (error) return <ErrorNote msg={error} />;
  if (!products) return <p className="py-10 text-center text-muted">{L("લોડ થાય છે…", "Loading…")}</p>;

  return (
    <div className={count ? "pb-20" : ""}>
      <h1 className="mt-2 font-display text-2xl font-bold text-maroon">{L("વેચાણ", "Sale")}</h1>
      {done && <div className="mt-2 rounded-xl bg-leaf/10 px-3 py-2 font-semibold text-leaf">✓ {done}</div>}

      <input
        className="input mt-3"
        placeholder={L("વસ્તુ શોધો…", "Search item…")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {cats.length > 0 && (
        <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
          <button className={`chip ${!cat ? "chip-on" : ""}`} onClick={() => setCat("")}>
            {L("બધું", "All")}
          </button>
          {cats.map((c) => (
            <button key={c} className={`chip ${cat === c ? "chip-on" : ""}`} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <div className="mt-4">
          <Empty>{L("પહેલા 'માલ' માં વસ્તુ ઉમેરો", "Add items in 'Stock' first")}</Empty>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {shown.map((p) => {
            const inCart = cart.find((l) => l.id === p.id);
            const st = stockState(p);
            return (
              <button
                key={p.id}
                onClick={() => tap(p.id)}
                className={`card relative p-3 text-left transition active:scale-[0.97] ${
                  inCart ? "border-kesari ring-2 ring-kesari/30" : ""
                }`}
              >
                {inCart && (
                  <span className="tnum absolute -right-1.5 -top-1.5 grid h-7 min-w-7 place-items-center rounded-full bg-kesari px-1.5 text-sm font-bold text-white">
                    {qtyStr(num(inCart.qty))}
                  </span>
                )}
                <div className="line-clamp-2 min-h-10 font-semibold leading-5">{p.name}</div>
                <div className="tnum mt-1 font-display text-xl font-bold text-maroon">{rs(p.sell_price)}</div>
                <div
                  className={`tnum text-xs ${
                    st === "out" ? "text-red-700" : st === "low" ? "text-amber-700" : "text-muted"
                  }`}
                >
                  {st === "out" ? L("માલ ખતમ", "Out of stock") : `${qtyStr(p.stock)} ${label(UNITS, p.unit)} ${L("બાકી", "left")}`}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-[60px] z-20 px-4 pb-[env(safe-area-inset-bottom)]">
          <button
            onClick={() => setOpen(true)}
            className="btn-maroon mx-auto flex w-full max-w-3xl justify-between py-3.5 shadow-lg"
          >
            <span>
              {count} {L("વસ્તુ", "items")}
            </span>
            <span className="tnum">
              {rs(total)} — {L("બિલ બનાવો", "Make bill")} →
            </span>
          </button>
        </div>
      )}

      {open && (
        <Sheet title={L("બિલ", "Bill")} onClose={() => setOpen(false)}>
          <ul className="space-y-2">
            {cart.map((l) => {
              const p = byId.get(l.id);
              if (!p) return null;
              const over = num(l.qty) > p.stock;
              return (
                <li key={l.id} className="card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold">{p.name}</div>
                    <div className="tnum font-semibold">{rs(num(l.qty) * num(l.price))}</div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button className="btn-ghost h-10 w-10 !p-0 text-xl" onClick={() => step(l.id, -1)} aria-label="-">
                      −
                    </button>
                    <input
                      className="input tnum !w-20 text-center"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      aria-label={L("નંગ", "Qty")}
                      value={l.qty}
                      onChange={(e) => patch(l.id, { qty: e.target.value })}
                    />
                    <button className="btn-ghost h-10 w-10 !p-0 text-xl" onClick={() => step(l.id, 1)} aria-label="+">
                      +
                    </button>
                    <span className="text-muted">×</span>
                    <input
                      className="input tnum min-w-0 flex-1"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      aria-label={L("ભાવ", "Price")}
                      value={l.price}
                      onChange={(e) => patch(l.id, { price: e.target.value })}
                    />
                  </div>
                  {over && (
                    <div className="mt-1 text-xs text-amber-700">
                      {L("સ્ટોકમાં ફક્ત", "Only")} {qtyStr(Math.max(p.stock, 0))} {label(UNITS, p.unit)} {L("છે", "in stock")}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["cash", "upi", "udhar"] as const).map((m) => (
              <button key={m} className={`chip justify-center py-2.5 ${mode === m ? "chip-on" : ""}`} onClick={() => setMode(m)}>
                {label(PAY, m)}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Field label={mode === "udhar" ? L("ગ્રાહકનું નામ", "Customer name") : L("નોંધ (જરૂર હોય તો)", "Note (optional)")}>
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <Field label={L("તારીખ", "Date")}>
              <input className="input" type="date" max={ymd()} value={date} onChange={(e) => setDate(e.target.value || ymd())} />
            </Field>
          </div>
          <div className="mt-3">
            <ErrorNote msg={err} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-muted">{L("કુલ", "Total")}</span>
            <span className="tnum font-display text-3xl font-extrabold text-maroon">{rs(total)}</span>
          </div>
          <button className="btn-primary mt-3 w-full py-3.5 text-lg" disabled={busy || total <= 0} onClick={saveBill}>
            {busy ? L("સાચવે છે…", "Saving…") : L("વેચાણ નોંધો", "Save sale")}
          </button>
        </Sheet>
      )}
    </div>
  );
}
