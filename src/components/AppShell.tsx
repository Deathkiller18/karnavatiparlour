"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { configError, supabase } from "@/lib/supabase";
import { isDemo, listProducts, stockState } from "@/lib/db";
import { LangProvider, useL, useLang, useMounted } from "@/lib/i18n";
import { ErrorNote, Field } from "./ui";

const TABS: { href: string; gu: string; en: string; icon: string }[] = [
  { href: "/", gu: "ઘર", en: "Home", icon: "M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" },
  { href: "/sale", gu: "વેચાણ", en: "Sale", icon: "M4 5h2l2 11h10l2-8H7M9 20a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" },
  { href: "/stock", gu: "માલ", en: "Stock", icon: "M3 8l9-5 9 5v8l-9 5-9-5zm0 0l9 5 9-5m-9 5v8" },
  { href: "/expenses", gu: "ખર્ચ", en: "Expenses", icon: "M6 4h12M6 9h12M6 4c6 0 6 9 0 9l8 7" },
  { href: "/reports", gu: "હિસાબ", en: "Reports", icon: "M5 20V10m7 10V4m7 16v-7" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <Gate>{children}</Gate>
    </LangProvider>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const mounted = useMounted();
  // undefined = still checking, null = logged out
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    navigator.serviceWorker?.register("/sw.js").catch(() => {});
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // The user arrived from a "reset password" email link
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (configError)
    return (
      <>
        <Header />
        <main className="mx-auto max-w-sm px-4 pt-6">
          <ErrorNote msg={`Supabase setup: ${configError}. Check the Environment Variables on Vercel, then redeploy.`} />
        </main>
      </>
    );
  // Everything depends on the phone's date and saved data, so render only in the browser.
  if (!mounted || (!isDemo && session === undefined)) return <Header />;
  if (isDemo) return <Frame>{children}</Frame>;
  if (!session) return <Login />;
  if (recovery) return <NewPassword onDone={() => setRecovery(false)} />;
  return <Frame email={session.user.email}>{children}</Frame>;
}

function Header({ email }: { email?: string }) {
  const L = useL();
  const { lang, setLang } = useLang();
  return (
    <header className="sticky top-0 z-30">
      <div className="bandhani text-cream">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
          <Link href="/" className="min-w-0">
            <div className="font-display text-2xl font-extrabold leading-tight">
              {L("કર્ણાવતી પાર્લર", "Karnavati Parlour")}
            </div>
            <div className="truncate text-xs text-cream/80">
              {L("માલ • વકરો • નફો", "Stock • Sales • Profit")}
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setLang(lang === "gu" ? "en" : "gu")}
              className="rounded-full border border-cream/40 px-3 py-1 text-sm font-semibold"
            >
              {lang === "gu" ? "English" : "ગુજરાતી"}
            </button>
            {email && (
              <button
                onClick={() => supabase?.auth.signOut()}
                title={email}
                className="rounded-full bg-cream/15 px-3 py-1 text-sm"
              >
                {L("બહાર", "Logout")}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="toran" aria-hidden />
    </header>
  );
}

function Frame({ children, email }: { children: React.ReactNode; email?: string }) {
  const L = useL();
  const path = usePathname();
  const [alerts, setAlerts] = useState(0);
  useEffect(() => {
    const refresh = () =>
      listProducts()
        .then((ps) => setAlerts(ps.filter((p) => stockState(p) !== "ok").length))
        .catch(() => {});
    refresh();
    window.addEventListener("kp-changed", refresh);
    return () => window.removeEventListener("kp-changed", refresh);
  }, [path]);

  return (
    <div className="min-h-dvh pb-24">
      <Header email={email} />
      {isDemo && (
        <div className="mx-auto mt-2 max-w-3xl px-4">
          <div className="rounded-xl border border-haldi bg-haldi/15 px-3 py-2 text-sm">
            {L(
              "ડેમો મોડ: ડેટા ફક્ત આ ફોનમાં સચવાય છે. Supabase જોડવા README જુઓ.",
              "Demo mode: data is saved only in this browser. See README to connect Supabase.",
            )}
          </div>
        </div>
      )}
      <main className="mx-auto max-w-3xl px-4 pt-2">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-sand bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {TABS.map((t) => {
            const on = t.href === "/" ? path === "/" : path.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-xs font-semibold ${
                  on ? "text-kesari" : "text-muted"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={t.icon} />
                </svg>
                {L(t.gu, t.en)}
                {t.href === "/stock" && alerts > 0 && (
                  <span className="absolute right-[22%] top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] text-white">
                    {alerts}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Login() {
  const L = useL();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setErr("");
    setInfo("");
    const res =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          });
    setBusy(false);
    if (res.error) setErr(res.error.message);
    else if (mode === "up" && !res.data.session)
      setInfo(
        L(
          "ખાતું બની ગયું. તમારા ઈમેલમાં આવેલી લિંક ખોલો, પછી લોગિન કરો.",
          "Account created. Open the link sent to your email, then log in.",
        ),
      );
  }

  async function forgot() {
    if (!supabase) return;
    setErr("");
    setInfo("");
    if (!email) return setErr(L("પહેલા ઉપર તમારો ઈમેલ લખો", "Type your email above first"));
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) setErr(error.message);
    else setInfo(L("પાસવર્ડ બદલવાની લિંક ઈમેલમાં મોકલી છે.", "A password reset link was sent to your email."));
  }

  return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto max-w-sm px-4 pt-8">
        <div className="mb-5 text-center">
          <div className="font-display text-3xl font-extrabold text-maroon">
            {L("જય શ્રી કૃષ્ણ", "Jay Shree Krishna")}
          </div>
          <p className="text-muted">
            {L("તમારી દુકાનનો હિસાબ ખોલવા લોગિન કરો", "Log in to open your shop's books")}
          </p>
        </div>
        <form onSubmit={submit} className="card space-y-3 p-4">
          <Field label={L("ઈમેલ", "Email")}>
            <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label={L("પાસવર્ડ", "Password")}>
            <input className="input" type="password" required minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <ErrorNote msg={err} />
          {info && <div className="rounded-xl bg-leaf/10 px-3 py-2 text-sm text-leaf">{info}</div>}
          <button className="btn-primary w-full" disabled={busy}>
            {mode === "in" ? L("લોગિન", "Log in") : L("નવું ખાતું બનાવો", "Create account")}
          </button>
        </form>
        <button
          className="mt-4 w-full text-center text-sm font-semibold text-maroon underline"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
        >
          {mode === "in"
            ? L("નવા છો? ખાતું બનાવો", "New here? Create an account")
            : L("ખાતું છે? લોગિન કરો", "Have an account? Log in")}
        </button>
        {mode === "in" && (
          <button className="mt-3 w-full text-center text-sm text-muted underline" onClick={forgot}>
            {L("પાસવર્ડ ભૂલી ગયા?", "Forgot password?")}
          </button>
        )}
      </main>
    </div>
  );
}

function NewPassword({ onDone }: { onDone: () => void }) {
  const L = useL();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setErr(error.message);
    else onDone();
  }

  return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto max-w-sm px-4 pt-8">
        <form onSubmit={submit} className="card space-y-3 p-4">
          <h1 className="font-display text-xl font-bold text-maroon">{L("નવો પાસવર્ડ રાખો", "Set a new password")}</h1>
          <Field label={L("નવો પાસવર્ડ", "New password")}>
            <input className="input" type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <ErrorNote msg={err} />
          <button className="btn-primary w-full" disabled={busy}>
            {L("સાચવો", "Save")}
          </button>
        </form>
      </main>
    </div>
  );
}
