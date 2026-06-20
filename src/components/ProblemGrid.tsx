import { useMemo, useState } from 'react';
import type { Difficulty } from '../lib/scoring';

export interface ProblemItem {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  minutes: number;
  points: number;
  solved: boolean;
  submissionUrl: string | null;
}

interface Props {
  problems: ProblemItem[];
  totalPoints: number;
}

type Filter = 'all' | 'todo' | 'done';

const DIFF_STYLE: Record<Difficulty, string> = {
  Easy: 'text-easy border-easy/40',
  Medium: 'text-medium border-medium/40',
  Hard: 'text-hard border-hard/40',
};

export default function ProblemGrid({ problems, totalPoints }: Props) {
  const [items, setItems] = useState<ProblemItem[]>(problems);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const solvedCount = useMemo(() => items.filter((p) => p.solved).length, [items]);
  const earned = useMemo(
    () => items.reduce((sum, p) => (p.solved ? sum + p.points : sum), 0),
    [items]
  );
  const pct = items.length ? Math.round((solvedCount / items.length) * 100) : 0;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      if (filter === 'todo' && p.solved) return false;
      if (filter === 'done' && !p.solved) return false;
      if (q && !p.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, filter, query]);

  function setError(id: number, msg: string) {
    setErrors((e) => ({ ...e, [id]: msg }));
  }
  function clearError(id: number) {
    setErrors((e) => {
      const next = { ...e };
      delete next[id];
      return next;
    });
  }

  async function send(id: number, solved: boolean, submissionUrl?: string) {
    setBusy(id);
    clearError(id);
    try {
      const res = await fetch('/api/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId: id, solved, submissionUrl }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(id, data.error ?? 'Something went wrong.');
        return;
      }
      setItems((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, solved, submissionUrl: solved ? (submissionUrl ?? p.submissionUrl) : null }
            : p
        )
      );
    } catch {
      setError(id, 'Network error.');
    } finally {
      setBusy(null);
    }
  }

  function markDone(p: ProblemItem) {
    const url = (drafts[p.id] ?? '').trim();
    if (!url) {
      setError(p.id, 'Paste your submission link first.');
      return;
    }
    void send(p.id, true, url);
  }

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-5 mb-6 border-b border-border bg-bg/90 px-5 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="font-mono">
            <span className="text-2xl font-bold text-gold tabular">{earned.toLocaleString()}</span>
            <span className="text-muted"> / {totalPoints.toLocaleString()} pts</span>
          </div>
          <div className="font-mono text-sm text-muted tabular">
            {solvedCount} / {items.length} solved · {pct}%
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-phosphor transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded border border-border font-mono text-xs">
          {(['all', 'todo', 'done'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 ${
                filter === f ? 'bg-phosphor/15 text-phosphor' : 'text-muted hover:text-ink'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search problems…"
          className="flex-1 rounded border border-border bg-surface px-3 py-1.5 font-mono text-sm text-ink outline-none focus:border-phosphor"
        />
      </div>

      <ul className="space-y-2">
        {visible.map((p) => (
          <li
            key={p.id}
            className={`rounded-lg border bg-surface/40 p-3 ${
              p.solved ? 'border-phosphor/30' : 'border-border'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`shrink-0 rounded border px-2 py-0.5 font-mono text-xs ${DIFF_STYLE[p.difficulty]}`}
                title={`${p.minutes} min · ${p.points} pts`}
              >
                {p.difficulty[0]}
              </span>
              <a
                href={`https://leetcode.com/problems/${p.slug}/`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 truncate font-medium ${p.solved ? 'text-muted line-through' : 'text-ink'}`}
              >
                {p.title}
              </a>
              <span className="shrink-0 font-mono text-xs text-gold tabular">+{p.points}</span>
              {p.solved ? (
                <button
                  onClick={() => void send(p.id, false)}
                  disabled={busy === p.id}
                  className="shrink-0 cursor-pointer rounded border border-border px-2 py-1 font-mono text-xs text-muted hover:border-hard/50 hover:text-hard disabled:opacity-50"
                >
                  undo
                </button>
              ) : null}
            </div>

            {!p.solved && (
              <div className="mt-2 flex flex-wrap items-center gap-2 pl-12">
                <input
                  value={drafts[p.id] ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                  placeholder="https://leetcode.com/problems/…/submissions/…"
                  className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 font-mono text-xs text-ink outline-none focus:border-phosphor"
                />
                <button
                  onClick={() => markDone(p)}
                  disabled={busy === p.id}
                  className="shrink-0 cursor-pointer rounded border border-phosphor/50 bg-phosphor/10 px-3 py-1 font-mono text-xs font-semibold text-phosphor hover:bg-phosphor/20 disabled:opacity-50"
                >
                  mark solved
                </button>
              </div>
            )}

            {p.solved && p.submissionUrl && (
              <div className="mt-1 pl-12">
                <a
                  href={p.submissionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-muted hover:text-phosphor"
                >
                  ✓ proof of submission
                </a>
              </div>
            )}

            {errors[p.id] && (
              <p className="mt-1 pl-12 font-mono text-xs text-hard">{errors[p.id]}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
