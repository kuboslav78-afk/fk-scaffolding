# FK Scaffolding s. r. o.

Interný portál pre lešenársku firmu FK Scaffolding.

- **Zamestnanci** — prihlásenie, evidencia odpracovaných hodín, stavebný denník
- **Vedúci stavby** — naviac schvaľuje hodiny pracovníkov na svojej stavbe a nahráva fotky do denníka
- **Administrácia** — prehľad chodu firmy, správa zamestnancov a stavieb, objednávky, faktúry

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (databáza, auth, RLS, storage)

## Spustenie

1. Vytvor projekt na [supabase.com](https://supabase.com) a skopíruj `.env.local.example` do `.env.local`, doplň kľúče (vrátane `SUPABASE_SERVICE_ROLE_KEY` — potrebný pre správu zamestnancov a upload fotiek).
2. V Supabase SQL editore postupne spusti migrácie zo `supabase/migrations/` (0001, 0002, 0003).
3. Nainštaluj závislosti a spusti dev server:

```bash
npm install
npm run dev
```

4. Otvor [http://localhost:3050](http://localhost:3050) (port nastavený v `.claude/launch.json`).

Prvý užívateľ musí mať v tabuľke `profiles` ručne nastavenú rolu `admin` (predvolená rola pri registrácii je `employee`). Ďalších zamestnancov už vytvára admin priamo v appke (`/admin/employees`).

## Dátový model

| Tabuľka | Účel |
|---|---|
| `profiles` | zamestnanci, rola (`admin` / `foreman` / `employee`) |
| `sites` | stavby, každá má prideleného vedúceho (`foreman_id`) |
| `work_hours` | evidencia odpracovaných hodín, viazaná na stavbu, so schvaľovaním |
| `site_diary_entries` | stavebný denník, viazaný na stavbu |
| `diary_photos` | fotky k zápisom v denníku (storage bucket `diary-photos`) |
| `orders` | objednávky |
| `invoices` | faktúry |

Prístup k dátam je riadený cez Row Level Security — zamestnanec vidí len svoje záznamy, vedúci stavby vidí a schvaľuje záznamy na svojej stavbe, admin vidí a spravuje všetko. Fotky v denníku a správa zamestnancov idú cez server actions so service role kľúčom (kontrola oprávnení v kóde, nie cez RLS).
