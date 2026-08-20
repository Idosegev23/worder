# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Vite dev server on http://localhost:5173
npm run build     # tsc (type-check) + vite build
npm run preview   # serve dist/
```

There is no test runner, linter, or formatter configured — `tsc` (run as part of `build`) is the only correctness gate. `tsconfig.json` enables `strict`, `noUnusedLocals`, and `noUnusedParameters`, so unused imports/vars will fail the build.

## Backend: Supabase (not IndexedDB)

The README and `src/lib/db.ts` describe a Dexie/IndexedDB setup — that is **legacy and effectively unused at runtime**. The live backend is Supabase. Only `src/lib/seed.ts` and `src/lib/storage.ts` still touch Dexie; nothing else imports from `db.ts`. When adding/changing data access, work in `src/lib/supabase.ts` and ignore `db.ts`.

- Required env vars in `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (the client throws on startup if missing). Optional: `VITE_OPENAI_API_KEY`, `VITE_USE_BROWSER_TTS`.
- All tables are prefixed `worder_`: `worder_profiles`, `worder_categories`, `worder_words`, `worder_progress`, `worder_rewards`, `worder_user_reward_choices`, `worder_user_benefits`, `worder_recordings`. Storage bucket for student audio: `recordings`.
- **Free-tier keepalive**: Supabase pauses free projects after ~7 days of inactivity. A Vercel edge function at [api/keepalive.ts](api/keepalive.ts) (scheduled in [vercel.json](vercel.json) for `0 7 */3 * *` — every 3 days, 07:00 UTC) hits `worder_categories` to keep the project warm. It requires `Authorization: Bearer ${CRON_SECRET}` and reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from Vercel env vars. Crons run only on production deployments.
- Two parallel type definitions exist (`Profile`, `Word`, `Category`, `Progress` in both `db.ts` and `supabase.ts`). **Always import from `lib/supabase.ts`.**
- The DB schema is `snake_case`; the app types are `camelCase`. `lib/supabase.ts` defines `dbToX` / `xToDb` converters for every table — **route every read/write through the exported helper functions** (`getWordsByCategory`, `saveProgress`, `upsertWord`, etc.) rather than calling `supabase.from(...)` directly, so the case conversion stays consistent.
- `worder_profiles` stores **plaintext passwords on purpose** — there is no Supabase Auth. Admin UI shows/edits student passwords as a feature, not a bug. Don't "fix" this with hashing or auth migration unless asked.
- `getUserByUsername` does a fuzzy `ilike` on the first word of the name, then compares whitespace-normalized full names in JS. Students log in with their full name (e.g. `"אילנית שגב"`), so duplicated first names across students are matched correctly only by the second pass.

## Architecture

### Routing & state

`src/routes.tsx` wires every screen via `useRoutes`. Student routes: `/`, `/register`, `/avatar`, `/categories`, `/play/:categoryId`, `/rewards`, `/profile`. Admin routes live under `/admin/*` (`dashboard`, `words`, `users`, `rewards`, `backup`, `progress`, `errors`, `recordings`, `leaderboard`, `categories`).

Three Zustand stores in `src/store/`:

- `useAuth` — current `Profile`, persisted to `localStorage` under `wordquest-auth`.
- `useGame` — score / streak / stars / achievements, persisted under `game-storage`. Stars are awarded client-side only (1 per correct answer, +1 at streak ≥5, +2 more at ≥10) and never written to Supabase.
- `useAdmin` — boolean gate, persisted to `sessionStorage` under `admin`.

Admin login (`features/admin/AdminLogin.tsx`) queries `worder_profiles` directly with `role='admin'` — it is independent of `useAuth`. The `/admin/*` routes are not route-guarded; each admin screen checks `useAdmin` itself.

### Per-student category visibility (audience cohorts)

`features/categories/CategoryGrid.tsx` holds a **hardcoded username → category-prefix allowlist** (`isMeitarUser`, `isMichelUser`, `isTask2User`, `isSetUser`, `isBabyloniaUser` near the top of the file). Each cohort sees only its own categories:

| Cohort predicate    | Matches (username)                          | Sees categories                |
|---------------------|---------------------------------------------|--------------------------------|
| `isMeitarUser`      | name contains `meitar` / `מיתר`             | `Meitar*`                      |
| `isMichelUser`      | `מישל מישמיש`                                | `הקלטה של משפטים` only          |
| `isTask2User`       | explicit list of 4 names                    | `Task2_*`                      |
| `isSetUser`         | explicit list of 2 names                    | `Set*`                         |
| `isBabyloniaUser`   | explicit list of 4 names                    | `Babylonia*`                   |
| (default)           | everyone else                               | everything **except** the prefixes above, plus `Archive_*`, `כתיבת מילים`, `הקלטה של משפטים` |

