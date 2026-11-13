# કર્ણાવતી પાર્લર — Karnavati Parlour

Parlour ka stock, roz ka vakro (sales), kharch aur mahine ka nafo — sab ek app mein.
Gujarati + English, mobile-first. Next.js + Supabase, Vercel par deploy.

## Kya kya hai

| Screen | Kaam |
|---|---|
| **ઘર (Home)** | Aaj no vakro, aaj ka nafo, mahine ka nafo, dukaan mein maal ki kimat, **stock khatam/ocho reminder**, WhatsApp kharidi-yaadi |
| **વેચાણ (Sale)** | Item tap karo → bill → Rokda / UPI / Udhar. Stock apne-aap ghat-ta hai |
| **માલ (Stock)** | Nayi vastu, kharid/vechan bhav, "itne se kam ho to yaad karao" level, maal aavyo entry |
| **ખર્ચ (Expenses)** | Bhadu, light bill, pagar, vagere |
| **હિસાબ (Reports)** | Mahine ka vakro, padtar, kacho nafo, kharch, chokkho nafo, roz ka chart, top items, Excel (CSV) download |

Env vars ke bina app **demo mode** mein chalta hai (data sirf us browser mein) — try karne ke liye.

## Setup (ek baar)

### 1. Supabase
1. [supabase.com](https://supabase.com) par naya project banao.
2. **SQL Editor** → `supabase/schema.sql` ka pura content paste karo → **Run**.
3. **Project Settings → API** se `Project URL` aur `anon public` key copy karo.
4. (Optional) **Authentication → Providers → Email** mein "Confirm email" band kar do to signup ke turant baad login ho jayega.

### 2. Local chalana
```bash
cp .env.example .env.local   # phir dono values bharo
npm install
npm run dev
```

### 3. Vercel deploy
1. Vercel → **Add New → Project** → yeh GitHub repo import karo.
2. **Environment Variables** mein dono add karo:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Deploy**. Phir app kholo → "નવું ખાતું બનાવો" se apna account banao.

Phone mein Chrome → menu → **Add to Home screen** karo to app jaisa khulega.

## Data kaise safe hai
- Har table par Row Level Security hai: har login sirf apni dukaan ka data dekh sakta hai.
- Stock database triggers se update hota hai (vechan → ghat-ta hai, maal aavyo → badhta hai, entry delete → wapas theek).
- Vastu "delete" karne par purana hisaab nahi bigadta (soft delete).
