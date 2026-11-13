import { supabase } from "./supabase";
import { round2 } from "./format";

export const isDemo = !supabase;

export type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
  cost_price: number;
  sell_price: number;
  stock: number;
  low_stock: number;
  active: boolean;
  created_at: string;
};
export type PaymentMode = "cash" | "upi" | "udhar";
export type Sale = {
  id: string;
  bill_id: string;
  sale_date: string;
  product_id: string | null;
  product_name: string;
  qty: number;
  sell_price: number;
  cost_price: number;
  total: number;
  profit: number;
  payment_mode: PaymentMode;
  note: string;
  created_at: string;
};
export type StockEntry = {
  id: string;
  product_id: string;
  product_name: string;
  qty: number;
  cost_price: number;
  total: number;
  entry_date: string;
  note: string;
  created_at: string;
};
export type Expense = {
  id: string;
  exp_date: string;
  category: string;
  amount: number;
  note: string;
  created_at: string;
};
export type ProductInput = Pick<
  Product,
  "name" | "category" | "unit" | "cost_price" | "sell_price" | "low_stock"
>;
export type CartLine = { product: Product; qty: number; price: number };

export const stockState = (p: Product): "out" | "low" | "ok" =>
  p.stock <= 0 ? "out" : p.stock <= p.low_stock ? "low" : "ok";

// ---------- demo store (browser only) ----------
type Store = {
  products: Product[];
  sales: Sale[];
  stock_entries: StockEntry[];
  expenses: Expense[];
};
const KEY = "kp-demo-v1";
const load = (): Store => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { products: [], sales: [], stock_entries: [], expenses: [] };
};
const save = (s: Store) => {
  localStorage.setItem(KEY, JSON.stringify(s));
  changed();
};
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const between = (d: string, from: string, to: string) => d >= from && d <= to;
const newest = <T extends { created_at: string }>(a: T[]) =>
  [...a].sort((x, y) => y.created_at.localeCompare(x.created_at));

type Res<T> = { data: T | null; error: { message: string } | null };

function unwrap<T>(r: Res<T>): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

/** Other parts of the screen (the low-stock badge) listen for this. */
const changed = () => window.dispatchEvent(new Event("kp-changed"));
function wrote<T>(r: Res<T>): T {
  const d = unwrap(r);
  changed();
  return d;
}

/** Supabase returns at most 1000 rows per request, so read page by page. */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<Res<T[]>>) {
  const SIZE = 1000;
  const out: T[] = [];
  for (let i = 0; ; i += SIZE) {
    const rows = unwrap(await page(i, i + SIZE - 1));
    out.push(...rows);
    if (rows.length < SIZE) return out;
  }
}

/** Turns raw database / network errors into something a shopkeeper can act on. */
export function friendly(msg: string): string {
  if (/failed to fetch|networkerror|load failed/i.test(msg))
    return "ઇન્ટરનેટ બંધ લાગે છે. ફરી પ્રયત્ન કરો. (No internet — try again.)";
  if (/schema cache|does not exist|could not find the table/i.test(msg))
    return "ડેટાબેઝ તૈયાર નથી: Supabase SQL Editor માં supabase/schema.sql ચલાવો. (Run supabase/schema.sql in Supabase.)";
  if (/invalid login credentials/i.test(msg))
    return "ઈમેલ અથવા પાસવર્ડ ખોટો છે. (Wrong email or password.)";
  if (/email not confirmed/i.test(msg))
    return "પહેલા ઈમેલમાં આવેલી લિંક ખોલીને ખાતું ચાલુ કરો. (Confirm your email first.)";
  if (/already registered/i.test(msg))
    return "આ ઈમેલનું ખાતું પહેલેથી છે, લોગિન કરો. (Account exists — log in.)";
  if (/invalid api key|jwt/i.test(msg))
    return "Supabase key ખોટી છે — Vercel ના Environment Variables તપાસો. (" + msg + ")";
  return msg;
}

