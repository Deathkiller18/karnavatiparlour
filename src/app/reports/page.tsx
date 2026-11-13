"use client";
import { useState } from "react";
import { listExpenses, listSales, listStockEntries, sum } from "@/lib/db";
import { monthRange, parseYmd, qtyStr, round2, rs } from "@/lib/format";
import { EXPENSE_CATS, useDateFmt, useL, useLabel } from "@/lib/i18n";
import { useData } from "@/lib/useData";
import { Empty, ErrorNote, Stat, Title } from "@/components/ui";

export default function ReportsPage() {
  const L = useL();
  const label = useLabel();
  const fmt = useDateFmt();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const { from, to } = monthRange(ym.y, ym.m);
  const isCurrent = ym.y === now.getFullYear() && ym.m === now.getMonth();
  const shift = (by: number) => {
    const d = new Date(ym.y, ym.m + by, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
  };

  const { data, error } = useData(
    async () => {
      const [sales, expenses, entries] = await Promise.all([
        listSales(from, to),
        listExpenses(from, to),
        listStockEntries(from, to),
      ]);
      return { sales, expenses, entries, key: from };
    },
    [from, to],
  );
  const fresh = data?.key === from ? data : undefined;

  const header = (
    <div className="mt-2 flex items-center justify-between">
      <button className="btn-ghost !px-3" onClick={() => shift(-1)} aria-label={L("પાછલો મહિનો", "Previous month")}>
        ←
      </button>
      <h1 className="font-display text-2xl font-bold text-maroon">
        {fmt(new Date(ym.y, ym.m, 1), { month: "long", year: "numeric" })}
      </h1>
      <button className="btn-ghost !px-3" disabled={isCurrent} onClick={() => shift(1)} aria-label={L("આગલો મહિનો", "Next month")}>
        →
      </button>
    </div>
  );
  if (error) return <>{header}<ErrorNote msg={error} /></>;
  if (!fresh) return <>{header}<p className="py-10 text-center text-muted">{L("લોડ થાય છે…", "Loading…")}</p></>;

  const { sales, expenses, entries } = fresh;
  const vakro = sum(sales, (s) => s.total);
  const gross = sum(sales, (s) => s.profit);
  const cogs = round2(vakro - gross);
  const exp = sum(expenses, (e) => e.amount);
  const net = round2(gross - exp);
  const bought = sum(entries, (e) => e.total);
  const udhar = sum(sales.filter((s) => s.payment_mode === "udhar"), (s) => s.total);

  // day-by-day
  const days = new Map<string, { sales: number; profit: number; exp: number }>();
  const day = (k: string) => {
    if (!days.has(k)) days.set(k, { sales: 0, profit: 0, exp: 0 });
    return days.get(k)!;
  };
  for (const s of sales) {
    day(s.sale_date).sales += s.total;
    day(s.sale_date).profit += s.profit;
  }
  for (const e of expenses) day(e.exp_date).exp += e.amount;
  const dayRows = [...days.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const lastDay = parseYmd(to).getDate();
  const perDay = Array.from({ length: lastDay }, (_, i) => {
    const k = `${from.slice(0, 8)}${String(i + 1).padStart(2, "0")}`;
    return { d: i + 1, v: days.get(k)?.sales ?? 0 };
  });
  const peak = Math.max(1, ...perDay.map((x) => x.v));
  const activeDays = dayRows.filter(([, v]) => v.sales > 0).length;

  // top items
  const items = new Map<string, { qty: number; total: number; profit: number }>();
  for (const s of sales) {
    const it = items.get(s.product_name) ?? { qty: 0, total: 0, profit: 0 };
    it.qty += s.qty;
    it.total += s.total;
    it.profit += s.profit;
    items.set(s.product_name, it);
  }
  const top = [...items.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 10);

  const expCats = new Map<string, number>();
  for (const e of expenses) expCats.set(e.category, (expCats.get(e.category) ?? 0) + e.amount);

  function downloadCsv() {
    const rows = [
      ["Date", "Item", "Qty", "Sell price", "Cost price", "Total", "Profit", "Payment", "Note"],
      ...[...sales].reverse().map((s) => [s.sale_date, s.product_name, s.qty, s.sell_price, s.cost_price, s.total, s.profit, s.payment_mode, s.note]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = `karnavati-${from.slice(0, 7)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      {header}

      <section className="bandhani mt-3 rounded-3xl p-5 text-cream">
        <div className="text-sm text-cream/85">{L("મહિનાનો ચોખ્ખો નફો", "Net profit for the month")}</div>
        <div className="tnum font-display text-5xl font-extrabold leading-tight">{rs(net)}</div>
        <div className="mt-1 text-sm text-cream/85">
          {vakro > 0 && `${L("વકરા પર", "Margin")} ${Math.round((net / vakro) * 100)}% • `}
          {activeDays} {L("દિવસ ધંધો", "trading days")}
          {activeDays > 0 && ` • ${L("રોજનો સરેરાશ વકરો", "avg/day")} ${rs(vakro / activeDays)}`}
        </div>
      </section>

      <div className="card mt-3 divide-y divide-sand">
        {(
          [
            [L("કુલ વકરો", "Total sales"), vakro, ""],
            [L("વેચાયેલા માલની પડતર", "Cost of goods sold"), -cogs, ""],
            [L("કાચો નફો", "Gross profit"), gross, "font-semibold"],
            [L("દુકાનનો ખર્ચ", "Shop expenses"), -exp, ""],
            [L("ચોખ્ખો નફો", "Net profit"), net, "font-bold text-lg"],
          ] as [string, number, string][]
        ).map(([name, v, cls]) => (
          <div key={name} className={`flex justify-between px-3 py-2.5 ${cls}`}>
            <span>{name}</span>
            <span className={`tnum ${v < 0 ? "text-red-700" : cls ? "text-leaf" : ""}`}>
              {v < 0 ? "− " + rs(-v) : rs(v)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat label={L("મહિનામાં ખરીદેલો માલ", "Stock purchased")} value={rs(bought)} />
        <Stat label={L("ઉધાર વેચાણ", "Sold on credit")} value={rs(udhar)} tone={udhar > 0 ? "bad" : "ink"} />
      </div>

      <Title>{L("રોજનો વકરો", "Sales by day")}</Title>
      {vakro === 0 ? (
        <Empty>{L("આ મહિને કોઈ વેચાણ નથી", "No sales this month")}</Empty>
      ) : (
        <>
          <div className="card p-3">
            <div className="flex h-32 items-end gap-[2px]" role="img" aria-label={L("રોજના વકરાનો ચાર્ટ", "Daily sales chart")}>
              {perDay.map((x) => (
                <div key={x.d} className="group relative flex h-full flex-1 items-end" title={`${x.d}: ${rs(x.v)}`}>
                  <div
                    className="w-full rounded-t bg-kesari"
                    style={{ height: x.v ? `${Math.max(3, (x.v / peak) * 100)}%` : "0" }}
                  />
                </div>
              ))}
            </div>
            <div className="tnum mt-1 flex justify-between text-xs text-muted">
              <span>1</span>
              <span>{L("સૌથી વધુ", "Peak")} {rs(peak)}</span>
              <span>{lastDay}</span>
            </div>
          </div>
          <div className="card mt-3 overflow-hidden">
            <table className="tnum w-full text-sm">
              <thead className="bg-cream text-left text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">{L("તારીખ", "Date")}</th>
                  <th className="px-2 py-2 text-right font-medium">{L("વકરો", "Sales")}</th>
                  <th className="px-2 py-2 text-right font-medium">{L("ખર્ચ", "Exp.")}</th>
                  <th className="px-3 py-2 text-right font-medium">{L("નફો", "Profit")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {dayRows.map(([k, v]) => {
                  const n = v.profit - v.exp;
                  return (
                    <tr key={k}>
                      <td className="px-3 py-2">{fmt(parseYmd(k), { day: "numeric", month: "short", weekday: "short" })}</td>
                      <td className="px-2 py-2 text-right">{rs(v.sales)}</td>
                      <td className="px-2 py-2 text-right text-muted">{v.exp ? rs(v.exp) : "–"}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${n >= 0 ? "text-leaf" : "text-red-700"}`}>{rs(n)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Title>{L("સૌથી વધુ વેચાતી વસ્તુ", "Top selling items")}</Title>
          <ul className="card divide-y divide-sand">
            {top.map(([name, v], i) => (
              <li key={name} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {i + 1}. {name}
                  </div>
                  <div className="tnum text-xs text-muted">
                    {qtyStr(v.qty)} {L("વેચાયા", "sold")} • {L("નફો", "profit")} {rs(v.profit)}
                  </div>
                </div>
                <span className="tnum font-semibold">{rs(v.total)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {expCats.size > 0 && (
        <>
          <Title>{L("ખર્ચ ક્યાં થયો", "Where expenses went")}</Title>
          <ul className="card divide-y divide-sand">
            {[...expCats.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => (
              <li key={c} className="flex justify-between px-3 py-2">
                <span>{label(EXPENSE_CATS, c)}</span>
                <span className="tnum font-semibold">{rs(v)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {sales.length > 0 && (
        <button className="btn-ghost mt-5 w-full" onClick={downloadCsv}>
          ⬇ {L("Excel (CSV) ડાઉનલોડ કરો", "Download Excel (CSV)")}
        </button>
      )}
    </div>
  );
}
