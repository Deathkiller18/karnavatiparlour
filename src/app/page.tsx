"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  deleteSale,
  listExpenses,
  listProducts,
  listSales,
  stockState,
  sum,
  type Product,
} from "@/lib/db";
import { monthRange, qtyStr, rs, ymd } from "@/lib/format";
import { PAY, UNITS, useDateFmt, useL, useLabel } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { useData } from "@/lib/useData";
import { attempt, Empty, ErrorNote, Stat, Title } from "@/components/ui";

export default function Home() {
  const L = useL();
  const label = useLabel();
  const fmt = useDateFmt();
  const today = ymd();
  const d = new Date();
  const { from, to } = monthRange(d.getFullYear(), d.getMonth());

  const { data, error, reload } = useData(
    async () => {
      const [products, sales, expenses] = await Promise.all([
        listProducts(),
        listSales(from, to),
        listExpenses(from, to),
      ]);
      return { products, sales, expenses };
    },
    [from, to],
  );

  const [notif, setNotif] = useState<string>(() =>
    typeof Notification === "undefined" ? "denied" : Notification.permission,
  );

  const alerts = (data?.products ?? [])
    .filter((p) => stockState(p) !== "ok")
    .sort((a, b) => a.stock - b.stock);

  // One phone notification per day while something is low
  useEffect(() => {
    if (!alerts.length || notif !== "granted") return;
    if (localStorage.getItem("kp-notified") === today) return;
    localStorage.setItem("kp-notified", today);
    notify(
      "કર્ણાવતી પાર્લર",
      `${alerts.length} વસ્તુનો માલ ઓછો છે: ${alerts.slice(0, 4).map((p) => p.name).join(", ")}`,
    );
  }, [alerts, notif, today]);

  if (error) return <ErrorNote msg={error} />;
  if (!data) return <p className="py-10 text-center text-muted">{L("લોડ થાય છે…", "Loading…")}</p>;

  const { products, sales, expenses } = data;
  const tSales = sales.filter((s) => s.sale_date === today);
  const tExp = sum(expenses.filter((e) => e.exp_date === today), (e) => e.amount);
  const vakro = sum(tSales, (s) => s.total);
  const tGross = sum(tSales, (s) => s.profit);
  const bills = new Set(tSales.map((s) => s.bill_id)).size;
  const mSales = sum(sales, (s) => s.total);
  const mNet = sum(sales, (s) => s.profit) - sum(expenses, (e) => e.amount);
  const stockValue = sum(products, (p) => Math.max(p.stock, 0) * p.cost_price);
  const byMode = (m: string) => sum(tSales.filter((s) => s.payment_mode === m), (s) => s.total);

  const hour = d.getHours();
  const greet =
    hour < 12 ? L("સુપ્રભાત", "Good morning") : hour < 17 ? L("નમસ્તે", "Namaste") : L("શુભ સંધ્યા", "Good evening");

  const orderList = (list: Product[]) =>
    "🛒 કર્ણાવતી પાર્લર — ખરીદી યાદી\n" +
    list
      .map((p, i) => `${i + 1}. ${p.name} — બાકી ${qtyStr(Math.max(p.stock, 0))} ${label(UNITS, p.unit)}`)
      .join("\n");

  async function remove(id: string) {
    if (!confirm(L("આ વેચાણ કાઢી નાખવું? માલ પાછો સ્ટોકમાં ઉમેરાશે.", "Delete this sale? Stock will be added back."))) return;
    if (await attempt(() => deleteSale(id))) reload();
  }

  return (
    <div>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <div className="font-display text-xl font-bold text-maroon">{greet} 🙏</div>
          <div className="text-sm text-muted">
            {fmt(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      <section className="bandhani mt-3 rounded-3xl p-5 text-cream">
        <div className="text-sm text-cream/85">{L("આજનો વકરો", "Today's sales")}</div>
        <div className="tnum font-display text-5xl font-extrabold leading-tight">{rs(vakro)}</div>
        <div className="mt-1 text-sm text-cream/85">
          {bills} {L("બિલ", "bills")} • {L("નફો", "profit")} {rs(tGross)}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {(["cash", "upi", "udhar"] as const).map((m) => (
            <div key={m} className="rounded-xl bg-cream/15 px-2 py-1.5">
              <div className="text-xs text-cream/80">{label(PAY, m)}</div>
              <div className="tnum font-semibold">{rs(byMode(m))}</div>
            </div>
          ))}
        </div>
        <Link href="/sale" className="btn mt-4 w-full bg-haldi text-maroon-dark">
          + {L("નવું વેચાણ", "New sale")}
        </Link>
      </section>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat
          label={L("આજનો ચોખ્ખો નફો", "Today's net profit")}
          value={rs(tGross - tExp)}
          sub={`${L("ખર્ચ", "Expenses")} ${rs(tExp)}`}
          tone={tGross - tExp >= 0 ? "good" : "bad"}
        />
        <Stat
          label={L("આ મહિનાનો નફો", "This month's profit")}
          value={rs(mNet)}
          sub={`${L("વકરો", "Sales")} ${rs(mSales)}`}
          tone={mNet >= 0 ? "good" : "bad"}
        />
        <Stat label={L("દુકાનમાં માલની કિંમત", "Stock value (cost)")} value={rs(stockValue)} />
        <Stat
          label={L("કુલ વસ્તુ", "Total items")}
          value={String(products.length)}
          sub={alerts.length ? `${alerts.length} ${L("ઓછી / ખતમ", "low / out")}` : L("બધો માલ બરાબર", "All stocked")}
          tone={alerts.length ? "bad" : "ink"}
        />
      </div>

      <Title
        right={
          alerts.length > 0 && (
            <a
              className="chip border-leaf text-leaf"
              target="_blank"
              rel="noreferrer"
              href={`https://wa.me/?text=${encodeURIComponent(orderList(alerts))}`}
            >
              {L("WhatsApp યાદી", "WhatsApp list")}
            </a>
          )
        }
      >
        🔔 {L("માલ ખતમ થવા આવ્યો", "Stock reminders")}
      </Title>
      {notif === "default" && alerts.length > 0 && (
        <button
          className="mb-2 text-sm font-semibold text-kesari-dark underline"
          onClick={() => Notification.requestPermission().then(setNotif)}
        >
          {L("ફોનમાં રિમાઇન્ડર ચાલુ કરો", "Turn on phone reminders")}
        </button>
      )}
      {alerts.length === 0 ? (
        <Empty>{L("બધો માલ પૂરતો છે 👍", "Everything is well stocked 👍")}</Empty>
      ) : (
        <ul className="card divide-y divide-sand">
          {alerts.map((p) => {
            const out = stockState(p) === "out";
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className={`text-sm ${out ? "text-red-700" : "text-amber-700"}`}>
                    {out
                      ? L("ખતમ થઈ ગયો!", "Out of stock!")
                      : `${L("ફક્ત", "Only")} ${qtyStr(p.stock)} ${label(UNITS, p.unit)} ${L("બાકી", "left")}`}
                  </div>
                </div>
                <Link href="/stock" onClick={() => sessionStorage.setItem("kp-add", p.id)} className="chip chip-on">
                  + {L("માલ ઉમેરો", "Add stock")}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Title>{L("આજનું વેચાણ", "Today's sales")}</Title>
      {tSales.length === 0 ? (
        <Empty>{L("આજે હજી કોઈ વેચાણ નથી", "No sales yet today")}</Empty>
      ) : (
        <ul className="card divide-y divide-sand">
          {tSales.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{s.product_name}</div>
                <div className="tnum text-xs text-muted">
                  {qtyStr(s.qty)} × {rs(s.sell_price)} • {label(PAY, s.payment_mode)}
                  {s.note && ` • ${s.note}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="tnum font-semibold">{rs(s.total)}</span>
                <button
                  onClick={() => remove(s.id)}
                  aria-label={L("કાઢો", "Delete")}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-cream"
                >
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
