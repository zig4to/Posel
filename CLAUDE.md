@AGENTS.md

# Posel — projektne konvencije

Aplikacija za pregled partnerjev in delovnega urnika (koledar). Vsa UI besedila
in komentarji so v **slovenščini**. Commit sporočila v slovenščini.

## Sklad

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript**
- **Supabase** (`@supabase/ssr`) za bazo in avtentikacijo
- **Tailwind CSS v4** — konfiguracija prek `@theme` v `src/app/globals.css`
  (datoteke `tailwind.config` NI). Pomožni `clsx` v `src/lib/utils/clsx`.
- Temni način: atribut `data-theme="dark"` na `<html>` + `@custom-variant dark`
  (nastavi ga prepaint skripta, glej `src/lib/theme.ts`).

## Struktura

- `src/app/(app)/` — zaščitene strani; `src/app/login/` — edina javna
- `src/actions/*` — server actions (`"use server"`): validacija → mutacija →
  `revalidatePath("/")`; vrnejo `{ error?: string }`
- `src/lib/data/*` — bralne poizvedbe; sprejmejo tipiziran `SupabaseClient`
- `src/components/ui/*` — `Button`, `Input`/`Field`/`Textarea`, `Modal`,
  `Badge`/`ColorDot`
- `src/lib/types/database.types.ts` — **ročno pisani** tipi baze; ob vsaki
  migraciji jih posodobi

## Supabase / baza

- Migracije: `supabase/migrations/NNNN_ime.sql`. **CLI ni povezan** — SQL se
  ročno požene v Supabase Dashboard → SQL Editor.
- Vsaka tabela: RLS vklopljen, politike `user_id = auth.uid()` za
  select/insert/update/delete, ter eksplicitni
  `grant select, insert, update, delete on public.<tabela> to authenticated`.
- Sprožilec `set_updated_at` na tabelah z `updated_at`.

## Avtentikacija / SSO

- `src/proxy.ts` → `updateSession` (middleware): nepridjavljene preusmeri na
  `/login`; `/login` je edina javna pot (`PUBLIC_PATHS`).
- Prijava iz huba (TomsStudios): naslov lahko nosi fragment
  `#sb_at=…&sb_rt=…`; `SSO_PREPAINT_SCRIPT` (`src/lib/sso.ts`) postavi
  `data-sso="pending"` še pred izrisom, `/login` medtem pokaže nalagalnik.

## PWA

- Manifest: `src/app/manifest.ts` (Next servira `/manifest.webmanifest`).
- Ikone: `npm run icons` (`tools/make-icons.js`) — uredi `public/icons/icon.svg`,
  poženi, commitaj generirane PNG-je.
- Ponudba namestitve: `public/install-promo.js` (samostojna vanilla skripta).

## Ikone v UI

Inline SVG, Lucide slog: `viewBox="0 0 24 24"`, `fill="none"`,
`stroke="currentColor"`, `stroke-width="1.8"`, `stroke-linecap/linejoin="round"`.
Brez emojijev kot ikon.

## Pred commitom

```
npx tsc --noEmit
npx eslint <spremenjene datoteke>
```

Datumi so nizi `"YYYY-MM-DD"` po **lokalnem** času (nikoli `toISOString()`) —
glej pomožne funkcije v `src/lib/utils/date.ts`.
