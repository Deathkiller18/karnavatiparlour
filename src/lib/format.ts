export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const rs = (n: number) =>
  "₹" + round2(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const qtyStr = (n: number) =>
  (Math.round((n || 0) * 1000) / 1000).toLocaleString("en-IN");

const pad = (n: number) => String(n).padStart(2, "0");

/** Local (phone) date as YYYY-MM-DD — never UTC, so "today" matches the shop's day. */
export const ymd = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const monthRange = (year: number, month: number) => ({
  from: `${year}-${pad(month + 1)}-01`,
  to: `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`,
});

export const parseYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
