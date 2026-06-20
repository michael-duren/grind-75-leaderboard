/**
 * Create the schema (idempotent) and seed the 168 Grind 75 problems from the
 * plain-text `problems` file in the repo root.
 *
 * Usage:
 *   NETLIFY_DATABASE_URL=postgres://… node scripts/seed.mjs
 *   # or, with the Netlify CLI providing the env: netlify dev exec -- node scripts/seed.mjs
 *
 * Point value mirrors src/lib/scoring.ts: minutes × difficulty multiplier.
 */
import { readFile } from 'node:fs/promises';
import { neon } from '@netlify/neon';

const DIFFICULTY_MULTIPLIER = { Easy: 1, Medium: 2, Hard: 3 };

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The `problems` file repeats a 3-line record: a (per-week) index, the title,
 * then a "Difficulty·N mins" line. We key off the difficulty line and treat the
 * preceding line as the title, assigning a global order index as we go.
 */
function parseProblems(text) {
  const lines = text.split('\n');
  const re = /(Easy|Medium|Hard)·\s*(\d+)\s*mins?/i;
  const problems = [];
  let prev = '';
  let order = 0;

  for (const raw of lines) {
    const line = raw.trim();
    const match = line.match(re);
    if (match && prev) {
      const difficulty = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
      const minutes = parseInt(match[2], 10);
      order += 1;
      problems.push({
        title: prev,
        slug: slugify(prev),
        difficulty,
        minutes,
        points: minutes * DIFFICULTY_MULTIPLIER[difficulty],
        order,
      });
    }
    prev = line;
  }
  return problems;
}

async function main() {
  if (!process.env.NETLIFY_DATABASE_URL) {
    throw new Error('NETLIFY_DATABASE_URL is not set. Provision Netlify DB and export the URL.');
  }
  const sql = neon();
  const root = new URL('..', import.meta.url);

  const schema = await readFile(new URL('db/schema.sql', root), 'utf8');
  for (const statement of schema.split(';')) {
    const trimmed = statement.trim();
    if (trimmed) await sql.query(trimmed);
  }
  console.log('✓ schema applied');

  const text = await readFile(new URL('problems', root), 'utf8');
  const problems = parseProblems(text);
  if (problems.length === 0)
    throw new Error('No problems parsed — is the `problems` file present?');

  for (const p of problems) {
    await sql`
      INSERT INTO problems (slug, title, difficulty, minutes, points, order_index)
      VALUES (${p.slug}, ${p.title}, ${p.difficulty}, ${p.minutes}, ${p.points}, ${p.order})
      ON CONFLICT (slug) DO UPDATE
        SET title = EXCLUDED.title,
            difficulty = EXCLUDED.difficulty,
            minutes = EXCLUDED.minutes,
            points = EXCLUDED.points,
            order_index = EXCLUDED.order_index
    `;
  }

  const totalPoints = problems.reduce((s, p) => s + p.points, 0);
  console.log(`✓ seeded ${problems.length} problems (${totalPoints} points possible)`);
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
