"use client";
import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

export type Lang = "gu" | "en";

// Language lives in localStorage; useSyncExternalStore keeps every screen in step.
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};
const readLang = (): Lang => (localStorage.getItem("kp-lang") === "en" ? "en" : "gu");
function setLang(l: Lang) {
  localStorage.setItem("kp-lang", l);
  document.documentElement.lang = l;
  listeners.forEach((fn) => fn());
}

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "gu", setLang });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, () => "gu" as Lang);
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);

/** false while server-rendering / hydrating, true in the browser. */
export const useMounted = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

/** const L = useL();  L("ગુજરાતી", "English") */
export function useL() {
  const { lang } = useContext(LangCtx);
  return useCallback((gu: string, en: string) => (lang === "gu" ? gu : en), [lang]);
}

export const UNITS: Record<string, [string, string]> = {
  nang: ["નંગ", "pcs"],
  packet: ["પેકેટ", "packet"],
  kg: ["કિલો", "kg"],
  litre: ["લિટર", "litre"],
  bottle: ["બોટલ", "bottle"],
  box: ["ડબ્બો", "box"],
};

export const EXPENSE_CATS: Record<string, [string, string]> = {
  rent: ["ભાડું", "Rent"],
  light: ["લાઈટ બિલ", "Electricity"],
  salary: ["પગાર", "Salary"],
  transport: ["ભાડું-વાહન", "Transport"],
  tea: ["ચા-નાસ્તો", "Tea & snacks"],
  repair: ["રિપેરિંગ", "Repairs"],
  other: ["અન્ય", "Other"],
};

export const PAY: Record<string, [string, string]> = {
  cash: ["રોકડા", "Cash"],
  upi: ["UPI", "UPI"],
  udhar: ["ઉધાર", "Credit"],
};

export function useLabel() {
  const { lang } = useContext(LangCtx);
  return useCallback(
    (map: Record<string, [string, string]>, key: string) =>
      map[key]?.[lang === "gu" ? 0 : 1] ?? key,
    [lang],
  );
}

export function useDateFmt() {
  const { lang } = useContext(LangCtx);
  return useCallback(
    (d: Date, opts: Intl.DateTimeFormatOptions) =>
      d.toLocaleDateString(lang === "gu" ? "gu-IN-u-nu-latn" : "en-IN", opts),
    [lang],
  );
}
