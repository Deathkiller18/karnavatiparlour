"use client";
import { useState } from "react";
import {
  addStock,
  deleteStockEntry,
  listProducts,
  listStockEntries,
  removeProduct,
  saveProduct,
  stockState,
  type Product,
  type ProductInput,
} from "@/lib/db";
import { monthRange, num, parseYmd, qtyStr, rs, ymd } from "@/lib/format";
import { UNITS, useDateFmt, useL, useLabel } from "@/lib/i18n";
import { useData } from "@/lib/useData";
import { attempt, Empty, ErrorNote, Field, Sheet, Title } from "@/components/ui";

const SAMPLES: [string, string, string, number, number, number][] = [
  // name, category, unit, cost, sell, low-stock level
  ["અમૂલ ગોલ્ડ દૂધ 500ml", "દૂધ-દહીં", "packet", 32, 34, 10],
  ["અમૂલ તાજા દૂધ 500ml", "દૂધ-દહીં", "packet", 26, 28, 10],
  ["અમૂલ છાશ 400ml", "દૂધ-દહીં", "packet", 13, 15, 10],
  ["અમૂલ દહીં 400g", "દૂધ-દહીં", "packet", 30, 35, 5],
  ["અમૂલ બટર 100g", "દૂધ-દહીં", "packet", 56, 60, 5],
  ["વેનીલા કપ આઈસ્ક્રીમ", "આઈસ્ક્રીમ", "nang", 8, 10, 12],
  ["ચોકોબાર", "આઈસ્ક્રીમ", "nang", 16, 20, 12],
  ["ઠંડું પીણું 250ml", "ઠંડા પીણાં", "bottle", 16, 20, 12],
  ["પાણીની બોટલ 1L", "ઠંડા પીણાં", "bottle", 12, 20, 12],
  ["વેફર્સ પેકેટ", "નાસ્તો", "packet", 8, 10, 10],
];

type Filter = "all" | "low" | "out";

