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
netlify/database/migrations/   # SQL migrations Netlify auto-applies (schema + 168-problem seed)
src/lib/                        # db client, auth, validation, scoring/ranking, cached queries
src/middleware.ts               # resolves the session user onto Astro.locals
src/pages/                      # index (leaderboard), login, register, dashboard
src/pages/api/                  # register, login, logout, toggle (mark solved)
src/components/ProblemGrid.tsx  # React island for the dashboard
```

## Local development

This project uses **Netlify DB** (managed Postgres). There is no connection string to copy — the
`NETLIFY_DATABASE_URL` env var is injected automatically by `netlify dev` and in production, and the
migrations in `netlify/database/migrations/` are applied for you.

```sh
npm install
netlify dev      # starts a local Postgres, applies migrations, serves the app
```

Verify migration state any time with `netlify database status`. To open a SQL REPL against the DB,
use `netlify database connect`.

> Running plain `npm run dev` works for static/markup changes but anything that touches the database
> needs `netlify dev` so the connection is available.

## Commands

| Command           | Action                                          |
| :---------------- | :---------------------------------------------- |
| `netlify dev`     | Local DB + migrations + app at `localhost:8888` |
| `npm run build`   | Production build to `./dist/`                   |
| `npm run preview` | Preview the build locally                       |
| `npm run lint`    | ESLint + `astro check` (type-check)             |
| `npm run format`  | Prettier write (`format:check` to verify)       |
| `npm test`        | Vitest unit tests (`test:watch` for watch mode) |

## CI / CD

- **CI** (`.github/workflows/ci.yml`): format check, lint + type-check, unit tests, build on every PR.
- **CD**: Netlify builds and deploys from the repo (`netlify.toml`). The DB and `NETLIFY_DATABASE_URL`
  are managed by Netlify, and pending migrations in `netlify/database/migrations/` are applied
  automatically on each deploy — no manual seeding.

## Possible next steps

- Parse the linked submission to auto-verify the problem was actually accepted (currently the link
  is required and format-validated, but not fetched).
- Per-week / category grouping on the dashboard.