**Adding a new student cohort means editing this file** (add a predicate, add the branch in the `filtered` ternary chain, and add the prefix to the default filter's exclusion list) — the cohort is not stored in the DB. Categories that resolve to zero words are dropped from the grid (`if (catWords.length === 0) return null`), so an empty category simply disappears rather than rendering a dead tile. `getCategoryEmoji` maps category names to icons via substring matching.

### Game screen dispatch

`features/game/GameScreen.tsx` is a **dispatcher**, not a game. It looks up the category by id and switches on `category.name`:

| Category name (exact)        | Component               | Behavior                                                  |
|------------------------------|-------------------------|-----------------------------------------------------------|
| `כתיבת מילים`                | `MichelGameScreen`      | Hebrew TTS prompt → student types Hebrew                  |
| `הקלטה של משפטים`            | `RecordingGameScreen`   | Student records audio, uploads to `recordings` bucket     |
| anything else                | `RegularGameScreen`     | Translation game (English → Hebrew) with retry queue      |

Inside `RegularGameScreen` (same file), category **name patterns** further alter UI:

- `name.includes('Am/Is/Are')` → renders 3 choice buttons; the option set switches on `currentWord.sentenceType` (`'positive' | 'negative' | 'question'`).
- `name === 'Have/Has'` → 2 choice buttons.
- `name === 'Pronouns'` → different prompt copy.
- `name.startsWith('Meitar')` → uses a custom praise array, suppresses the "mischievous" wrong-answer effect, and stretches the post-correct delay to 3s.

If you add a new game variant, add the branch in the dispatcher (don't extend `RegularGameScreen` with another mode flag).

`MichelGameScreen` and `RecordingGameScreen` are visually independent of the rest of the app — they use their own dark navy gradient (`#050A1C` → `#0b1c3a`) instead of the light Tailwind theme, and skip `GlobalProgress`. `MichelGameScreen` also carries its **own copy** of `normalizeAnswer`; fixes to answer matching must be applied in both files. It renders an illustration from `/images/${currentWord.en}` — for that category `word.en` holds the image **filename including extension** (see [public/images/](public/images/)), not an English word.

### Retry-queue learning loop

`RegularGameScreen` keeps two arrays: `activeWords` (current round) and `retryQueue` (words missed this round). When the user reaches the end of `activeWords`, missed words are promoted to `activeWords` for a second pass; only when `retryQueue` is empty does the user advance to `/rewards`. If every word for the category was already answered correctly in past sessions, it enters "practice mode" (`wasCompletedInitially=true`) which routes back to `/categories` instead of awarding a new reward.

Answer matching uses `normalizeAnswer` ([GameScreen.tsx:151](src/features/game/GameScreen.tsx#L151)): lowercases, trims, and folds geresh/gershayim variants (`׳ ' \``→`'`, `״`→`"`). A response is correct if it matches `currentWord.he` OR any string in `currentWord.altHe`.

### Rewards & benefits economy

Finishing a category routes to `/rewards` (`features/rewards/RewardChooser.tsx`), a two-box pick. The outcome is a 70/30 client-side roll: 70% a real **benefit** (`addBenefit` → row in `worder_user_benefits`), 30% a joke prize from the local `SILLY_PRIZES` array (no DB write). A Supabase failure while adding a benefit silently downgrades to a silly prize.

Ten unclaimed benefits convert to a "big prize": `getUnclaimedBenefitsCount` drives the counter shown on `CategoryGrid`, and `claimBigPrize` marks the ten oldest unclaimed rows as claimed (throws if fewer than 10 exist). `resetUserProgress(userId)` (used from the admin UI) wipes `worder_progress`, `worder_user_reward_choices`, and `worder_user_benefits` for one student.

### Effects engine

`src/lib/effectsRegistry.ts` exports two arrays — `celebratoryEffects` (correct) and `mischievousEffects` (wrong) — each entry has a `weight` and an async `run({ root })`. `src/lib/useEffectEngine.ts` picks one by weighted random and runs it on `#game-card` (or `#root` as fallback); a throwing effect is caught and logged, never propagated. **Setting `weight: 0` disables an effect** (currently `runawayBtn`, `buttonTeleport`, and `miniQuiz` are disabled this way because they break layout / annoy users — keep them at 0 unless explicitly asked to revive them).

### TTS

`src/lib/openai-tts.ts` exports `speakWord(text)`. It tries OpenAI (`gpt-4o-mini-tts`, voice `coral`) when `VITE_OPENAI_API_KEY` is present, and falls back to the browser `speechSynthesis` API. Setting `VITE_USE_BROWSER_TTS=true` forces the free browser path. The `PRONUNCIATION_FIXES` map at the top of the file is the place to patch words OpenAI mispronounces (e.g. `שרוכים` → `סרוכים`).

## Conventions

- The UI is Hebrew RTL. Comments, console messages, and many UI strings are in Hebrew — don't "translate" them to English.
- Tailwind colors, shadows, gradients (`bg-mesh-warm`, `bg-gradient-primary`), and keyframes (`animate-breathe`, `animate-pop-in`, …) are customized in `tailwind.config.js`. Use those tokens instead of raw hex values. `src/styles.css` adds the `.app-bg` / `.surface-glass` helpers and the effect-engine animation classes.
- Path aliases are not configured — imports use relative paths (`../../lib/...`).