export default function StockPage() {
  const L = useL();
  const label = useLabel();
  const fmt = useDateFmt();
  const d = new Date();
  const { from, to } = monthRange(d.getFullYear(), d.getMonth());
  const { data, error, reload } = useData(
    async () => {
      const [products, entries] = await Promise.all([listProducts(), listStockEntries(from, to)]);
      return { products, entries };
    },
    [from, to],
  );
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [edit, setEdit] = useState<Product | "new" | null>(null);
  const [picked, setPicked] = useState<Product | null>(null);
  // A dashboard reminder leaves the product id here so its stock-in form opens directly
  const [linkId, setLinkId] = useState(() => sessionStorage.getItem("kp-add"));
  const [busy, setBusy] = useState(false);
  const adding = picked ?? data?.products.find((p) => p.id === linkId) ?? null;
  const setAdding = (p: Product | null) => {
    setPicked(p);
    sessionStorage.removeItem("kp-add");
    setLinkId(null);
  };

  if (error) return <ErrorNote msg={error} />;
  if (!data) return <p className="py-10 text-center text-muted">{L("લોડ થાય છે…", "Loading…")}</p>;
  const { products, entries } = data;
  const counts = {
    all: products.length,
    low: products.filter((p) => stockState(p) === "low").length,
    out: products.filter((p) => stockState(p) === "out").length,
  };
  const shown = products.filter(
    (p) =>
      (filter === "all" || stockState(p) === filter) &&
      (p.name + " " + p.category).toLowerCase().includes(q.trim().toLowerCase()),
  );
  const cats = [...new Set(products.map((p) => p.category).filter(Boolean))];

  async function seed() {
    setBusy(true);
    await attempt(async () => {
      for (const [name, category, unit, cost_price, sell_price, low_stock] of SAMPLES)
        await saveProduct({ name, category, unit, cost_price, sell_price, low_stock });
    });
    setBusy(false);
    reload();
  }
  async function undoEntry(id: string) {
    if (!confirm(L("આ એન્ટ્રી કાઢવી? સ્ટોકમાંથી માલ ઓછો થશે.", "Delete this entry? Stock will be reduced."))) return;
    if (await attempt(() => deleteStockEntry(id))) reload();
  }

  return (
    <div>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-maroon">{L("માલ / સ્ટોક", "Stock")}</h1>
        <button className="btn-primary" onClick={() => setEdit("new")}>
          + {L("નવી વસ્તુ", "New item")}
        </button>
      </div>

      <input className="input mt-3" placeholder={L("વસ્તુ શોધો…", "Search item…")} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-2 flex gap-2">
        {(
          [
            ["all", L("બધી", "All")],
            ["low", L("ઓછો માલ", "Low")],
            ["out", L("ખતમ", "Out")],
          ] as [Filter, string][]
        ).map(([k, text]) => (
          <button key={k} className={`chip ${filter === k ? "chip-on" : ""}`} onClick={() => setFilter(k)}>
            {text} ({counts[k]})
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="mt-4">
          <Empty>
            <p>{L("હજી કોઈ વસ્તુ નથી. તમારી પહેલી વસ્તુ ઉમેરો.", "No items yet. Add your first item.")}</p>
            <button className="btn-ghost mt-3" disabled={busy} onClick={seed}>
              {busy ? L("ઉમેરાય છે…", "Adding…") : L("નમૂનાની 10 વસ્તુ ઉમેરો", "Add 10 sample items")}
            </button>
          </Empty>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {shown.map((p) => {
            const st = stockState(p);
            const margin = p.sell_price - p.cost_price;
            return (
              <li key={p.id} className="card p-3">
                <div className="flex items-start justify-between gap-3">
                  <button className="min-w-0 text-left" onClick={() => setEdit(p)}>
                    <div className="font-semibold">{p.name}</div>
                    <div className="tnum text-xs text-muted">
                      {p.category && `${p.category} • `}
                      {L("ખરીદ", "Cost")} {rs(p.cost_price)} → {L("વેચાણ", "Sell")} {rs(p.sell_price)}
                      <span className={margin >= 0 ? "text-leaf" : "text-red-700"}>
                        {" "}
                        ({L("નફો", "profit")} {rs(margin)})
                      </span>
                    </div>
                  </button>
                  <div className="shrink-0 text-right">
                    <div
                      className={`tnum font-display text-2xl font-bold leading-none ${
                        st === "out" ? "text-red-700" : st === "low" ? "text-amber-700" : "text-ink"
                      }`}
                    >
                      {qtyStr(p.stock)}
                    </div>
                    <div className="text-xs text-muted">{label(UNITS, p.unit)}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      st === "out"
                        ? "bg-red-100 text-red-800"
                        : st === "low"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-leaf/10 text-leaf"
                    }`}
                  >
                    {st === "out" ? L("ખતમ", "Out of stock") : st === "low" ? L("ઓછો માલ", "Low stock") : L("બરાબર", "In stock")}
                  </span>
                  <div className="flex gap-2">
                    <button className="chip" onClick={() => setEdit(p)}>
                      {L("સુધારો", "Edit")}
                    </button>
                    <button className="chip chip-on" onClick={() => setAdding(p)}>
                      + {L("માલ આવ્યો", "Stock in")}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
          {shown.length === 0 && <Empty>{L("કોઈ વસ્તુ મળી નથી", "Nothing found")}</Empty>}
        </ul>
      )}

      <Title>{L("આ મહિને આવેલો માલ", "Stock received this month")}</Title>
      {entries.length === 0 ? (
        <Empty>{L("આ મહિને હજી માલ નોંધાયો નથી", "No stock received yet this month")}</Empty>
      ) : (
        <ul className="card divide-y divide-sand">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{e.product_name}</div>
                <div className="tnum text-xs text-muted">
                  {fmt(parseYmd(e.entry_date), { day: "numeric", month: "short" })} • {qtyStr(e.qty)} × {rs(e.cost_price)}
                  {e.note && ` • ${e.note}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="tnum font-semibold">{rs(e.total)}</span>
                <button onClick={() => undoEntry(e.id)} aria-label={L("કાઢો", "Delete")} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-cream">
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {edit && (
        <ProductForm
          product={edit === "new" ? null : edit}
          cats={cats}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            reload();
          }}
        />
      )}
      {adding && (
        <StockInForm
          product={adding}
          onClose={() => setAdding(null)}
          onSaved={() => {
            setAdding(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function ProductForm({
  product,
  cats,
  onClose,
  onSaved,
}: {
  product: Product | null;
  cats: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const L = useL();
  const label = useLabel();
  const [f, setF] = useState({
    name: product?.name ?? "",
    category: product?.category ?? "",
    unit: product?.unit ?? "nang",
    cost_price: product ? String(product.cost_price) : "",
    sell_price: product ? String(product.sell_price) : "",
    low_stock: product ? String(product.low_stock) : "5",
    opening: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const input: ProductInput = {
        name: f.name.trim(),
        category: f.category.trim(),
        unit: f.unit,
        cost_price: num(f.cost_price),
        sell_price: num(f.sell_price),
        low_stock: num(f.low_stock),
      };
      const saved = await saveProduct(input, product?.id);
      if (!product && num(f.opening) > 0)
        await addStock({
          product: saved,
          qty: num(f.opening),
          cost_price: input.cost_price,
          entry_date: ymd(),
          note: L("શરૂઆતનો માલ", "Opening stock"),
        });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }
  async function remove() {
    if (!product || !confirm(L(`"${product.name}" કાઢી નાખવી?`, `Remove "${product.name}"?`))) return;
    if (await attempt(() => removeProduct(product.id))) onSaved();
  }
  const profit = num(f.sell_price) - num(f.cost_price);

  return (
    <Sheet title={product ? L("વસ્તુ સુધારો", "Edit item") : L("નવી વસ્તુ", "New item")} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label={L("વસ્તુનું નામ", "Item name")}>
          <input className="input" required autoFocus={!product} value={f.name} onChange={set("name")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={L("વિભાગ", "Category")}>
            <input className="input" list="kp-cats" value={f.category} onChange={set("category")} />
            <datalist id="kp-cats">
              {cats.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label={L("માપ", "Unit")}>
            <select className="input" value={f.unit} onChange={set("unit")}>
              {Object.keys(UNITS).map((u) => (
                <option key={u} value={u}>
                  {label(UNITS, u)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={L("ખરીદ ભાવ ₹", "Cost price ₹")}>
            <input className="input tnum" type="number" inputMode="decimal" min="0" step="any" required value={f.cost_price} onChange={set("cost_price")} />
          </Field>
          <Field label={L("વેચાણ ભાવ ₹", "Selling price ₹")}>
            <input className="input tnum" type="number" inputMode="decimal" min="0" step="any" required value={f.sell_price} onChange={set("sell_price")} />
          </Field>
          <Field label={L("આટલાથી ઓછો થાય તો યાદ કરાવો", "Remind me when below")}>
            <input className="input tnum" type="number" inputMode="decimal" min="0" step="any" value={f.low_stock} onChange={set("low_stock")} />
          </Field>
          {!product && (
            <Field label={L("હાલ કેટલો માલ છે", "Stock right now")}>
              <input className="input tnum" type="number" inputMode="decimal" min="0" step="any" value={f.opening} onChange={set("opening")} />
            </Field>
          )}
        </div>
        {f.cost_price && f.sell_price && (
          <div className={`text-sm font-semibold ${profit >= 0 ? "text-leaf" : "text-red-700"}`}>
            {L("એક નંગ પર નફો", "Profit per unit")}: {rs(profit)}
          </div>
        )}
        <ErrorNote msg={err} />
        <button className="btn-primary w-full" disabled={busy}>
          {L("સાચવો", "Save")}
        </button>
        {product && (
          <button type="button" className="w-full py-1 text-sm font-semibold text-red-700 underline" onClick={remove}>
            {L("આ વસ્તુ કાઢી નાખો", "Remove this item")}
          </button>
        )}
      </form>
    </Sheet>
  );
}

function StockInForm({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const L = useL();
  const label = useLabel();
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState(String(product.cost_price));
  const [date, setDate] = useState(ymd());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (num(qty) <= 0) return;
    setBusy(true);
    setErr("");
    try {
      await addStock({ product, qty: num(qty), cost_price: num(cost), entry_date: date, note: note.trim() });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Sheet title={`${L("માલ આવ્યો", "Stock in")} — ${product.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="text-sm text-muted">
          {L("હાલ સ્ટોક", "Current stock")}: <b className="tnum text-ink">{qtyStr(product.stock)} {label(UNITS, product.unit)}</b>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`${L("કેટલો આવ્યો", "Quantity received")} (${label(UNITS, product.unit)})`}>
            <input className="input tnum" type="number" inputMode="decimal" min="0" step="any" required autoFocus value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Field label={L("ખરીદ ભાવ ₹ (એકનો)", "Cost price ₹ (each)")}>
            <input className="input tnum" type="number" inputMode="decimal" min="0" step="any" required value={cost} onChange={(e) => setCost(e.target.value)} />
          </Field>
          <Field label={L("તારીખ", "Date")}>
            <input className="input" type="date" max={ymd()} value={date} onChange={(e) => setDate(e.target.value || ymd())} />
          </Field>
          <Field label={L("નોંધ / વેપારી", "Note / supplier")}>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">{L("કુલ ખરીદી", "Total purchase")}</span>
          <span className="tnum font-display text-2xl font-bold text-maroon">{rs(num(qty) * num(cost))}</span>
        </div>
        <ErrorNote msg={err} />
        <button className="btn-primary w-full" disabled={busy}>
          {L("સ્ટોકમાં ઉમેરો", "Add to stock")}
        </button>
      </form>
    </Sheet>
  );
}