// ---------- products ----------
export async function listProducts(): Promise<Product[]> {
  if (!supabase)
    return load()
      .products.filter((p) => p.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  return fetchAll<Product>((a, b) =>
    supabase!.from("products").select("*").eq("active", true).order("name").order("id").range(a, b),
  );
}

export async function saveProduct(input: ProductInput, id?: string): Promise<Product> {
  if (!supabase) {
    const s = load();
    let p = s.products.find((x) => x.id === id);
    if (p) Object.assign(p, input);
    else {
      p = { ...input, id: uid(), stock: 0, active: true, created_at: now() };
      s.products.push(p);
    }
    save(s);
    return p;
  }
  const q = id
    ? supabase.from("products").update(input).eq("id", id)
    : supabase.from("products").insert(input);
  return wrote(await q.select().single());
}

/** Soft delete so old sales/reports stay intact. */
export async function removeProduct(id: string) {
  if (!supabase) {
    const s = load();
    const p = s.products.find((x) => x.id === id);
    if (p) p.active = false;
    return save(s);
  }
  wrote(await supabase.from("products").update({ active: false }).eq("id", id).select());
}

// ---------- stock in ----------
export async function addStock(e: {
  product: Product;
  qty: number;
  cost_price: number;
  entry_date: string;
  note?: string;
}) {
  const row = {
    product_id: e.product.id,
    product_name: e.product.name,
    qty: e.qty,
    cost_price: e.cost_price,
    total: round2(e.qty * e.cost_price),
    entry_date: e.entry_date,
    note: e.note ?? "",
  };
  if (!supabase) {
    const s = load();
    s.stock_entries.push({ ...row, id: uid(), created_at: now() });
    const p = s.products.find((x) => x.id === row.product_id);
    if (p) {
      p.stock += row.qty;
      if (row.cost_price > 0) p.cost_price = row.cost_price;
    }
    return save(s);
  }
  wrote(await supabase.from("stock_entries").insert(row).select());
}

export async function listStockEntries(from: string, to: string): Promise<StockEntry[]> {
  if (!supabase)
    return newest(load().stock_entries.filter((e) => between(e.entry_date, from, to)));
  return fetchAll<StockEntry>((a, b) =>
    supabase!
      .from("stock_entries")
      .select("*")
      .gte("entry_date", from)
      .lte("entry_date", to)
      .order("created_at", { ascending: false })
      .order("id")
      .range(a, b),
  );
}

export async function deleteStockEntry(id: string) {
  if (!supabase) {
    const s = load();
    const e = s.stock_entries.find((x) => x.id === id);
    if (e) {
      const p = s.products.find((x) => x.id === e.product_id);
      if (p) p.stock -= e.qty;
      s.stock_entries = s.stock_entries.filter((x) => x.id !== id);
    }
    return save(s);
  }
  wrote(await supabase.from("stock_entries").delete().eq("id", id).select());
}

// ---------- sales ----------
export async function createSale(
  lines: CartLine[],
  payment_mode: PaymentMode,
  sale_date: string,
  note = "",
) {
  const bill_id = uid();
  const rows = lines.map((l) => ({
    bill_id,
    sale_date,
    product_id: l.product.id,
    product_name: l.product.name,
    qty: l.qty,
    sell_price: l.price,
    cost_price: l.product.cost_price,
    total: round2(l.qty * l.price),
    profit: round2(l.qty * (l.price - l.product.cost_price)),
    payment_mode,
    note,
  }));
  if (!supabase) {
    const s = load();
    for (const r of rows) {
      s.sales.push({ ...r, id: uid(), created_at: now() });
      const p = s.products.find((x) => x.id === r.product_id);
      if (p) p.stock -= r.qty;
    }
    return save(s);
  }
  wrote(await supabase.from("sales").insert(rows).select());
}

export async function listSales(from: string, to: string): Promise<Sale[]> {
  if (!supabase) return newest(load().sales.filter((e) => between(e.sale_date, from, to)));
  return fetchAll<Sale>((a, b) =>
    supabase!
      .from("sales")
      .select("*")
      .gte("sale_date", from)
      .lte("sale_date", to)
      .order("created_at", { ascending: false })
      .order("id")
      .range(a, b),
  );
}

/** Deleting a sale puts the stock back. */
export async function deleteSale(id: string) {
  if (!supabase) {
    const s = load();
    const e = s.sales.find((x) => x.id === id);
    if (e) {
      const p = s.products.find((x) => x.id === e.product_id);
      if (p) p.stock += e.qty;
      s.sales = s.sales.filter((x) => x.id !== id);
    }
    return save(s);
  }
  wrote(await supabase.from("sales").delete().eq("id", id).select());
}

// ---------- expenses ----------
export async function listExpenses(from: string, to: string): Promise<Expense[]> {
  if (!supabase) return newest(load().expenses.filter((e) => between(e.exp_date, from, to)));
  return fetchAll<Expense>((a, b) =>
    supabase!
      .from("expenses")
      .select("*")
      .gte("exp_date", from)
      .lte("exp_date", to)
      .order("created_at", { ascending: false })
      .order("id")
      .range(a, b),
  );
}

export async function addExpense(e: Omit<Expense, "id" | "created_at">) {
  if (!supabase) {
    const s = load();
    s.expenses.push({ ...e, id: uid(), created_at: now() });
    return save(s);
  }
  wrote(await supabase.from("expenses").insert(e).select());
}

export async function deleteExpense(id: string) {
  if (!supabase) {
    const s = load();
    s.expenses = s.expenses.filter((x) => x.id !== id);
    return save(s);
  }
  wrote(await supabase.from("expenses").delete().eq("id", id).select());
}

export const sum = <T>(a: T[], f: (x: T) => number) => round2(a.reduce((t, x) => t + f(x), 0));
