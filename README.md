# Posel — Stranke in koledar

Aplikacija za sledenje strankam in poslovnemu urniku: mesečni koledar na domači strani (obarvan po strankah, filter po stranki) + zavihek Stranke za CRUD nad kontaktnimi podatki.

Zgrajeno z **Next.js (App Router) + Supabase (Postgres, Auth, RLS) + Tailwind CSS**, gostovano na **Vercel**.

## 1. Ustvari Supabase projekt

1. Pojdi na [supabase.com](https://supabase.com) → **New project** (brezplačen paket zadostuje).
2. Ko je projekt ustvarjen, pojdi v **SQL Editor** in prilepi celotno vsebino datoteke [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), nato zaženi (Run). To ustvari tabeli `clients` in `work_entries` z ustreznimi pravili dostopa (RLS).
3. Pojdi v **Authentication → Users → Add user** in ustvari svojega uporabnika (e-pošta + geslo). Javna registracija v aplikaciji ni na voljo — to je namerno, gre za zasebno aplikacijo.
4. Pojdi v **Project Settings → API** in si zapiši:
   - `Project URL`
   - `anon public` ključ

## 2. Nastavi okoljske spremenljivke

Podvoji `.env.example` v `.env.local` (če še ni narejeno) in vpiši svoje vrednosti:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Zaženi lokalno

```bash
npm install
npm run dev
```

Odpri [http://localhost:3000](http://localhost:3000) — preusmeri te na `/login`. Prijavi se z uporabnikom, ki si ga ustvaril/a v koraku 1.3.

### Preverjanje, da vse deluje

- **Stranke**: pojdi v zavihek "Stranke" → "+ Dodaj stranko", izpolni podatke, shrani. Stranka naj dobi samodejno barvo in se pojavi na seznamu.
- **Koledar**: na domači strani klikni na poljuben dan → "+ Dodaj vnos" → izberi stranko in čas od-do → shrani. Barvna oznaka stranke naj se pojavi na tistem dnevu v koledarju.
- **Filter**: klikni gumb "Filter" zgoraj desno na koledarju, izberi stranko — koledar naj prikaže samo dneve/vnose te stranke. Izberi "Vse stranke" za ponastavitev.

## 4. Objava na Vercel

1. Ustvari git repozitorij in ga poveži z [Vercel](https://vercel.com) (Import Project).
2. V nastavitvah projekta na Vercel (Settings → Environment Variables) dodaj enaki spremenljivki kot v `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
3. Deploy. Po uspešnem deployu preveri prijavo in dodajanje vnosa na produkcijskem naslovu.

## Struktura projekta

```
supabase/migrations/0001_init.sql   # shema baze (zaženi ročno v Supabase SQL Editor)
middleware.ts                       # zaščita rout (redirect na /login brez seje)
src/app/(app)/page.tsx              # "/" — koledar (domača stran)
src/app/(app)/stranke/              # seznam, dodajanje, pregled, urejanje strank
src/app/login/                      # prijava
src/components/calendar/            # koledar, filter, dnevni panel, obrazec za vnos ur
src/components/clients/             # obrazec in seznam strank
src/actions/                        # Server Actions (create/update/delete)
src/lib/supabase/                   # Supabase klienti (browser, server, middleware)
src/lib/data/                       # poizvedbe (branje) za stranke in vnose
src/lib/utils/                      # koledarska mreža, paleta barv
```

## Prihodnje razširitve (niso del te verzije)

- Ročna izbira barve stranke (polje `color` v `clients` že obstaja, trenutno se dodeli samodejno).
- Več uporabnikov — shema in RLS (`user_id = auth.uid()`) sta že pripravljena, dodati je treba le registracijo/povabila.
