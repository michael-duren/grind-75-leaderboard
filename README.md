# Grind 75 Leaderboard

A two-page site where friends race through the [Grind 75](https://www.techinterviewhandbook.org/grind75) problem set
(168 problems). Sign up, link your LeetCode account, and mark problems solved by pasting a
submission link as proof. First to clear every problem wins; everyone after races for second.

## Scoring

`points = minutes × difficultyMultiplier`

| Difficulty | Multiplier |
| :--------- | :--------- |
| Easy       | ×1         |
| Medium     | ×2         |
| Hard       | ×3         |

168 problems = **9,275 points** possible. Each problem's value is precomputed at seed time
(`src/lib/scoring.ts` is the source of truth, mirrored by `scripts/seed.mjs`).

## Ranking

- Players who have solved **every** problem sort to the top, ordered by who finished first.
- Everyone else is ordered by points (desc), then problems solved, then username.

See `src/lib/scoring.ts` (`rankUsers`) — pure and unit-tested.

## Stack

- **Astro 6** (SSR, `output: 'server'`) + **React** islands for the interactive problem grid
- **Tailwind CSS v4** — dark, vintage-terminal theme
- **Netlify** hosting (CD) + **Netlify DB / Neon** Postgres
- Roll-your-own auth: scrypt password hashing + a `sessions` table with an HTTP-only cookie

## Project layout

```text
db/schema.sql            # Postgres schema (idempotent)
scripts/seed.mjs         # creates schema + seeds the 168 problems from ./problems
src/lib/                 # db client, auth, validation, scoring/ranking, cached queries
src/middleware.ts        # resolves the session user onto Astro.locals
src/pages/               # index (leaderboard), login, register, dashboard
src/pages/api/           # register, login, logout, toggle (mark solved)
src/components/ProblemGrid.tsx  # React island for the dashboard
```

## Local development

1. Provision a database (Netlify DB, or any Neon/Postgres instance).
2. `cp .env.example .env` and set `NETLIFY_DATABASE_URL`.
3. Install + seed + run:

```sh
npm install
npm run seed     # applies db/schema.sql and seeds the 168 problems
npm run dev      # http://localhost:4321
```

> Tip: with the Netlify CLI, `netlify dev` injects `NETLIFY_DATABASE_URL` automatically once the
> DB is linked, so you can skip the manual `.env`.

## Commands

| Command           | Action                                          |
| :---------------- | :---------------------------------------------- |
| `npm run dev`     | Local dev server at `localhost:4321`            |
| `npm run build`   | Production build to `./dist/`                   |
| `npm run preview` | Preview the build locally                       |
| `npm run seed`    | Apply schema + seed problems (needs the DB URL) |
| `npm run lint`    | ESLint + `astro check` (type-check)             |
| `npm run format`  | Prettier write (`format:check` to verify)       |
| `npm test`        | Vitest unit tests (`test:watch` for watch mode) |

## CI / CD

- **CI** (`.github/workflows/ci.yml`): format check, lint + type-check, unit tests, build on every PR.
- **CD**: Netlify builds and deploys from the repo (`netlify.toml`). Set `NETLIFY_DATABASE_URL` in
  the Netlify site environment, and run the seed once against the production DB.

## Possible next steps

- Parse the linked submission to auto-verify the problem was actually accepted (currently the link
  is required and format-validated, but not fetched).
- Per-week / category grouping on the dashboard.
