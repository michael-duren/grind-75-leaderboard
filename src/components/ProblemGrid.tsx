import { useMemo, useState } from 'react';
import type { Difficulty } from '../lib/scoring';

export interface SubmissionEntry {
  url: string;
  createdAt: string;
}

export interface ProblemItem {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  minutes: number;
  points: number;
  solved: boolean;
  submissionUrl: string | null;
  needsReview: boolean;
  submissions: SubmissionEntry[];
}

interface Props {
  problems: ProblemItem[];
  totalPoints: number;
}

type Filter = 'all' | 'todo' | 'done' | 'review';

const DIFF_STYLE: Record<Difficulty, string> = {
  Easy: 'text-easy border-easy/40',
  Medium: 'text-medium border-medium/40',
  Hard: 'text-hard border-hard/40',
};

function formatDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return new Date(t).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ProblemGrid({ problems, totalPoints }: Props) {
  const [items, setItems] = useState<ProblemItem[]>(problems);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const solvedCount = useMemo(() => items.filter((p) => p.solved).length, [items]);
  const reviewCount = useMemo(
    () => items.filter((p) => p.solved && p.needsReview).length,
    [items]
  );
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
      if (filter === 'review' && !(p.solved && p.needsReview)) return false;
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
  function toggleExpanded(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
      const stamp = new Date().toISOString();
      setItems((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          if (!solved) {
            // Un-solve clears the proof, the history, and the review flag.
            return { ...p, solved: false, submissionUrl: null, needsReview: false, submissions: [] };
          }
          const url = submissionUrl ?? p.submissionUrl;
          const submissions = submissionUrl
            ? [{ url: submissionUrl, createdAt: stamp }, ...p.submissions]
            : p.submissions;
          return { ...p, solved: true, submissionUrl: url, submissions };
        })
      );
      setDrafts((d) => ({ ...d, [id]: '' }));
    } catch {
      setError(id, 'Network error.');
    } finally {
      setBusy(null);
    }
  }

  async function setReview(id: number, needsReview: boolean) {
    setBusy(id);
    clearError(id);
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId: id, needsReview }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(id, data.error ?? 'Something went wrong.');
        return;
      }
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, needsReview } : p)));
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

  function addSubmission(p: ProblemItem) {
    const url = (drafts[p.id] ?? '').trim();
    if (!url) {
      setError(p.id, 'Paste a submission link first.');
      return;
    }
    void send(p.id, true, url);
  }

  const tabs: Array<{ key: Filter; label: string }> = [
    { key: 'all', label: 'all' },
    { key: 'todo', label: 'todo' },
    { key: 'done', label: 'done' },
    { key: 'review', label: reviewCount ? `review (${reviewCount})` : 'review' },
  ];

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
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 ${
                filter === t.key ? 'bg-phosphor/15 text-phosphor' : 'text-muted hover:text-ink'
              }`}
            >
              {t.label}
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

      {filter === 'review' && visible.length === 0 && (
        <p className="rounded-lg border border-border bg-surface/40 p-4 text-center font-mono text-xs text-muted">
          Nothing flagged for review. Mark a solved problem ★ to revisit it later.
        </p>
      )}

      <ul className="space-y-2">
        {visible.map((p) => (
          <li
            key={p.id}
            className={`rounded-lg border bg-surface/40 p-3 ${
              p.needsReview
                ? 'border-gold/40'
                : p.solved
                  ? 'border-phosphor/30'
                  : 'border-border'
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
              {p.solved && (
                <button
                  onClick={() => void setReview(p.id, !p.needsReview)}
                  disabled={busy === p.id}
                  title={p.needsReview ? 'Clear review flag' : 'Flag to re-solve later'}
                  className={`shrink-0 cursor-pointer rounded border px-2 py-1 font-mono text-xs disabled:opacity-50 ${
                    p.needsReview
                      ? 'border-gold/50 bg-gold/10 text-gold'
                      : 'border-border text-muted hover:border-gold/50 hover:text-gold'
                  }`}
                >
                  {p.needsReview ? '★ reviewing' : '☆ review'}
                </button>
              )}
              {p.solved && (
                <button
                  onClick={() => void send(p.id, false)}
                  disabled={busy === p.id}
                  className="shrink-0 cursor-pointer rounded border border-border px-2 py-1 font-mono text-xs text-muted hover:border-hard/50 hover:text-hard disabled:opacity-50"
                >
                  undo
                </button>
              )}
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

            {p.solved && (
              <div className="mt-2 pl-12">
                <div className="flex flex-wrap items-center gap-3">
                  {p.submissionUrl && (
                    <a
                      href={p.submissionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-muted hover:text-phosphor"
                    >
                      ✓ latest proof
                    </a>
                  )}
                  <button
                    onClick={() => toggleExpanded(p.id)}
                    className="cursor-pointer font-mono text-xs text-muted hover:text-ink"
                  >
                    {expanded.has(p.id) ? '▾' : '▸'} submissions ({p.submissions.length})
                  </button>
                </div>

                {expanded.has(p.id) && (
                  <div className="mt-2 space-y-2">
                    {p.submissions.length > 0 && (
                      <ol className="space-y-1">
                        {p.submissions.map((s, i) => (
                          <li
                            key={`${s.createdAt}-${i}`}
                            className="flex items-center gap-2 font-mono text-xs"
                          >
                            <span className="shrink-0 text-muted tabular">
                              {formatDate(s.createdAt)}
                            </span>
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-muted hover:text-phosphor"
                            >
                              {s.url}
                            </a>
                          </li>
                        ))}
                      </ol>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={drafts[p.id] ?? ''}
                        onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                        placeholder="add another submission link…"
                        className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 font-mono text-xs text-ink outline-none focus:border-phosphor"
                      />
                      <button
                        onClick={() => addSubmission(p)}
                        disabled={busy === p.id}
                        className="shrink-0 cursor-pointer rounded border border-phosphor/50 bg-phosphor/10 px-3 py-1 font-mono text-xs font-semibold text-phosphor hover:bg-phosphor/20 disabled:opacity-50"
                      >
                        add
                      </button>
                    </div>
                  </div>
                )}
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
