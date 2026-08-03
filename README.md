# KS Scaffolding

Interný portál pre lešenársku firmu KS Scaffolding.

- **Zamestnanci** — prihlásenie, evidencia odpracovaných hodín, stavebný denník
- **Administrácia** — prehľad chodu firmy, objednávky, faktúry, evidencia práce všetkých zamestnancov

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (databáza, auth, RLS)

## Spustenie

1. Vytvor projekt na [supabase.com](https://supabase.com) a skopíruj `.env.local.example` do `.env.local`, doplň kľúče.
2. V Supabase SQL editore spusti migráciu `supabase/migrations/0001_init.sql`.
3. Nainštaluj závislosti a spusti dev server:

```bash
npm install
npm run dev
```

4. Otvor [http://localhost:3000](http://localhost:3000).

Prvý užívateľ musí mať v tabuľke `profiles` ručne nastavenú rolu `admin` (predvolená rola pri registrácii je `employee`).

## Dátový model

| Tabuľka | Účel |
|---|---|
| `profiles` | zamestnanci, rola (`admin` / `employee`) |
| `work_hours` | evidencia odpracovaných hodín |
| `site_diary_entries` | stavebný denník |
| `orders` | objednávky |
| `invoices` | faktúry |

Prístup k dátam je riadený cez Row Level Security — zamestnanec vidí len svoje záznamy, admin vidí a spravuje všetko.
